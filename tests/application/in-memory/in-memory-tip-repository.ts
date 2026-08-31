import { CaseId, Tip, TipId } from "@/domain";
import { TipRepository } from "@/application/ports/tip-repository";

export class InMemoryTipRepository implements TipRepository {
  private readonly items = new Map<string, Tip>();

  async findById(id: TipId): Promise<Tip | null> {
    return this.items.get(id) ?? null;
  }

  async save(tip: Tip): Promise<void> {
    this.items.set(tip.id, tip);
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Tip[]> {
    return Array.from(this.items.values()).filter((t) => t.caseId === caseId);
  }

  async exists(id: TipId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}