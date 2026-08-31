import { describe, it, expect } from "vitest";
import { createCaseId, createFactId } from "@/domain";
import {
  TEMPORAL_CONTRADICTION_REASONS,
  TemporalContradictionEvaluator,
  TemporalParser,
  TimelineEvent,
} from "@/intelligence";

describe("Temporal Intelligence: Contradictions & Epistemic Safeguards", () => {
  const caseId = createCaseId("CASE-TEST-001");

  it("1. EPISTEMIC SAFEGUARD: Absence of temporal information NEVER creates contradiction", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Fact with no date",
      epistemicStatus: "UNVERIFIED",
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Fact with date",
      temporalExpression: TemporalParser.parse("2026-08-31T10:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const contradictions = TemporalContradictionEvaluator.evaluateContradictions([ev1, ev2]);
    expect(contradictions).toHaveLength(0);
  });

  it("2. EPISTEMIC SAFEGUARD: Chronological gaps NEVER create contradiction", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Observation in Jan",
      temporalExpression: TemporalParser.parse("2026-01-01T10:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Observation in Dec (11 months gap)",
      temporalExpression: TemporalParser.parse("2026-12-01T10:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
    });

    const contradictions = TemporalContradictionEvaluator.evaluateContradictions([ev1, ev2]);
    expect(contradictions).toHaveLength(0);
  });

  it("3. EPISTEMIC SAFEGUARD: Different independent events at different times are NOT contradictions", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Seen in bakery",
      temporalExpression: TemporalParser.parse("2026-08-31T08:00:00Z") ?? undefined,
      epistemicStatus: "UNVERIFIED",
      metadata: { attribute: "observed.at", subjectId: "PER-001" },
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Seen in pharmacy",
      temporalExpression: TemporalParser.parse("2026-08-31T14:00:00Z") ?? undefined,
      epistemicStatus: "UNVERIFIED",
      metadata: { attribute: "observed.at", subjectId: "PER-001" },
    });

    const contradictions = TemporalContradictionEvaluator.evaluateContradictions([ev1, ev2]);
    expect(contradictions).toHaveLength(0);
  });

  it("4. HARD CONTRADICTION: Conflicting distinct values for the same singular exclusive attribute", () => {
    const ev1 = new TimelineEvent({
      eventId: "EV-1",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Missing date source A",
      temporalExpression: TemporalParser.parse("2026-08-10") ?? undefined,
      epistemicStatus: "CONFIRMED",
      sourceFactIds: [createFactId("FACT-1")],
      metadata: { attribute: "missing.at", subjectId: "PER-001" },
    });

    const ev2 = new TimelineEvent({
      eventId: "EV-2",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Missing date source B",
      temporalExpression: TemporalParser.parse("2026-08-25") ?? undefined,
      epistemicStatus: "CONFIRMED",
      sourceFactIds: [createFactId("FACT-2")],
      metadata: { attribute: "missing.at", subjectId: "PER-001" },
    });

    const contradictions = TemporalContradictionEvaluator.evaluateContradictions([ev1, ev2]);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].severity).toBe("HARD");
    expect(contradictions[0].reasonCode).toBe(TEMPORAL_CONTRADICTION_REASONS.EXACT_TIMESTAMP_CONFLICT);
    expect(contradictions[0].sourceFactIds).toHaveLength(2);
  });

  it("5. HARD CONTRADICTION: Impossible sequence where event.start is strictly AFTER event.end", () => {
    const evStart = new TimelineEvent({
      eventId: "EV-START",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Event start",
      temporalExpression: TemporalParser.parse("2026-08-31T18:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
      metadata: { attribute: "event.start", aggregateId: "AGG-TRIP-01" },
    });

    const evEnd = new TimelineEvent({
      eventId: "EV-END",
      caseId,
      eventType: "FACT_OBSERVATION",
      label: "Event end",
      temporalExpression: TemporalParser.parse("2026-08-31T12:00:00Z") ?? undefined,
      epistemicStatus: "CONFIRMED",
      metadata: { attribute: "event.end", aggregateId: "AGG-TRIP-01" },
    });

    const contradictions = TemporalContradictionEvaluator.evaluateContradictions([evStart, evEnd]);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].severity).toBe("HARD");
    expect(contradictions[0].reasonCode).toBe(TEMPORAL_CONTRADICTION_REASONS.IMPOSSIBLE_SEQUENCE);
  });
});