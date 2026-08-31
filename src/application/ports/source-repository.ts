import { Source, SourceId } from "@/domain";

export interface SourceRepository {
  findById(id: SourceId): Promise<Source | null>;
  save(source: Source): Promise<void>;
  exists(id: SourceId): Promise<boolean>;
}