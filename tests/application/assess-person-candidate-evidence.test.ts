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
  INVESTIGATIVE_CONCLUSIONS,
} from "@/intelligence";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

describe("AssessPersonCandidateEvidence", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });
  afterEach(() => resetApplicationContainer());

  async function setup(rightDob = "1992-12-15") {
    const container = globalThis.__buscaIaAppContainer!;
    const caseId = createCaseId("CASE-ASSESSMENT-APPLICATION");
    const leftPersonId = createPersonId("PERSON-ASSESSMENT-LEFT");
    const rightPersonId = createPersonId("PERSON-ASSESSMENT-RIGHT");
    const sourceId = createSourceId("SOURCE-ASSESSMENT-APPLICATION");
    const missingEventId = createMissingEventId("EVENT-ASSESSMENT-APPLICATION");
    const provenance = () =>
      new Provenance({
        sourceId,
        recordedAt: new Date("2026-09-01T12:00:00Z"),
        recordedBy: "SYNTHETIC-ASSESSMENT-TEST",
      });
    await container.repositories.sourceRepository.save(
      new Source({ id: sourceId, type: "SYNTHETIC_TEST", label: "Synthetic source" })
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
        id: createFactId("FACT-ASSESSMENT-CASE-LINK"),
        subjectId: caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: rightPersonId,
        epistemicStatus: "SYNTHETIC",
        provenance: provenance(),
      })
    );
    const attributes = [
      ["NAME", "person.full_name", "Pessoa Sintetica", "PESSOA SINTETICA"],
      ["DOB", "person.birth_date", "1992-12-15", rightDob],
      ["MOTHER", "person.mother_name", "Parente Sintetico", "PARENTE SINTETICO"],
    ] as const;
    for (const [suffix, attribute, leftValue, rightValue] of attributes) {
      for (const [side, subjectId, value] of [
        ["LEFT", leftPersonId, leftValue],
        ["RIGHT", rightPersonId, rightValue],
      ] as const) {
        await container.repositories.factRepository.save(
          new Fact({
            id: createFactId(`FACT-ASSESSMENT-${side}-${suffix}`),
            subjectId,
            attribute,
            value,
            epistemicStatus: "CONFIRMED",
            provenance: provenance(),
          })
        );
      }
    }
    return { container, caseId, leftPersonId, rightPersonId };
  }

  it("orchestrates Gate 8 and returns an on-demand meaningful assessment", async () => {
    const fixture = await setup();
    const assessment = await fixture.container.useCases.assessPersonCandidateEvidence.execute({
      caseId: fixture.caseId,
      leftPersonId: fixture.leftPersonId,
      rightPersonId: fixture.rightPersonId,
    });
    expect(assessment.conclusion).toBe(
      INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_MEANINGFUL_EVIDENCE
    );
    expect(assessment.subjectPair).toEqual({
      leftPersonId: fixture.leftPersonId,
      rightPersonId: fixture.rightPersonId,
    });
    expect(assessment).not.toHaveProperty("score");
  });

  it("returns INCOMPATIBLE for a confirmed exact DOB conflict", async () => {
    const fixture = await setup("1993-12-15");
    const assessment = await fixture.container.useCases.assessPersonCandidateEvidence.execute({
      caseId: fixture.caseId,
      leftPersonId: fixture.leftPersonId,
      rightPersonId: fixture.rightPersonId,
    });
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INCOMPATIBLE);
    expect(assessment.hardContradictions).toHaveLength(1);
  });
});
