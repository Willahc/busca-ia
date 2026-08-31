import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  OFFICIAL_STATUS,
  Provenance,
  Source,
  SOURCE_TYPES,
  WORKFLOW_STATUS,
} from "@/domain";
import { EntityNotFoundError, UpdateOfficialStatus } from "@/application";
import { InMemoryCaseRepository, InMemorySourceRepository } from "./in-memory";

describe("UpdateOfficialStatus Use Case", () => {
  let caseRepo: InMemoryCaseRepository;
  let sourceRepo: InMemorySourceRepository;
  let useCase: UpdateOfficialStatus;

  const validCaseId = createCaseId("CASE-TEST-001");
  const validSourceId = createSourceId("SOURCE-POLICE-001");
  const provenance = new Provenance({
    sourceId: validSourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "POLICE_DEPT_DESK",
  });

  beforeEach(async () => {
    caseRepo = new InMemoryCaseRepository();
    sourceRepo = new InMemorySourceRepository();
    useCase = new UpdateOfficialStatus(caseRepo, sourceRepo);

    await caseRepo.save(
      new Case({
        id: validCaseId,
        personId: createPersonId("PERSON-001"),
        missingEventId: createMissingEventId("EVENT-001"),
        workflowStatus: WORKFLOW_STATUS.ACTIVE,
        officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
      })
    );

    await sourceRepo.save(
      new Source({
        id: validSourceId,
        type: SOURCE_TYPES.LAW_ENFORCEMENT,
        label: "Official Police Authority",
      })
    );
  });

  it("30 & 31. should alter only OfficialStatus and strictly preserve WorkflowStatus", async () => {
    const updatedCase = await useCase.execute({
      caseId: validCaseId,
      newOfficialStatus: OFFICIAL_STATUS.OFFICIALLY_MISSING,
      provenance,
    });

    expect(updatedCase.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
    expect(updatedCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE); // Preserved

    const saved = await caseRepo.findById(validCaseId);
    expect(saved?.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
    expect(saved?.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
  });

  it("should fail if Source referenced in provenance does not exist", async () => {
    const invalidProvenance = new Provenance({
      sourceId: createSourceId("SOURCE-UNKNOWN"),
      recordedAt: new Date(),
      recordedBy: "OPERATOR",
    });

    await expect(
      useCase.execute({
        caseId: validCaseId,
        newOfficialStatus: OFFICIAL_STATUS.OFFICIALLY_LOCATED,
        provenance: invalidProvenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});