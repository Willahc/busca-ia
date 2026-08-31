import { describe, it, expect } from "vitest";
import { createCaseId, createFactId, EpistemicStatus } from "@/domain";
import {
  TemporalDerivationEngine,
  TemporalParser,
  TimelineEvent,
} from "@/intelligence";

describe("Temporal Intelligence: Derivations", () => {
  const caseId = createCaseId("CASE-TEST-001");

  it("1. should derive composite interval and enforce precision capping to coarsest input", () => {
    // Start is MONTH precision ("2026-06")
    const evStart = new TimelineEvent({
      eventId: "EV-START",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Trip start in June",
      temporalExpression: TemporalParser.parse("2026-06") ?? undefined,
      epistemicStatus: "CONFIRMED",
      sourceFactIds: [createFactId("FACT-START-01")],
      metadata: { attribute: "event.start", aggregateId: "TRIP-01" },
    });

    // End is EXACT precision ("2026-08-31T15:00:00Z")
    const evEnd = new TimelineEvent({
      eventId: "EV-END",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Trip end exact",
      temporalExpression: TemporalParser.parse("2026-08-31T15:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
      sourceFactIds: [createFactId("FACT-END-01")],
      metadata: { attribute: "event.end", aggregateId: "TRIP-01" },
    });

    const derivations = TemporalDerivationEngine.derive([evStart, evEnd]);
    expect(derivations).toHaveLength(1);

    const d = derivations[0];
    expect(d.derivedAttribute).toBe("event.duration_interval");
    expect(d.epistemicStatus).toBe("DERIVED");
    // Precision MUST be capped to MONTH (the coarsest of MONTH and EXACT)
    expect(d.precision).toBe("MONTH");
    expect(d.sourceFactIds).toHaveLength(2);
    expect(d.sourceEventIds).toEqual(["EV-START", "EV-END"]);
  });

  it.each([
    ["2026-08-31T12:00:00Z", "2026-08-31T14:00:00Z", "EXACT"],
    ["2026-08-30", "2026-08-31", "DAY"],
  ] as const)(
    "derives an interval without exceeding source precision (%s to %s)",
    (start, end, expectedPrecision) => {
      const aggregateId = `AGG-${expectedPrecision}`;
      const evStart = new TimelineEvent({
        eventId: `EV-${expectedPrecision}-START`,
        caseId,
        eventType: "FACT_OBSERVATION",
        label: "Start",
        temporalExpression: TemporalParser.parse(start) ?? undefined,
        epistemicStatus: "DERIVED",
        sourceFactIds: [createFactId(`FACT-${expectedPrecision}-START`)],
        metadata: { attribute: "event.start", aggregateId },
      });
      const evEnd = new TimelineEvent({
        eventId: `EV-${expectedPrecision}-END`,
        caseId,
        eventType: "FACT_OBSERVATION",
        label: "End",
        temporalExpression: TemporalParser.parse(end) ?? undefined,
        epistemicStatus: "DERIVED",
        sourceFactIds: [createFactId(`FACT-${expectedPrecision}-END`)],
        metadata: { attribute: "event.end", aggregateId },
      });

      const [derivation] = TemporalDerivationEngine.derive([evStart, evEnd]);
      expect(derivation.precision).toBe(expectedPrecision);
      expect(derivation.epistemicStatus).toBe("DERIVED");
      expect(derivation.sourceEventIds).toEqual([evStart.eventId, evEnd.eventId]);
      expect(derivation.sourceFactIds).toEqual([
        ...evStart.sourceFactIds,
        ...evEnd.sourceFactIds,
      ]);
    }
  );
});
