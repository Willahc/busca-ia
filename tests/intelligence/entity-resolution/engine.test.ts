import { describe, expect, it } from "vitest";
import {
  createFactId,
  createPersonId,
  createSourceId,
  EpistemicStatus,
  Fact,
  Person,
  Provenance,
} from "@/domain";
import {
  AttributeAssertion,
  buildEntityResolutionCandidate,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  EntityResolutionCandidate,
  EntityResolutionEngine,
  ENTITY_RESOLUTION_ATTRIBUTES,
  ENTITY_RESOLUTION_CONCLUSIONS,
  ENTITY_RESOLUTION_ISSUE_CODES,
} from "@/intelligence/entity-resolution";

let factSequence = 0;
const sourceId = createSourceId("SOURCE-ER-SYNTHETIC");

function candidate(
  candidateId: string,
  values: readonly (readonly [AttributeAssertion["attribute"], unknown, EpistemicStatus?])[]
): EntityResolutionCandidate {
  const grouped = new Map<AttributeAssertion["attribute"], AttributeAssertion[]>();
  for (const [attribute, value, status = "CONFIRMED"] of values) {
    factSequence += 1;
    const existing = grouped.get(attribute) ?? [];
    existing.push({
      attribute,
      value,
      factId: createFactId(`FACT-ENGINE-${factSequence}`),
      epistemicStatus: status,
      sourceId,
    });
    grouped.set(attribute, existing);
  }
  return {
    candidateId,
    personId: createPersonId(candidateId),
    attributes: [...grouped.entries()].map(([attribute, assertions]) => ({
      attribute,
      assertions,
    })),
    sourceReferences: [sourceId],
    issues: [],
  };
}

describe("Entity Resolution Engine", () => {
  it("returns INSUFFICIENT_DATA for only a generic low-discrimination match", () => {
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-LOW-A", [[ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"]]),
      candidate("PERSON-LOW-B", [[ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"]])
    );
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.INSUFFICIENT_DATA);
    expect(result.matches).toHaveLength(1);
    expect(result.hardContradictions).toHaveLength(0);
  });

  it("returns COMPATIBLE for a controlled set of exact informative matches", () => {
    const values = [
      [ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, "Pessoa Teste Alfa"],
      [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"],
      [ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME, "Parente Teste Um"],
      [ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"],
    ] as const;
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-COMPATIBLE-A", values),
      candidate("PERSON-COMPATIBLE-B", [
        [ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, "PESSOA TESTE ALFA"],
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"],
        [ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME, "PARENTE TESTE UM"],
        [ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"],
      ])
    );
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.COMPATIBLE);
    expect(result.highDiscriminationMatches.map((item) => item.attribute)).toEqual(
      expect.arrayContaining([
        ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE,
        ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
      ])
    );
    expect(result).not.toHaveProperty("samePerson");
    expect(result).not.toHaveProperty("identityConfirmed");
  });

  it("returns INCOMPATIBLE only for an explicit HARD contradiction", () => {
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-HARD-A", [
        [ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, "Pessoa Teste"],
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"],
      ]),
      candidate("PERSON-HARD-B", [
        [ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, "Pessoa Teste"],
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1993-12-15"],
      ])
    );
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.INCOMPATIBLE);
    expect(result.hardContradictions).toHaveLength(1);
    expect(result.hardContradictions[0].contradictionSeverity).toBe(
      CONTRADICTION_SEVERITIES.HARD
    );
  });

  it("preserves multiple assertions and does not make an unverified conflict HARD", () => {
    const left = candidate("PERSON-MULTI-A", [
      [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-01-01", "CONFIRMED"],
      [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1993-01-01", "UNVERIFIED"],
    ]);
    const right = candidate("PERSON-MULTI-B", [
      [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-01-01", "CONFIRMED"],
    ]);
    const result = EntityResolutionEngine.compare(left, right);
    const dateComparisons = result.comparisons.filter(
      (item) => item.attribute === ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE
    );
    expect(dateComparisons).toHaveLength(2);
    expect(dateComparisons.map((item) => item.outcome)).toEqual(
      expect.arrayContaining([COMPARISON_OUTCOMES.MATCH, COMPARISON_OUTCOMES.MISMATCH])
    );
    expect(result.hardContradictions).toHaveLength(0);
    expect(result.conclusion).not.toBe(ENTITY_RESOLUTION_CONCLUSIONS.INCOMPATIBLE);
  });

  it("records two incompatible CONFIRMED assertions as an internal conflict", () => {
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-INTERNAL-A", [
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-01-01"],
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1993-01-01"],
      ]),
      candidate("PERSON-INTERNAL-B", [
        [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-01-01"],
      ])
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: ENTITY_RESOLUTION_ISSUE_CODES.INTERNAL_ATTRIBUTE_CONFLICT,
        candidateId: "PERSON-INTERNAL-A",
        attribute: ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE,
      })
    );
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.REQUIRES_HUMAN_REVIEW);
    expect(result.hardContradictions).toHaveLength(0);
  });

  it("keeps UNKNOWN neutral across all absent attributes", () => {
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-EMPTY-A", []),
      candidate("PERSON-EMPTY-B", [])
    );
    expect(result.comparisons.every((item) => item.outcome === COMPARISON_OUTCOMES.UNKNOWN)).toBe(true);
    expect(
      result.comparisons.every(
        (item) => item.contradictionSeverity === CONTRADICTION_SEVERITIES.NONE
      )
    ).toBe(true);
    expect(result.conclusion).toBe(ENTITY_RESOLUTION_CONCLUSIONS.INSUFFICIENT_DATA);
  });

  it("preserves assertion epistemic status and Fact provenance", () => {
    const person = new Person({ id: createPersonId("PERSON-PROVENANCE") });
    const statuses: EpistemicStatus[] = [
      "CONFIRMED",
      "UNVERIFIED",
      "DERIVED",
      "SYNTHETIC",
    ];
    const facts = statuses.map((status, index) =>
      new Fact({
        id: createFactId(`FACT-PROVENANCE-${index}`),
        subjectId: person.id,
        attribute: "person.full_name",
        value: `Pessoa Teste ${index}`,
        epistemicStatus: status,
        provenance: new Provenance({
          sourceId,
          recordedAt: new Date("2026-08-31T12:00:00Z"),
          recordedBy: "TEST-ACTOR",
          parentFactIds:
            status === "DERIVED" ? [createFactId("FACT-PARENT-SYNTHETIC")] : undefined,
        }),
      })
    );
    const built = buildEntityResolutionCandidate(person, facts);
    const assertions = built.attributes[0].assertions;
    expect(assertions.map((item) => item.epistemicStatus)).toEqual(statuses);
    expect(assertions.map((item) => item.factId)).toEqual(facts.map((fact) => fact.id));
    expect(built.sourceReferences).toEqual([sourceId]);
  });

  it("does not treat different structured distinctive marks as contradictions", () => {
    const result = EntityResolutionEngine.compare(
      candidate("PERSON-MARK-A", [
        [ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK, "SCAR_LEFT_FOREARM"],
      ]),
      candidate("PERSON-MARK-B", [
        [ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK, "BIRTHMARK_RIGHT_HAND"],
      ])
    );
    const mark = result.comparisons.find(
      (item) => item.attribute === ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK
    );
    expect(mark?.outcome).toBe(COMPARISON_OUTCOMES.NOT_APPLICABLE);
    expect(mark?.contradictionSeverity).toBe(CONTRADICTION_SEVERITIES.NONE);
  });
});
