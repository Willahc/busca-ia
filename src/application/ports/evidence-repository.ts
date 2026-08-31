import { CaseId, Evidence, EvidenceId } from "@/domain";

export interface EvidenceRepository {
  findById(id: EvidenceId): Promise<Evidence | null>;
  save(evidence: Evidence): Promise<void>;
  findByCaseId(caseId: CaseId): Promise<readonly Evidence[]>;
  exists(id: EvidenceId): Promise<boolean>;
}