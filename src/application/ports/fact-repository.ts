import { Fact, FactId } from "@/domain";

export interface FactRepository {
  findById(id: FactId): Promise<Fact | null>;
  save(fact: Fact): Promise<void>;
  findBySubjectId(subjectId: string): Promise<readonly Fact[]>;
  exists(id: FactId): Promise<boolean>;
}