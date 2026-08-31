import { CaseId } from "@/domain";
import { EntityNotFoundError } from "../errors/entity-not-found-error";
import {
  TemporalAnalysisResult,
  TemporalIntelligenceEngine,
} from "@/intelligence";
import { CaseRepository } from "../ports/case-repository";
import { MissingEventRepository } from "../ports/missing-event-repository";
import { FactRepository } from "../ports/fact-repository";
import { TipRepository } from "../ports/tip-repository";
import { EvidenceRepository } from "../ports/evidence-repository";
import { HypothesisRepository } from "../ports/hypothesis-repository";

export interface AnalyzeCaseTimelineInput {
  readonly caseId: CaseId;
}

export class AnalyzeCaseTimeline {
  constructor(
    private readonly caseRepo: CaseRepository,
    private readonly missingEventRepo: MissingEventRepository,
    private readonly factRepo: FactRepository,
    private readonly tipRepo: TipRepository,
    private readonly evidenceRepo: EvidenceRepository,
    private readonly hypothesisRepo: HypothesisRepository
  ) {}

  async execute(input: AnalyzeCaseTimelineInput): Promise<TemporalAnalysisResult> {
    const caseEntity = await this.caseRepo.findById(input.caseId);
    if (!caseEntity) {
      throw new EntityNotFoundError("Case", input.caseId);
    }

    const missingEvent = await this.missingEventRepo.findById(caseEntity.missingEventId);
    const facts = await this.factRepo.findBySubjectId(caseEntity.personId);
    const tips = await this.tipRepo.findByCaseId(caseEntity.id);
    const evidence = await this.evidenceRepo.findByCaseId(caseEntity.id);
    const hypotheses = await this.hypothesisRepo.findByCaseId(caseEntity.id);

    return TemporalIntelligenceEngine.analyze({
      caseEntity,
      missingEvent,
      facts,
      tips,
      evidence,
      hypotheses,
    });
  }
}