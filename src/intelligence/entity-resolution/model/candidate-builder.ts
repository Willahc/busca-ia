import type { Fact, Person } from "@/domain";
import { TemporalParser } from "../../temporal/parser/temporal-parser";
import { TemporalPoint } from "../../temporal/model/temporal-point";
import { normalizeControlledCode, normalizeText } from "../normalization/text-normalization";
import {
  AttributeAssertion,
  CandidateAttribute,
  EntityResolutionAttribute,
  EntityResolutionCandidate,
  ENTITY_RESOLUTION_ATTRIBUTES,
  ENTITY_RESOLUTION_ISSUE_CODES,
  FACT_ATTRIBUTE_REGISTRY,
} from "./entity-resolution-model";

function isValidValue(attribute: EntityResolutionAttribute, value: unknown): boolean {
  switch (attribute) {
    case ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME:
    case ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME:
    case ENTITY_RESOLUTION_ATTRIBUTES.FATHER_NAME:
      return normalizeText(value) !== null;
    case ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE: {
      const parsed = TemporalParser.parse(value);
      return (
        parsed instanceof TemporalPoint &&
        (parsed.precision === "YEAR" || parsed.precision === "MONTH" || parsed.precision === "DAY")
      );
    }
    default:
      return normalizeControlledCode(value) !== null;
  }
}

/** Builds an analytical projection without modifying Person or its Facts. */
export function buildEntityResolutionCandidate(
  person: Person,
  facts: readonly Fact[]
): EntityResolutionCandidate {
  const grouped = new Map<EntityResolutionAttribute, AttributeAssertion[]>();
  const issues: EntityResolutionCandidate["issues"][number][] = [];
  const sourceReferences = new Set<AttributeAssertion["sourceId"]>();

  for (const fact of facts) {
    if (fact.subjectId !== person.id) continue;
    const attribute = FACT_ATTRIBUTE_REGISTRY[fact.attribute];
    if (!attribute) continue;

    const assertion: AttributeAssertion = Object.freeze({
      attribute,
      value: fact.value,
      factId: fact.id,
      epistemicStatus: fact.epistemicStatus,
      sourceId: fact.provenance.sourceId,
    });
    const assertions = grouped.get(attribute) ?? [];
    assertions.push(assertion);
    grouped.set(attribute, assertions);
    sourceReferences.add(fact.provenance.sourceId);

    if (!isValidValue(attribute, fact.value)) {
      issues.push(
        Object.freeze({
          code: ENTITY_RESOLUTION_ISSUE_CODES.INVALID_ATTRIBUTE_ASSERTION,
          candidateId: person.id,
          attribute,
          sourceFactIds: Object.freeze([fact.id]),
        })
      );
    }
  }

  const attributes: CandidateAttribute[] = [...grouped.entries()].map(
    ([attribute, assertions]) =>
      Object.freeze({
        attribute,
        assertions: Object.freeze([...assertions]),
      })
  );

  return Object.freeze({
    candidateId: person.id,
    personId: person.id,
    attributes: Object.freeze(attributes),
    sourceReferences: Object.freeze([...sourceReferences]),
    issues: Object.freeze(issues),
  });
}
