import { describe, it, expect } from "vitest";
import {
  Case,
  createCaseId,
  createEvidenceId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  createTipId,
  Evidence,
  Hypothesis,
  MissingEvent,
  Provenance,
  Tip,
} from "@/domain";
import { TimelineBuilder } from "@/intelligence";

describe("Temporal Intelligence: Semantics & Provenance Distinction", () => {
  const caseId = createCaseId("CASE-SEM-001");
  const personId = createPersonId("PER-SEM-001");
  const missingEventId = createMissingEventId("ME-SEM-001");
  const sourceId = createSourceId("SRC-SEM-001");

  it("1. should NEVER treat Tip.receivedAt as the observed occurrence date of the reported fact", () => {
    const tip = new Tip({
      id: createTipId("TIP-001"),
      caseId,
      sourceId,
      originalText: "I saw the person on the street 3 weeks ago",
      receivedAt: new Date("2026-08-31T10:00:00Z"),
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T10:00:00Z"),
        recordedBy: "CALL_CENTER",
      }),
    });

    const caseEntity = new Case({ id: caseId, personId, missingEventId });
    const timeline = TimelineBuilder.build({ caseEntity, tips: [tip] });

    const tipEvent = timeline.events.find((e) => e.eventType === "TIP_RECEIVED");
    expect(tipEvent).toBeDefined();
    expect(tipEvent?.label).toBe("Tip received");
    expect(tipEvent?.metadata.timestampType).toBe("reception_time");
    // Assert event is categorized as TIP_RECEIVED, not FACT_OBSERVATION
    expect(tipEvent?.eventType).not.toBe("FACT_OBSERVATION");
  });

  it("2. should NEVER treat Evidence.recordedAt as the event occurrence date", () => {
    const evidence = new Evidence({
      id: createEvidenceId("EV-001"),
      caseId,
      sourceId,
      description: "Security footage archive",
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T14:00:00Z"),
        recordedBy: "POLICE_DEPT",
      }),
    });

    const caseEntity = new Case({ id: caseId, personId, missingEventId });
    const timeline = TimelineBuilder.build({ caseEntity, evidence: [evidence] });

    const evEvent = timeline.events.find((e) => e.eventType === "EVIDENCE_RECORDED");
    expect(evEvent).toBeDefined();
    expect(evEvent?.label).toBe("Evidence recorded");
    expect(evEvent?.metadata.timestampType).toBe("custody_recording_time");
  });
});