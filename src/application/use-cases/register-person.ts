import { Fact, Person, PersonId } from "@/domain";
import { PersonRepository } from "../ports/person-repository";
import { ConflictError } from "../errors/conflict-error";

export interface RegisterPersonInput {
  readonly id: PersonId;
  readonly facts?: readonly Fact[];
  readonly createdAt?: Date;
}

export class RegisterPerson {
  constructor(private readonly personRepository: PersonRepository) {}

  async execute(input: RegisterPersonInput): Promise<Person> {
    const alreadyExists = await this.personRepository.exists(input.id);
    if (alreadyExists) {
      throw new ConflictError(`Person with identifier '${input.id}' already exists.`);
    }

    const person = new Person({
      id: input.id,
      facts: input.facts,
      createdAt: input.createdAt,
    });

    await this.personRepository.save(person);
    return person;
  }
}