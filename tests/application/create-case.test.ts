import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  MissingEvent,
  OFFICIAL_STATUS,
  Person,
  WORKFLOW_STATUS,
} from "@/domain";
import {
  CreateCase,
  ConflictError,
  EntityNotFoundError,
  InvalidOperationError,
} from "@/application";
import {
  InMemoryCaseRepository,
  InMemoryMissingEventRepository,
  InMemoryPersonRepository,
} from "./in-memory";

describe("CreateCase Use Case", () => {
  let caseRepo: InMemoryCaseRepository;
  let personRepo: InMemoryPersonRepository;
  let eventRepo: InMemoryMissingEventRepository;
  let useCase: CreateCase;

  const personId1 = createPersonId("PERSON-TEST-001");
  const personId2 = createPersonId("PERSON-TEST-002");
  const eventId1 = createMissingEventId("EVENT-TEST-001");
  const caseId1 = createCaseId("CASE-TEST-001");

  beforeEach(async () => {
    caseRepo = new InMemoryCaseRepository();
    personRepo = new InMemoryPersonRepository();
    eventRepo = new InMemoryMissingEventRepository();
    useCase = new CreateCase(caseRepo, personRepo, eventRepo);

    await personRepo.save(new Person({ id: personId1 }));
    await personRepo.save(new Person({ id: personId2 }));
    await eventRepo.save(new MissingEvent({ id: eventId1, personId: personId1 }));
  });

  it("7. should require an existing Person", async () => {
    const nonExistentPersonId = createPersonId("PERSON-UNKNOWN");
    await expect(
      useCase.execute({
        id: caseId1,
        personId: nonExistentPersonId,
        missingEventId: eventId1,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("8. should require an existing MissingEvent", async () => {
    const nonExistentEventId = createMissingEventId("EVENT-UNKNOWN");
    await expect(
      useCase.execute({
        id: caseId1,
        personId: personId1,
        missingEventId: nonExistentEventId,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("9. should reject MissingEvent linked to a different Person with InvalidOperationError", async () => {
    // MissingEvent eventId1 is linked to personId1, but we pass personId2
    await expect(
      useCase.execute({
        id: caseId1,
        personId: personId2,
        missingEventId: eventId1,
      })
    ).rejects.toBeInstanceOf(InvalidOperationError);
  });

  it("10. should reject duplicate caseId with ConflictError", async () => {
    await useCase.execute({
      id: caseId1,
      personId: personId1,
      missingEventId: eventId1,
    });

    await expect(
      useCase.execute({
        id: caseId1,
        personId: personId1,
        missingEventId: eventId1,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should successfully create and persist a Case when references match", async () => {
    const createdCase = await useCase.execute({
      id: caseId1,
      personId: personId1,
      missingEventId: eventId1,
      workflowStatus: WORKFLOW_STATUS.ACTIVE,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });

    expect(createdCase.id).toBe(caseId1);
    expect(createdCase.personId).toBe(personId1);
    expect(createdCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(createdCase.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);

    const saved = await caseRepo.findById(caseId1);
    expect(saved).not.toBeNull();
  });
});