import { createPersonId, Fact, Person } from "@/domain";

export interface PersonRow {
  person_id: string;
  created_at: string;
}

export class PersonMapper {
  static toRow(person: Person): PersonRow {
    return {
      person_id: person.id,
      created_at: person.createdAt.toISOString(),
    };
  }

  static toDomain(row: PersonRow, facts: readonly Fact[] = []): Person {
    return new Person({
      id: createPersonId(row.person_id),
      facts,
      createdAt: new Date(row.created_at),
    });
  }
}