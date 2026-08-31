import { Person, PersonId } from "@/domain";

export interface PersonRepository {
  findById(id: PersonId): Promise<Person | null>;
  save(person: Person): Promise<void>;
  exists(id: PersonId): Promise<boolean>;
}