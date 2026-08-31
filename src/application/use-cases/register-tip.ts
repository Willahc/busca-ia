import { CaseId, EpistemicStatus, Provenance, SourceId, Tip, TipId } from "@/domain";
import { TipRepository } from "../ports/tip-repository";
import { CaseRepository } from "../ports/case-repository";
import { SourceRepository } from "../ports/source-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface RegisterTipInput {
  readonly id: TipId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly originalText: string;
  readonly receivedAt: Date;
  readonly epistemicStatus?: EpistemicStatus;
  readonly provenance: Provenance;
}

export class RegisterTip {
  constructor(
    private readonly tipRepository: TipRepository,
    private readonly caseRepository: CaseRepository,
    private readonly sourceRepository: SourceRepository
  ) {}

  async execute(input: RegisterTipInput): Promise<Tip> {
    const tipExists = await this.tipRepository.exists(input.id);
    if (tipExists) {
      throw new ConflictError(`Tip with identifier '${input.id}' already exists.`);
    }

    const caseExists = await this.caseRepository.exists(input.caseId);
    if (!caseExists) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    const sourceExists = await this.sourceRepository.exists(input.sourceId);
    if (!sourceExists) {
      throw new EntityNotFoundError("Source", input.sourceId);
    }

    const tip = new Tip({
      id: input.id,
      caseId: input.caseId,
      sourceId: input.sourceId,
      originalText: input.originalText,
      receivedAt: input.receivedAt,
      epistemicStatus: input.epistemicStatus,
      provenance: input.provenance,
    });

    await this.tipRepository.save(tip);
    return tip;
  }
}