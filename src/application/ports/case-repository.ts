import { Case, CaseId } from "@/domain";

export interface CaseRepository {
  findById(id: CaseId): Promise<Case | null>;
  findAll(): Promise<readonly Case[]>;
  save(c: Case): Promise<void>;
  exists(id: CaseId): Promise<boolean>;
}