import { describe, it, expect } from "vitest";
import { createCaseId } from "@/domain";
import {
  TemporalGapEvaluator,
  TemporalParser,
  TimelineEvent,
} from "@/intelligence";

describe("Temporal Intelligence: Gaps", () => {
  const caseId = createCaseId("CASE-TEST-001");

  it("1. should calculate exact minutes and days gap between exact timestamps", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Departure",
      temporalExpression: TemporalParser.parse("2026-08-31T10:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Arrival",
      temporalExpression: TemporalParser.parse("2026-08-31T14:30:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const gaps = TemporalGapEvaluator.evaluateGaps([ev1, ev2]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationMinutes).toBe(270); // 4.5 hours = 270 minutes
    expect(gaps[0].classification).toBe("KNOWN_GAP");
  });

  it("2. should not generate positive gap for overlapping or simultaneous events", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Event in August",
      temporalExpression: TemporalParser.parse("2026-08") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Event on August 15",
      temporalExpression: TemporalParser.parse("2026-08-15") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const gaps = TemporalGapEvaluator.evaluateGaps([ev1, ev2]);
    expect(gaps).toHaveLength(0);
  });
});