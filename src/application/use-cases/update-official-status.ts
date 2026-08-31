import { Case, CaseId, OfficialStatus, Provenance } from "@/domain";
import { CaseRepository } from "../ports/case-repository";
import { SourceRepository } from "../ports/source-repository";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface UpdateOfficialStatusInput {
  readonly caseId: CaseId;
  readonly newOfficialStatus: OfficialStatus;
  readonly provenance: Provenance;
}

export class UpdateOfficialStatus {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly sourceRepository: SourceRepository
  ) {}

  async execute(input: UpdateOfficialStatusInput): Promise<Case> {
    const existingCase = await this.caseRepository.findById(input.caseId);
    if (!existingCase) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    const sourceExists = await this.sourceRepository.exists(input.provenance.sourceId);
    if (!sourceExists) {
      throw new EntityNotFoundError("Source", input.provenance.sourceId);
    }

    const updatedCase = existingCase.updateOfficialStatus(input.newOfficialStatus, input.provenance);
    await this.caseRepository.save(updatedCase);
    return updatedCase;
  }
}