import { MissingEvent, MissingEventId } from "@/domain";

export interface MissingEventRepository {
  findById(id: MissingEventId): Promise<MissingEvent | null>;
  save(event: MissingEvent): Promise<void>;
  exists(id: MissingEventId): Promise<boolean>;
}