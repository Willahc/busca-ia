import { describe, it, expect } from "vitest";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  OFFICIAL_STATUS,
  Provenance,
  WORKFLOW_STATUS,
} from "@/domain";

describe("Case Aggregate and Status Invariants", () => {
  const dummyCaseId = createCaseId("CASE-TEST-001");
  const dummyPersonId = createPersonId("PERSON-TEST-001");
  const dummyEventId = createMissingEventId("EVENT-TEST-001");
  const dummySourceId = createSourceId("SOURCE-OFFICIAL-001");

  const officialProvenance = new Provenance({
    sourceId: dummySourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "POLICE-DESK-001",
    note: "Official bulletin registration",
  });

  it("15. should strictly distinguish between internal workflowStatus and external officialStatus", () => {
    const c = new Case({
      id: dummyCaseId,
      personId: dummyPersonId,
      missingEventId: dummyEventId,
      workflowStatus: WORKFLOW_STATUS.ACTIVE,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });

    // Internal analysis is ACTIVE, but official external registry status remains UNVERIFIED/STATUS_TO_VERIFY
    expect(c.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(c.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);
    expect(c.officialStatus).not.toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
  });

  it("should update workflow status without mutating official status", () => {
    const c = new Case({
      id: dummyCaseId,
      personId: dummyPersonId,
      missingEventId: dummyEventId,
      workflowStatus: WORKFLOW_STATUS.DRAFT,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });

    const activeCase = c.updateWorkflowStatus(WORKFLOW_STATUS.ACTIVE);

    expect(activeCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(activeCase.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);
    expect(c.workflowStatus).toBe(WORKFLOW_STATUS.DRAFT); // Immutability
  });

  it("should update official status with proper verification provenance", () => {
    const c = new Case({
      id: dummyCaseId,
      personId: dummyPersonId,
      missingEventId: dummyEventId,
      workflowStatus: WORKFLOW_STATUS.ACTIVE,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });

    const updatedCase = c.updateOfficialStatus(OFFICIAL_STATUS.OFFICIALLY_MISSING, officialProvenance);

    expect(updatedCase.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
    expect(updatedCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
  });
});