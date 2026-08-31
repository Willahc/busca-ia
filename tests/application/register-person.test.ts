import { describe, it, expect, beforeEach } from "vitest";
import { createPersonId } from "@/domain";
import { RegisterPerson, ConflictError } from "@/application";
import { InMemoryPersonRepository } from "./in-memory";

describe("RegisterPerson Use Case", () => {
  let personRepo: InMemoryPersonRepository;
  let useCase: RegisterPerson;

  beforeEach(() => {
    personRepo = new InMemoryPersonRepository();
    useCase = new RegisterPerson(personRepo);
  });

  it("3. should register a Person with incomplete identity (no required documents or full profile)", async () => {
    const personId = createPersonId("PERSON-TEST-001");
    const person = await useCase.execute({
      id: personId,
    });

    expect(person.id).toBe(personId);
    expect(person.getAllFacts()).toHaveLength(0);

    const saved = await personRepo.findById(personId);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(personId);
  });

  it("4. should reject duplicate personId registration with ConflictError", async () => {
    const personId = createPersonId("PERSON-TEST-001");
    await useCase.execute({ id: personId });

    await expect(
      useCase.execute({ id: personId })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});