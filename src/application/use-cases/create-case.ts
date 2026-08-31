import {
  Case,
  CaseId,
  MissingEventId,
  OfficialStatus,
  PersonId,
  WorkflowStatus,
} from "@/domain";
import { CaseRepository } from "../ports/case-repository";
import { PersonRepository } from "../ports/person-repository";
import { MissingEventRepository } from "../ports/missing-event-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";
import { InvalidOperationError } from "../errors/invalid-operation-error";

export interface CreateCaseInput {
  readonly id: CaseId;
  readonly personId: PersonId;
  readonly missingEventId: MissingEventId;
  readonly workflowStatus?: WorkflowStatus;
  readonly officialStatus?: OfficialStatus;
  readonly createdAt?: Date;
}

export class CreateCase {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly personRepository: PersonRepository,
    private readonly missingEventRepository: MissingEventRepository
  ) {}

  async execute(input: CreateCaseInput): Promise<Case> {
    const caseExists = await this.caseRepository.exists(input.id);
    if (caseExists) {
      throw new ConflictError(`Case with identifier '${input.id}' already exists.`);
    }

    const person = await this.personRepository.findById(input.personId);
    if (!person) {
      throw new EntityNotFoundError("Person", input.personId);
    }

    const missingEvent = await this.missingEventRepository.findById(input.missingEventId);
    if (!missingEvent) {
      throw new EntityNotFoundError("MissingEvent", input.missingEventId);
    }

    if (missingEvent.personId !== input.personId) {
      throw new InvalidOperationError(
        `Referential mismatch: MissingEvent '${input.missingEventId}' is linked to Person '${missingEvent.personId}', but Case specifies Person '${input.personId}'.`
      );
    }

    const newCase = new Case({
      id: input.id,
      personId: input.personId,
      missingEventId: input.missingEventId,
      workflowStatus: input.workflowStatus,
      officialStatus: input.officialStatus,
      createdAt: input.createdAt,
    });

    await this.caseRepository.save(newCase);
    return newCase;
  }
}