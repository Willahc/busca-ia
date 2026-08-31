import { CaseId, Hypothesis, HypothesisId } from "@/domain";

export interface HypothesisRepository {
  findById(id: HypothesisId): Promise<Hypothesis | null>;
  save(hypothesis: Hypothesis): Promise<void>;
  findByCaseId(caseId: CaseId): Promise<readonly Hypothesis[]>;
  exists(id: HypothesisId): Promise<boolean>;
}