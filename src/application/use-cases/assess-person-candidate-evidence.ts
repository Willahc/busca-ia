import type { CaseId, Fact, FactId, PersonId } from "@/domain";
import {
  EvidenceAssessmentEngine,
  type InvestigativeAssessment,
  type TemporalAnalysisResult,
} from "@/intelligence";
import type { FactRepository } from "../ports/fact-repository";
import type { EvidenceRepository } from "../ports/evidence-repository";
import type { SourceRepository } from "../ports/source-repository";
import type { ComparePersonCandidates } from "./compare-person-candidates";

export interface AssessPersonCandidateEvidenceInput {
  readonly caseId: CaseId;
  readonly leftPersonId: PersonId;
  readonly rightPersonId: PersonId;
}

export type PairTemporalAnalysisProvider = (
  input: AssessPersonCandidateEvidenceInput
) => Promise<TemporalAnalysisResult | undefined>;

async function loadFactClosure(
  initialFacts: readonly Fact[],
  factRepo: FactRepository
): Promise<readonly Fact[]> {
  const facts = new Map<FactId, Fact>(initialFacts.map((fact) => [fact.id, fact]));
  const pending = initialFacts.flatMap((fact) => [...(fact.provenance.parentFactIds ?? [])]);
  while (pending.length > 0) {
    const factId = pending.pop();
    if (!factId || facts.has(factId)) continue;
    const parent = await factRepo.findById(factId);
    if (!parent) continue;
    facts.set(parent.id, parent);
    pending.push(...(parent.provenance.parentFactIds ?? []));
  }
  return Object.freeze([...facts.values()]);
}

/** Orchestrates Gate 8 comparison and evaluates it without persisting the assessment. */
export class AssessPersonCandidateEvidence {
  constructor(
    private readonly comparePersonCandidates: ComparePersonCandidates,
    private readonly factRepo: FactRepository,
    private readonly sourceRepo: SourceRepository,
    private readonly evidenceRepo: EvidenceRepository,
    private readonly temporalAnalysisProvider?: PairTemporalAnalysisProvider
  ) {}

  async execute(input: AssessPersonCandidateEvidenceInput): Promise<InvestigativeAssessment> {
    const entityResolutionResult = await this.comparePersonCandidates.execute(input);
    const [leftFacts, rightFacts, evidence, temporalAnalysisResult] = await Promise.all([
      this.factRepo.findBySubjectId(input.leftPersonId),
      this.factRepo.findBySubjectId(input.rightPersonId),
      this.evidenceRepo.findByCaseId(input.caseId),
      this.temporalAnalysisProvider?.(input),
    ]);
    const facts = await loadFactClosure([...leftFacts, ...rightFacts], this.factRepo);
    const evidenceMetadata = Object.freeze(
      evidence.map((item) =>
        Object.freeze({
          evidenceId: item.id,
          sourceId: item.sourceId,
          epistemicStatus: item.epistemicStatus,
        })
      )
    );
    const sourceIds = new Set([
      ...facts.map((fact) => fact.provenance.sourceId),
      ...evidenceMetadata.map((item) => item.sourceId),
    ]);
    const sources = (
      await Promise.all([...sourceIds].map((sourceId) => this.sourceRepo.findById(sourceId)))
    ).filter((source): source is NonNullable<typeof source> => source !== null);

    return EvidenceAssessmentEngine.assess({
      caseId: input.caseId,
      entityResolutionResult,
      facts,
      sources,
      evidenceMetadata,
      temporalAnalysisResult,
    });
  }
}
