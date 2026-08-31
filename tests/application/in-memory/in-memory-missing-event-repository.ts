import { MissingEvent, MissingEventId } from "@/domain";
import { MissingEventRepository } from "@/application/ports/missing-event-repository";

export class InMemoryMissingEventRepository implements MissingEventRepository {
  private readonly items = new Map<string, MissingEvent>();

  async findById(id: MissingEventId): Promise<MissingEvent | null> {
    return this.items.get(id) ?? null;
  }

  async save(event: MissingEvent): Promise<void> {
    this.items.set(event.id, event);
  }

  async exists(id: MissingEventId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}