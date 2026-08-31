import {
  AttributeAssertion,
  AttributeComparison,
  ComparisonOutcome,
  ContradictionSeverity,
  DiscriminativePower,
  EntityResolutionAttribute,
} from "../model/entity-resolution-model";

export function comparison(
  attribute: EntityResolutionAttribute,
  left: AttributeAssertion | undefined,
  right: AttributeAssertion | undefined,
  outcome: ComparisonOutcome,
  discriminativePower: DiscriminativePower,
  contradictionSeverity: ContradictionSeverity,
  reasonCode: string,
  leftValue: unknown | null = left?.value ?? null,
  rightValue: unknown | null = right?.value ?? null
): AttributeComparison {
  return Object.freeze({
    attribute,
    leftValue,
    rightValue,
    outcome,
    discriminativePower,
    contradictionSeverity,
    reasonCode,
    sourceFactIdsLeft: left ? Object.freeze([left.factId]) : Object.freeze([]),
    sourceFactIdsRight: right ? Object.freeze([right.factId]) : Object.freeze([]),
    epistemicStatusLeft: left?.epistemicStatus ?? null,
    epistemicStatusRight: right?.epistemicStatus ?? null,
  });
}
