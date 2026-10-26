import { describe, it, expect } from "vitest";
import {
  Case,
  createCaseId,
  createFactId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  EpistemicStatus,
  Fact,
  MissingEvent,
  Provenance,
} from "@/domain";
import { TemporalIntelligenceEngine } from "@/intelligence";

describe("Temporal Intelligence: Engine & Insufficient Data Handling", () => {
  const caseId = createCaseId("CASE-ENG-001");
  const personId = createPersonId("PER-ENG-001");
  const missingEventId = createMissingEventId("ME-ENG-001");
  const sourceId = createSourceId("SRC-ENG-001");

  it("1. should return INSUFFICIENT_TEMPORAL_DATA when case contains no temporal facts", () => {
    const caseEntity = new Case({ id: caseId, personId, missingEventId });
    const result = TemporalIntelligenceEngine.analyze({
      caseEntity,
      facts: [],
      tips: [],
      evidence: [],
      hypotheses: [],
    });

    expect(result.status).toBe("INSUFFICIENT_TEMPORAL_DATA");
    expect(result.relations).toHaveLength(0);
    expect(result.contradictions).toHaveLength(0);
  });

  it("2. should be pure and deterministic: same input produces identical output", () => {
    const caseEntity = new Case({ id: caseId, personId, missingEventId });
    const missingEvent = new MissingEvent({ id: missingEventId, personId, createdAt: new Date("2026-08-30T10:00:00Z") });
    const fact = new Fact({
      id: createFactId("FACT-1"),
      subjectId: personId,
      attribute: "last_seen.at",
      value: "2026-08-29T18:00:00Z",
      epistemicStatus: "CONFIRMED",
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-29T18:00:00Z"),
        recordedBy: "STAFF",
      }),
    });

    const res1 = TemporalIntelligenceEngine.analyze({
      caseEntity,
      missingEvent,
      facts: [fact],
    });

    const res2 = TemporalIntelligenceEngine.analyze({
      caseEntity,
      missingEvent,
      facts: [fact],
    });

    expect(res1.status).toBe("ANALYZED");
    expect(res1.events.length).toBe(res2.events.length);
    expect(res1.relations.length).toBe(res2.relations.length);
    expect(res1.relations[0]?.relation).toBe(res2.relations[0]?.relation);
    expect(res1.gaps.length).toBe(res2.gaps.length);
  });

  it("recognizes last_seen_date as a legacy alias for the last-seen timeline fact", () => {
    const caseEntity = new Case({ id: caseId, personId, missingEventId });
    const fact = new Fact({
      id: createFactId("FACT-LEGACY-LAST-SEEN"),
      subjectId: personId,
      attribute: "last_seen_date",
      value: "2026-08-29",
      epistemicStatus: "SYNTHETIC",
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-29T18:00:00Z"),
        recordedBy: "SYNTHETIC-TEST",
      }),
    });

    const result = TemporalIntelligenceEngine.analyze({
      caseEntity,
      facts: [fact],
    });

    expect(result.events.some((event) => event.label === "Temporal fact: last_seen.at")).toBe(true);
  });
});