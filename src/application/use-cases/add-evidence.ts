import { CaseId, EpistemicStatus, Evidence, EvidenceId, Provenance, SourceId } from "@/domain";
import { EvidenceRepository } from "../ports/evidence-repository";
import { CaseRepository } from "../ports/case-repository";
import { SourceRepository } from "../ports/source-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface AddEvidenceInput {
  readonly id: EvidenceId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly description: string;
  readonly epistemicStatus?: EpistemicStatus;
  readonly provenance: Provenance;
  readonly createdAt?: Date;
}

export class AddEvidence {
  constructor(
    private readonly evidenceRepository: EvidenceRepository,
    private readonly caseRepository: CaseRepository,
    private readonly sourceRepository: SourceRepository
  ) {}

  async execute(input: AddEvidenceInput): Promise<Evidence> {
    const evidenceExists = await this.evidenceRepository.exists(input.id);
    if (evidenceExists) {
      throw new ConflictError(`Evidence with identifier '${input.id}' already exists.`);
    }

    const caseExists = await this.caseRepository.exists(input.caseId);
    if (!caseExists) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    const sourceExists = await this.sourceRepository.exists(input.sourceId);
    if (!sourceExists) {
      throw new EntityNotFoundError("Source", input.sourceId);
    }

    const evidence = new Evidence({
      id: input.id,
      caseId: input.caseId,
      sourceId: input.sourceId,
      description: input.description,
      epistemicStatus: input.epistemicStatus,
      provenance: input.provenance,
      createdAt: input.createdAt,
    });

    await this.evidenceRepository.save(evidence);
    return evidence;
  }
}