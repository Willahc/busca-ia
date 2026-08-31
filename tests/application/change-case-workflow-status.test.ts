import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  OFFICIAL_STATUS,
  WORKFLOW_STATUS,
} from "@/domain";
import { ChangeCaseWorkflowStatus, EntityNotFoundError } from "@/application";
import { InMemoryCaseRepository } from "./in-memory";

describe("ChangeCaseWorkflowStatus Use Case", () => {
  let caseRepo: InMemoryCaseRepository;
  let useCase: ChangeCaseWorkflowStatus;

  const validCaseId = createCaseId("CASE-TEST-001");

  beforeEach(async () => {
    caseRepo = new InMemoryCaseRepository();
    useCase = new ChangeCaseWorkflowStatus(caseRepo);

    await caseRepo.save(
      new Case({
        id: validCaseId,
        personId: createPersonId("PERSON-001"),
        missingEventId: createMissingEventId("EVENT-001"),
        workflowStatus: WORKFLOW_STATUS.DRAFT,
        officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
      })
    );
  });

  it("28 & 29. should alter only WorkflowStatus and strictly preserve OfficialStatus", async () => {
    const updatedCase = await useCase.execute({
      caseId: validCaseId,
      newWorkflowStatus: WORKFLOW_STATUS.ACTIVE,
    });

    expect(updatedCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(updatedCase.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY); // Preserved

    const saved = await caseRepo.findById(validCaseId);
    expect(saved?.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(saved?.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);
  });

  it("should throw EntityNotFoundError if Case does not exist", async () => {
    await expect(
      useCase.execute({
        caseId: createCaseId("CASE-NON-EXISTENT"),
        newWorkflowStatus: WORKFLOW_STATUS.ACTIVE,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});