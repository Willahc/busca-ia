import { CaseId, Hypothesis, HypothesisId } from "@/domain";
import { HypothesisRepository } from "@/application/ports/hypothesis-repository";

export class InMemoryHypothesisRepository implements HypothesisRepository {
  private readonly items = new Map<string, Hypothesis>();

  async findById(id: HypothesisId): Promise<Hypothesis | null> {
    return this.items.get(id) ?? null;
  }

  async save(hypothesis: Hypothesis): Promise<void> {
    this.items.set(hypothesis.id, hypothesis);
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Hypothesis[]> {
    return Array.from(this.items.values()).filter((h) => h.caseId === caseId);
  }

  async exists(id: HypothesisId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}