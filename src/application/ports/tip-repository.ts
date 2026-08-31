import { CaseId, Tip, TipId } from "@/domain";

export interface TipRepository {
  findById(id: TipId): Promise<Tip | null>;
  save(tip: Tip): Promise<void>;
  findByCaseId(caseId: CaseId): Promise<readonly Tip[]>;
  exists(id: TipId): Promise<boolean>;
}