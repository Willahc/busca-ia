import { Source, SourceId } from "@/domain";
import { SourceRepository } from "@/application/ports/source-repository";

export class InMemorySourceRepository implements SourceRepository {
  private readonly items = new Map<string, Source>();

  async findById(id: SourceId): Promise<Source | null> {
    return this.items.get(id) ?? null;
  }

  async save(source: Source): Promise<void> {
    this.items.set(source.id, source);
  }

  async exists(id: SourceId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}