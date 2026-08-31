import { describe, it, expect } from "vitest";
import {
  createFactId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  EPISTEMIC_STATUS,
  Fact,
  MissingEvent,
  Person,
  Provenance,
  DomainInvariantError,
} from "@/domain";

describe("Person and MissingEvent Domain Entities", () => {
  const dummyPersonId = createPersonId("PERSON-TEST-001");
  const dummyEventId = createMissingEventId("EVENT-TEST-001");
  const dummySourceId = createSourceId("SOURCE-TEST-001");
  const provenance = new Provenance({
    sourceId: dummySourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "OPERATOR-TEST-001",
  });

  it("14. should allow creating a Person with incomplete identity (tolerating missing CPF, documents, etc.)", () => {
    const person = new Person({
      id: dummyPersonId,
    });

    expect(person.id).toBe(dummyPersonId);
    expect(person.getAllFacts()).toHaveLength(0);
    expect(person.getFact("cpf")).toBeUndefined();
    expect(person.getFact("fullName")).toBeUndefined();
  });

  it("should add and retrieve facts on a Person correctly", () => {
    const person = new Person({ id: dummyPersonId });

    const fact1 = new Fact({
      id: createFactId("FACT-P-001"),
      subjectId: dummyPersonId,
      attribute: "approximateAge",
      value: "25-30",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });

    const updatedPerson = person.addFact(fact1);

    expect(updatedPerson.getFact("approximateAge")?.value).toBe("25-30");
    expect(person.getAllFacts()).toHaveLength(0); // Immutability: original person instance is untouched
  });

  it("should reject adding a fact with mismatched subjectId to a Person", () => {
    const person = new Person({ id: dummyPersonId });
    const mismatchedFact = new Fact({
      id: createFactId("FACT-P-MISMATCH"),
      subjectId: "DIFFERENT-PERSON-ID",
      attribute: "tattooDescription",
      value: "star on forearm",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });

    expect(() => {
      person.addFact(mismatchedFact);
    }).toThrow(DomainInvariantError);
  });

  it("13. should allow creating a MissingEvent with incomplete information", () => {
    const missingEvent = new MissingEvent({
      id: dummyEventId,
      personId: dummyPersonId,
    });

    expect(missingEvent.id).toBe(dummyEventId);
    expect(missingEvent.personId).toBe(dummyPersonId);
    expect(missingEvent.getAllFacts()).toHaveLength(0);
    expect(missingEvent.getFact("lastKnownLocation")).toBeUndefined();
  });

  it("should add and retrieve facts on a MissingEvent correctly", () => {
    const missingEvent = new MissingEvent({
      id: dummyEventId,
      personId: dummyPersonId,
    });

    const locationFact = new Fact({
      id: createFactId("FACT-EVT-001"),
      subjectId: dummyEventId,
      attribute: "lastKnownStation",
      value: "Terminal Test North",
      epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
      provenance,
    });

    const updatedEvent = missingEvent.addFact(locationFact);

    expect(updatedEvent.getFact("lastKnownStation")?.value).toBe("Terminal Test North");
    expect(updatedEvent.getFact("lastKnownStation")?.epistemicStatus).toBe(EPISTEMIC_STATUS.CONFIRMED);
  });
});