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
});