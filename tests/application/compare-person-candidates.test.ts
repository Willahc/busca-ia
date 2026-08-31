import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Case,
  createCaseId,
  createFactId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  Fact,
  MissingEvent,
  Person,
  Provenance,
  Source,
} from "@/domain";
import {
  ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
  ENTITY_RESOLUTION_CONCLUSIONS,
} from "@/intelligence";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

describe("Application Use Case: ComparePersonCandidates", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => resetApplicationContainer());

  async function setupPair() {
    const container = globalThis.__buscaIaAppContainer!;
    const sourceId = createSourceId("SOURCE-ER-APPLICATION");
    const leftPersonId = createPersonId("PERSON-ER-LEFT");
    const rightPersonId = createPersonId("PERSON-ER-RIGHT");
    const missingEventId = createMissingEventId("EVENT-ER-APPLICATION");
    const caseId = createCaseId("CASE-ER-TEST-001");
    const provenance = () =>
      new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T12:00:00Z"),
        recordedBy: "SYNTHETIC-TEST-ACTOR",
      });

    await container.repositories.sourceRepository.save(
      new Source({ id: sourceId, type: "SYNTHETIC_TEST", label: "Synthetic fixture" })
    );
    await container.repositories.personRepository.save(new Person({ id: leftPersonId }));
    await container.repositories.personRepository.save(new Person({ id: rightPersonId }));
    await container.repositories.missingEventRepository.save(
      new MissingEvent({ id: missingEventId, personId: leftPersonId })
    );
    await container.repositories.caseRepository.save(
      new Case({ id: caseId, personId: leftPersonId, missingEventId })
    );
    await container.repositories.factRepository.save(
      new Fact({
        id: createFactId("FACT-ER-CASE-LINK"),
        subjectId: caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: rightPersonId,
        epistemicStatus: "SYNTHETIC",
        provenance: provenance(),
      })
    );

    return { container, sourceId, leftPersonId, rightPersonId, caseId, provenance };
  }

  async function addAttributeFacts(
    setup: Awaited<ReturnType<typeof setupPair>>,
    rightBirthDate = "1992-12-15"
  ) {
    const definitions = [
      ["FULL-NAME", "person.full_name", "Pessoa Teste Alfa", "PESSOA TESTE ALFA"],
      ["BIRTH-DATE", "person.birth_date", "1992-12-15", rightBirthDate],
      ["MOTHER-NAME", "person.mother_name", "Parente Teste Um", "PARENTE TESTE UM"],
      ["SEX", "person.sex", "FEMALE", "FEMALE"],
    ] as const;
    for (const [suffix, attribute, leftValue, rightValue] of definitions) {
      await setup.container.repositories.factRepository.save(
        new Fact({
          id: createFactId(`FACT-LEFT-${suffix}`),
          subjectId: setup.leftPersonId,
          attribute,
          value: leftValue,
          epistemicStatus: "CONFIRMED",
          provenance: setup.provenance(),
        })
      );
      await setup.container.repositories.factRepository.save(
        new Fact({
          id: createFactId(`FACT-RIGHT-${suffix}`),
          subjectId: setup.rightPersonId,
          attribute,
          value: rightValue,
          epistemicStatus: "CONFIRMED",
          provenance: setup.provenance(),
        })
      );
    }
  }

  it("compares a case-bound synthetic pair without mutating canonical state", async () => {
    const setup = await setupPair();
    await addAttributeFacts(setup);
    const beforeLeft = await setup.container.repositories.personRepository.findById(
      setup.leftPersonId
    );
    const beforeRightFacts = await setup.container.repositories.factRepository.findBySubjectId(
      setup.rightPersonId
    );

    const result = await setup.container.useCases.comparePersonCandidates.execute({
      caseId: setup.caseId,
      leftPersonId: setup.leftPersonId,
      rightPersonId: setup.rightPersonId,
    });

    expect(result.caseId).toBe(setup.caseId);
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.COMPATIBLE);
    expect(result.highDiscriminationMatches.length).toBeGreaterThanOrEqual(2);
    expect(result.hardContradictions).toHaveLength(0);
    expect(await setup.container.repositories.personRepository.findById(setup.leftPersonId)).toEqual(
      beforeLeft
    );
    expect(
      await setup.container.repositories.factRepository.findBySubjectId(setup.rightPersonId)
    ).toEqual(beforeRightFacts);
  });

  it("returns INCOMPATIBLE for confirmed exact birth-date conflict", async () => {
    const setup = await setupPair();
    await addAttributeFacts(setup, "1993-12-15");
    const result = await setup.container.useCases.comparePersonCandidates.execute({
      caseId: setup.caseId,
      leftPersonId: setup.leftPersonId,
      rightPersonId: setup.rightPersonId,
    });
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.INCOMPATIBLE);
    expect(result.hardContradictions).toHaveLength(1);
  });

  it("returns INSUFFICIENT_DATA when only sex matches", async () => {
    const setup = await setupPair();
    for (const [id, personId] of [
      ["FACT-LEFT-ONLY-SEX", setup.leftPersonId],
      ["FACT-RIGHT-ONLY-SEX", setup.rightPersonId],
    ] as const) {
      await setup.container.repositories.factRepository.save(
        new Fact({
          id: createFactId(id),
          subjectId: personId,
          attribute: "person.sex",
          value: "FEMALE",
          epistemicStatus: "SYNTHETIC",
          provenance: setup.provenance(),
        })
      );
    }
    const result = await setup.container.useCases.comparePersonCandidates.execute({
      caseId: setup.caseId,
      leftPersonId: setup.leftPersonId,
      rightPersonId: setup.rightPersonId,
    });
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.INSUFFICIENT_DATA);
  });

  it("rejects a Person not explicitly bound to the Case", async () => {
    const setup = await setupPair();
    const unrelated = createPersonId("PERSON-UNRELATED");
    await setup.container.repositories.personRepository.save(new Person({ id: unrelated }));
    await expect(
      setup.container.useCases.comparePersonCandidates.execute({
        caseId: setup.caseId,
        leftPersonId: setup.leftPersonId,
        rightPersonId: unrelated,
      })
    ).rejects.toThrow("explicitly bound");
  });

  it("returns not found for a linked Person record that does not exist", async () => {
    const setup = await setupPair();
    const missingId = createPersonId("PERSON-LINKED-MISSING");
    await setup.container.repositories.factRepository.save(
      new Fact({
        id: createFactId("FACT-ER-MISSING-LINK"),
        subjectId: setup.caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: missingId,
        epistemicStatus: "SYNTHETIC",
        provenance: setup.provenance(),
      })
    );
    await expect(
      setup.container.useCases.comparePersonCandidates.execute({
        caseId: setup.caseId,
        leftPersonId: setup.leftPersonId,
        rightPersonId: missingId,
      })
    ).rejects.toThrow("PERSON-LINKED-MISSING");
  });
});
