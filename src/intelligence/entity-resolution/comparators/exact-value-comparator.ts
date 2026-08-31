import {
  AttributeAssertion,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DiscriminativePower,
  EntityResolutionAttribute,
} from "../model/entity-resolution-model";
import { normalizeControlledCode } from "../normalization/text-normalization";
import { AttributeComparator } from "./comparator";
import { comparison } from "./comparison-factory";

export class ExactValueComparator implements AttributeComparator {
  constructor(
    readonly attribute: EntityResolutionAttribute,
    private readonly power: DiscriminativePower,
    private readonly multiValued = false
  ) {}

  compare(left: AttributeAssertion | undefined, right: AttributeAssertion | undefined) {
    const leftValue = normalizeControlledCode(left?.value);
    const rightValue = normalizeControlledCode(right?.value);
    if (!leftValue || !rightValue) {
      return comparison(
        this.attribute,
        left,
        right,
        COMPARISON_OUTCOMES.UNKNOWN,
        this.power,
        CONTRADICTION_SEVERITIES.NONE,
        "ATTRIBUTE_VALUE_UNKNOWN",
        leftValue,
        rightValue
      );
    }

    const matched = leftValue === rightValue;
    return comparison(
      this.attribute,
      left,
      right,
      matched
        ? COMPARISON_OUTCOMES.MATCH
        : this.multiValued
          ? COMPARISON_OUTCOMES.NOT_APPLICABLE
          : COMPARISON_OUTCOMES.MISMATCH,
      this.power,
      CONTRADICTION_SEVERITIES.NONE,
      matched
        ? "CONTROLLED_VALUE_EXACT_MATCH"
        : this.multiValued
          ? "INDEPENDENT_MULTI_VALUE_ASSERTIONS"
          : "CONTROLLED_VALUE_MISMATCH",
      leftValue,
      rightValue
    );
  }
}
