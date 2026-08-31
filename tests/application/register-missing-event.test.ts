import { describe, it, expect, beforeEach } from "vitest";
import { createMissingEventId, createPersonId, Person } from "@/domain";
import {
  RegisterMissingEvent,
  ConflictError,
  EntityNotFoundError,
} from "@/application";
import {
  InMemoryMissingEventRepository,
  InMemoryPersonRepository,
} from "./in-memory";

describe("RegisterMissingEvent Use Case", () => {
  let eventRepo: InMemoryMissingEventRepository;
  let personRepo: InMemoryPersonRepository;
  let useCase: RegisterMissingEvent;

  beforeEach(() => {
    eventRepo = new InMemoryMissingEventRepository();
    personRepo = new InMemoryPersonRepository();
    useCase = new RegisterMissingEvent(eventRepo, personRepo);
  });

  it("5. should require an existing Person and fail with EntityNotFoundError if missing", async () => {
    const nonExistentPersonId = createPersonId("PERSON-NON-EXISTENT");
    const eventId = createMissingEventId("EVENT-TEST-001");

    await expect(
      useCase.execute({
        id: eventId,
        personId: nonExistentPersonId,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("6. should register a MissingEvent with incomplete information when Person exists", async () => {
    const personId = createPersonId("PERSON-TEST-001");
    await personRepo.save(new Person({ id: personId }));

    const eventId = createMissingEventId("EVENT-TEST-001");
    const event = await useCase.execute({
      id: eventId,
      personId,
    });

    expect(event.id).toBe(eventId);
    expect(event.personId).toBe(personId);
    expect(event.getAllFacts()).toHaveLength(0);

    const saved = await eventRepo.findById(eventId);
    expect(saved).not.toBeNull();
  });
});