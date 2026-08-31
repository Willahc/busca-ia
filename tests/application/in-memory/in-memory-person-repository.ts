import { Person, PersonId } from "@/domain";
import { PersonRepository } from "@/application/ports/person-repository";

export class InMemoryPersonRepository implements PersonRepository {
  private readonly items = new Map<string, Person>();

  async findById(id: PersonId): Promise<Person | null> {
    return this.items.get(id) ?? null;
  }

  async save(person: Person): Promise<void> {
    this.items.set(person.id, person);
  }

  async exists(id: PersonId): Promise<boolean> {
    return this.items.has(id);
  }

  clear(): void {
    this.items.clear();
  }
}