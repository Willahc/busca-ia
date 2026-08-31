import { Case, CaseId } from "@/domain";
import { CaseRepository } from "@/application/ports/case-repository";

export class InMemoryCaseRepository implements CaseRepository {
  private readonly items = new Map<string, Case>();

  async findById(id: CaseId): Promise<Case | null> {
    return this.items.get(id) ?? null;
  }

  async save(c: Case): Promise<void> {
    this.items.set(c.id, c);
  }

  async exists(id: CaseId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}