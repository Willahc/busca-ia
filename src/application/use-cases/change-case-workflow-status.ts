import { Case, CaseId, WorkflowStatus } from "@/domain";
import { CaseRepository } from "../ports/case-repository";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface ChangeCaseWorkflowStatusInput {
  readonly caseId: CaseId;
  readonly newWorkflowStatus: WorkflowStatus;
}

export class ChangeCaseWorkflowStatus {
  constructor(private readonly caseRepository: CaseRepository) {}

  async execute(input: ChangeCaseWorkflowStatusInput): Promise<Case> {
    const existingCase = await this.caseRepository.findById(input.caseId);
    if (!existingCase) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    const updatedCase = existingCase.updateWorkflowStatus(input.newWorkflowStatus);
    await this.caseRepository.save(updatedCase);
    return updatedCase;
  }
}