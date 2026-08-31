import { CaseId, Evidence, EvidenceId } from "@/domain";
import { EvidenceRepository } from "@/application/ports/evidence-repository";

export class InMemoryEvidenceRepository implements EvidenceRepository {
  private readonly items = new Map<string, Evidence>();

  async findById(id: EvidenceId): Promise<Evidence | null> {
    return this.items.get(id) ?? null;
  }

  async save(evidence: Evidence): Promise<void> {
    this.items.set(evidence.id, evidence);
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Evidence[]> {
    return Array.from(this.items.values()).filter((e) => e.caseId === caseId);
  }

  async exists(id: EvidenceId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}