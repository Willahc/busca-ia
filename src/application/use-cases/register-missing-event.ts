import { Fact, MissingEvent, MissingEventId, PersonId } from "@/domain";
import { PersonRepository } from "../ports/person-repository";
import { MissingEventRepository } from "../ports/missing-event-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface RegisterMissingEventInput {
  readonly id: MissingEventId;
  readonly personId: PersonId;
  readonly facts?: readonly Fact[];
  readonly createdAt?: Date;
}

export class RegisterMissingEvent {
  constructor(
    private readonly missingEventRepository: MissingEventRepository,
    private readonly personRepository: PersonRepository
  ) {}

  async execute(input: RegisterMissingEventInput): Promise<MissingEvent> {
    const personExists = await this.personRepository.exists(input.personId);
    if (!personExists) {
      throw new EntityNotFoundError("Person", input.personId);
    }

    const alreadyExists = await this.missingEventRepository.exists(input.id);
    if (alreadyExists) {
      throw new ConflictError(`MissingEvent with identifier '${input.id}' already exists.`);
    }

    const event = new MissingEvent({
      id: input.id,
      personId: input.personId,
      facts: input.facts,
      createdAt: input.createdAt,
    });

    await this.missingEventRepository.save(event);
    return event;
  }
}