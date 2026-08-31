import { CaseId, createPersonId, EPISTEMIC_STATUS, PersonId } from "@/domain";
import {
  buildEntityResolutionCandidate,
  ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
  EntityResolutionEngine,
  EntityResolutionResult,
} from "@/intelligence";
import { EntityNotFoundError } from "../errors/entity-not-found-error";
import { InvalidOperationError } from "../errors/invalid-operation-error";
import { CaseRepository } from "../ports/case-repository";
import { FactRepository } from "../ports/fact-repository";
import { PersonRepository } from "../ports/person-repository";

export interface ComparePersonCandidatesInput {
  readonly caseId: CaseId;
  readonly leftPersonId: PersonId;
  readonly rightPersonId: PersonId;
}

export interface ComparePersonCandidatesResult extends EntityResolutionResult {
  readonly caseId: CaseId;
}

export class ComparePersonCandidates {
  constructor(
    private readonly caseRepo: CaseRepository,
    private readonly personRepo: PersonRepository,
    private readonly factRepo: FactRepository
  ) {}

  async execute(input: ComparePersonCandidatesInput): Promise<ComparePersonCandidatesResult> {
    const caseEntity = await this.caseRepo.findById(input.caseId);
    if (!caseEntity) {
      throw new EntityNotFoundError("Case", input.caseId);
    }
    if (input.leftPersonId === input.rightPersonId) {
      throw new InvalidOperationError("Entity Resolution requires two distinct Person identifiers.");
    }

    const caseFacts = await this.factRepo.findBySubjectId(caseEntity.id);
    const explicitlyLinkedPersonIds = caseFacts
      .filter(
        (fact) =>
          fact.attribute === ENTITY_RESOLUTION_CASE_CANDIDATE_FACT &&
          typeof fact.value === "string" &&
          (fact.epistemicStatus === EPISTEMIC_STATUS.CONFIRMED ||
            fact.epistemicStatus === EPISTEMIC_STATUS.SYNTHETIC)
      )
      .map((fact) => createPersonId((fact.value as string).trim()));
    const allowedPersonIds = new Set<PersonId>([caseEntity.personId, ...explicitlyLinkedPersonIds]);

    if (
      !allowedPersonIds.has(input.leftPersonId) ||
      !allowedPersonIds.has(input.rightPersonId)
    ) {
      throw new InvalidOperationError(
        "Both Persons must be explicitly bound to the requested Case context."
      );
    }

    const [leftPerson, rightPerson] = await Promise.all([
      this.personRepo.findById(input.leftPersonId),
      this.personRepo.findById(input.rightPersonId),
    ]);
    if (!leftPerson) {
      throw new EntityNotFoundError("Person", input.leftPersonId);
    }
    if (!rightPerson) {
      throw new EntityNotFoundError("Person", input.rightPersonId);
    }

    const [leftFacts, rightFacts] = await Promise.all([
      this.factRepo.findBySubjectId(input.leftPersonId),
      this.factRepo.findBySubjectId(input.rightPersonId),
    ]);
    const analyticalResult = EntityResolutionEngine.compare(
      buildEntityResolutionCandidate(leftPerson, leftFacts),
      buildEntityResolutionCandidate(rightPerson, rightFacts)
    );

    return Object.freeze({ caseId: caseEntity.id, ...analyticalResult });
  }
}
