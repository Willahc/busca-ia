import { EPISTEMIC_STATUS } from "@/domain";
import { COMPARATOR_REGISTRY } from "../comparators/comparator-registry";
import {
  AttributeAssertion,
  AttributeComparison,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
  EntityResolutionAttribute,
  EntityResolutionCandidate,
  EntityResolutionIssue,
  EntityResolutionResult,
  ENTITY_RESOLUTION_ATTRIBUTES,
  ENTITY_RESOLUTION_CONCLUSIONS,
  ENTITY_RESOLUTION_ISSUE_CODES,
} from "../model/entity-resolution-model";

const SINGLE_VALUED_ATTRIBUTES = new Set<EntityResolutionAttribute>([
  ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME,
  ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE,
  ENTITY_RESOLUTION_ATTRIBUTES.SEX,
  ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
  ENTITY_RESOLUTION_ATTRIBUTES.FATHER_NAME,
  ENTITY_RESOLUTION_ATTRIBUTES.NATIONALITY,
]);

function assertionsFor(
  candidate: EntityResolutionCandidate,
  attribute: EntityResolutionAttribute
): readonly AttributeAssertion[] {
  return candidate.attributes.find((item) => item.attribute === attribute)?.assertions ?? [];
}

function internalConflicts(candidate: EntityResolutionCandidate): EntityResolutionIssue[] {
  const issues: EntityResolutionIssue[] = [];
  for (const attribute of SINGLE_VALUED_ATTRIBUTES) {
    const confirmed = assertionsFor(candidate, attribute).filter(
      (assertion) => assertion.epistemicStatus === EPISTEMIC_STATUS.CONFIRMED
    );
    const conflictingFactIds = new Set<AttributeAssertion["factId"]>();

    for (let leftIndex = 0; leftIndex < confirmed.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < confirmed.length; rightIndex += 1) {
        const result = COMPARATOR_REGISTRY[attribute].compare(
          confirmed[leftIndex],
          confirmed[rightIndex]
        );
        if (result.outcome === COMPARISON_OUTCOMES.MISMATCH) {
          conflictingFactIds.add(confirmed[leftIndex].factId);
          conflictingFactIds.add(confirmed[rightIndex].factId);
        }
      }
    }

    if (conflictingFactIds.size > 0) {
      issues.push(
        Object.freeze({
          code: ENTITY_RESOLUTION_ISSUE_CODES.INTERNAL_ATTRIBUTE_CONFLICT,
          candidateId: candidate.candidateId,
          attribute,
          sourceFactIds: Object.freeze([...conflictingFactIds]),
        })
      );
    }
  }
  return issues;
}

function compareAssertionSets(
  attribute: EntityResolutionAttribute,
  left: readonly AttributeAssertion[],
  right: readonly AttributeAssertion[]
): AttributeComparison[] {
  const comparator = COMPARATOR_REGISTRY[attribute];
  if (left.length === 0 && right.length === 0) {
    return [comparator.compare(undefined, undefined)];
  }
  if (left.length === 0) {
    return right.map((assertion) => comparator.compare(undefined, assertion));
  }
  if (right.length === 0) {
    return left.map((assertion) => comparator.compare(assertion, undefined));
  }

  return left.flatMap((leftAssertion) =>
    right.map((rightAssertion) => comparator.compare(leftAssertion, rightAssertion))
  );
}

function determineConclusion(
  comparisons: readonly AttributeComparison[],
  issues: readonly EntityResolutionIssue[]
) {
  if (comparisons.some((item) => item.contradictionSeverity === CONTRADICTION_SEVERITIES.HARD)) {
    return ENTITY_RESOLUTION_CONCLUSIONS.INCOMPATIBLE;
  }
  if (issues.length > 0) {
    return ENTITY_RESOLUTION_CONCLUSIONS.REQUIRES_HUMAN_REVIEW;
  }

  const informativeMatches = new Set(
    comparisons
      .filter(
        (item) =>
          (item.outcome === COMPARISON_OUTCOMES.MATCH ||
            item.outcome === COMPARISON_OUTCOMES.PARTIAL_MATCH) &&
          item.discriminativePower !== DISCRIMINATIVE_POWERS.LOW
      )
      .map((item) => item.attribute)
  );
  const exactHighMatches = comparisons.filter(
    (item) =>
      item.outcome === COMPARISON_OUTCOMES.MATCH &&
      (item.discriminativePower === DISCRIMINATIVE_POWERS.HIGH ||
        item.discriminativePower === DISCRIMINATIVE_POWERS.VERY_HIGH)
  );
  const mismatches = comparisons.filter((item) => item.outcome === COMPARISON_OUTCOMES.MISMATCH);

  if (exactHighMatches.length > 0 && informativeMatches.size >= 2 && mismatches.length === 0) {
    return ENTITY_RESOLUTION_CONCLUSIONS.COMPATIBLE;
  }
  if (mismatches.length > 0 || informativeMatches.size >= 2) {
    return ENTITY_RESOLUTION_CONCLUSIONS.REQUIRES_HUMAN_REVIEW;
  }
  return ENTITY_RESOLUTION_CONCLUSIONS.INSUFFICIENT_DATA;
}

export class EntityResolutionEngine {
  static compare(
    leftCandidate: EntityResolutionCandidate,
    rightCandidate: EntityResolutionCandidate
  ): EntityResolutionResult {
    const detectedIssues = [
      ...leftCandidate.issues,
      ...rightCandidate.issues,
      ...internalConflicts(leftCandidate),
      ...internalConflicts(rightCandidate),
    ];
    const conflictedAttributes = new Set(
      detectedIssues
        .filter((issue) => issue.code === ENTITY_RESOLUTION_ISSUE_CODES.INTERNAL_ATTRIBUTE_CONFLICT)
        .map((issue) => issue.attribute)
    );

    const rawComparisons = (Object.values(ENTITY_RESOLUTION_ATTRIBUTES) as EntityResolutionAttribute[])
      .flatMap((attribute) =>
        compareAssertionSets(
          attribute,
          assertionsFor(leftCandidate, attribute),
          assertionsFor(rightCandidate, attribute)
        )
      );

    // An internally contradictory source cannot support a cross-candidate hard conclusion.
    const comparisons = rawComparisons.map((item) =>
      item.contradictionSeverity === CONTRADICTION_SEVERITIES.HARD &&
      conflictedAttributes.has(item.attribute)
        ? Object.freeze({
            ...item,
            contradictionSeverity: CONTRADICTION_SEVERITIES.NONE,
            reasonCode: "INTERNAL_CONFLICT_PREVENTS_HARD_CONTRADICTION",
          })
        : item
    );
    const matches = comparisons.filter(
      (item) =>
        item.outcome === COMPARISON_OUTCOMES.MATCH ||
        item.outcome === COMPARISON_OUTCOMES.PARTIAL_MATCH
    );
    const mismatches = comparisons.filter((item) => item.outcome === COMPARISON_OUTCOMES.MISMATCH);
    const unknowns = comparisons.filter((item) => item.outcome === COMPARISON_OUTCOMES.UNKNOWN);
    const hardContradictions = comparisons.filter(
      (item) => item.contradictionSeverity === CONTRADICTION_SEVERITIES.HARD
    );
    const softContradictions = comparisons.filter(
      (item) => item.contradictionSeverity === CONTRADICTION_SEVERITIES.SOFT
    );
    const highDiscriminationMatches = comparisons.filter(
      (item) =>
        item.outcome === COMPARISON_OUTCOMES.MATCH &&
        (item.discriminativePower === DISCRIMINATIVE_POWERS.HIGH ||
          item.discriminativePower === DISCRIMINATIVE_POWERS.VERY_HIGH)
    );

    return Object.freeze({
      leftCandidateId: leftCandidate.candidateId,
      rightCandidateId: rightCandidate.candidateId,
      comparisons: Object.freeze(comparisons),
      matches: Object.freeze(matches),
      mismatches: Object.freeze(mismatches),
      unknowns: Object.freeze(unknowns),
      hardContradictions: Object.freeze(hardContradictions),
      softContradictions: Object.freeze(softContradictions),
      highDiscriminationMatches: Object.freeze(highDiscriminationMatches),
      conclusion: determineConclusion(comparisons, detectedIssues),
      issues: Object.freeze(detectedIssues),
    });
  }
}
