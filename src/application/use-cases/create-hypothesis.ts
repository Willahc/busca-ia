import { CaseId, EvidenceId, Hypothesis, HypothesisId, HypothesisStatus } from "@/domain";
import { HypothesisRepository } from "../ports/hypothesis-repository";
import { CaseRepository } from "../ports/case-repository";
import { EvidenceRepository } from "../ports/evidence-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface CreateHypothesisInput {
  readonly id: HypothesisId;
  readonly caseId: CaseId;
  readonly statement: string;
  readonly status?: HypothesisStatus;
  readonly supportingEvidenceIds?: readonly EvidenceId[];
  readonly contradictingEvidenceIds?: readonly EvidenceId[];
  readonly createdAt?: Date;
}

export class CreateHypothesis {
  constructor(
    private readonly hypothesisRepository: HypothesisRepository,
    private readonly caseRepository: CaseRepository,
    private readonly evidenceRepository: EvidenceRepository
  ) {}

  async execute(input: CreateHypothesisInput): Promise<Hypothesis> {
    const hypothesisExists = await this.hypothesisRepository.exists(input.id);
    if (hypothesisExists) {
      throw new ConflictError(`Hypothesis with identifier '${input.id}' already exists.`);
    }

    const caseExists = await this.caseRepository.exists(input.caseId);
    if (!caseExists) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    // Validate existence of all referenced supporting evidence
    if (input.supportingEvidenceIds && input.supportingEvidenceIds.length > 0) {
      for (const evId of input.supportingEvidenceIds) {
        const evExists = await this.evidenceRepository.exists(evId);
        if (!evExists) {
          throw new EntityNotFoundError("Evidence", evId);
        }
      }
    }

    // Validate existence of all referenced contradicting evidence
    if (input.contradictingEvidenceIds && input.contradictingEvidenceIds.length > 0) {
      for (const evId of input.contradictingEvidenceIds) {
        const evExists = await this.evidenceRepository.exists(evId);
        if (!evExists) {
          throw new EntityNotFoundError("Evidence", evId);
        }
      }
    }

    const hypothesis = new Hypothesis({
      id: input.id,
      caseId: input.caseId,
      statement: input.statement,
      status: input.status,
      supportingEvidenceIds: input.supportingEvidenceIds,
      contradictingEvidenceIds: input.contradictingEvidenceIds,
      createdAt: input.createdAt,
    });

    await this.hypothesisRepository.save(hypothesis);
    return hypothesis;
  }
}