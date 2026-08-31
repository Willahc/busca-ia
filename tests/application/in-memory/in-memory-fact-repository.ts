import { Fact, FactId } from "@/domain";
import { FactRepository } from "@/application/ports/fact-repository";

export class InMemoryFactRepository implements FactRepository {
  private readonly items = new Map<string, Fact>();

  async findById(id: FactId): Promise<Fact | null> {
    return this.items.get(id) ?? null;
  }

  async save(fact: Fact): Promise<void> {
    this.items.set(fact.id, fact);
  }

  async findBySubjectId(subjectId: string): Promise<readonly Fact[]> {
    return Array.from(this.items.values()).filter((f) => f.subjectId === subjectId);
  }

  async exists(id: FactId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}