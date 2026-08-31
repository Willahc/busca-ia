import { describe, expect, it } from "vitest";
import {
  createFactId,
  createSourceId,
  EpistemicStatus,
} from "@/domain";
import {
  AttributeAssertion,
  BirthDateComparator,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
  ENTITY_RESOLUTION_ATTRIBUTES,
  ExactValueComparator,
  NameComparator,
} from "@/intelligence/entity-resolution";

let sequence = 0;
function assertion(
  attribute: AttributeAssertion["attribute"],
  value: unknown,
  epistemicStatus: EpistemicStatus = "CONFIRMED"
): AttributeAssertion {
  sequence += 1;
  return {
    attribute,
    value,
    factId: createFactId(`FACT-COMPARATOR-${sequence}`),
    epistemicStatus,
    sourceId: createSourceId("SOURCE-COMPARATOR"),
  };
}

describe("Entity Resolution: deterministic comparators", () => {
  const name = new NameComparator();
  const birthDate = new BirthDateComparator();
  const sex = new ExactValueComparator(
    ENTITY_RESOLUTION_ATTRIBUTES.SEX,
    DISCRIMINATIVE_POWERS.LOW
  );
  const motherName = new NameComparator(
    ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
    DISCRIMINATIVE_POWERS.HIGH
  );

  it.each([
    ["José da Silva", "JOSE DA SILVA"],
    ["Maria de Souza", "Maria de  Souza"],
  ])("matches names only after conservative normalization", (left, right) => {
    const result = name.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, left),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, right)
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.MATCH);
    expect(result.discriminativePower).toBe(DISCRIMINATIVE_POWERS.MEDIUM);
  });

  it.each([
    ["José Silva", "José da Silva"],
    ["Carlos", "Carlus"],
  ])("does not invent fuzzy or nickname equivalence", (left, right) => {
    expect(
      name.compare(
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, left),
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME, right)
      ).outcome
    ).toBe(COMPARISON_OUTCOMES.MISMATCH);
  });

  it("matches equal exact birth dates with HIGH discrimination", () => {
    const result = birthDate.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15")
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.MATCH);
    expect(result.discriminativePower).toBe(DISCRIMINATIVE_POWERS.HIGH);
  });

  it.each([
    ["1992-12", "1992-12-15"],
    ["1992", "1992-12-15"],
  ])("preserves partial temporal containment", (left, right) => {
    const result = birthDate.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, left),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, right)
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.PARTIAL_MATCH);
    expect(result.contradictionSeverity).toBe(CONTRADICTION_SEVERITIES.NONE);
  });

  it("marks conflicting confirmed exact birth dates as HARD", () => {
    const result = birthDate.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1993-12-15")
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.MISMATCH);
    expect(result.contradictionSeverity).toBe(CONTRADICTION_SEVERITIES.HARD);
  });

  it("does not make an unverified exact date conflict HARD", () => {
    const result = birthDate.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15"),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1993-12-15", "UNVERIFIED")
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.MISMATCH);
    expect(result.contradictionSeverity).toBe(CONTRADICTION_SEVERITIES.NONE);
  });

  it("treats missing birth date as UNKNOWN and not contradiction", () => {
    const result = birthDate.compare(
      undefined,
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE, "1992-12-15")
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.UNKNOWN);
    expect(result.contradictionSeverity).toBe(CONTRADICTION_SEVERITIES.NONE);
  });

  it("compares sex deterministically without inference", () => {
    expect(
      sex.compare(
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"),
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE")
      ).outcome
    ).toBe(COMPARISON_OUTCOMES.MATCH);
    expect(
      sex.compare(
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.SEX, "FEMALE"),
        assertion(ENTITY_RESOLUTION_ATTRIBUTES.SEX, "MALE")
      ).outcome
    ).toBe(COMPARISON_OUTCOMES.MISMATCH);
    expect(
      sex.compare(undefined, assertion(ENTITY_RESOLUTION_ATTRIBUTES.SEX, "MALE")).outcome
    ).toBe(COMPARISON_OUTCOMES.UNKNOWN);
  });

  it("compares parent names with HIGH categorical discrimination", () => {
    const result = motherName.compare(
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME, "Pessoa Parente Alfa"),
      assertion(ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME, "PESSOA PARENTE ALFA")
    );
    expect(result.outcome).toBe(COMPARISON_OUTCOMES.MATCH);
    expect(result.discriminativePower).toBe(DISCRIMINATIVE_POWERS.HIGH);
  });
});
