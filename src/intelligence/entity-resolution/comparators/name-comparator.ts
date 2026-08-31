import {
  AttributeAssertion,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
  DiscriminativePower,
  EntityResolutionAttribute,
  ENTITY_RESOLUTION_ATTRIBUTES,
} from "../model/entity-resolution-model";
import { normalizeText } from "../normalization/text-normalization";
import { AttributeComparator } from "./comparator";
import { comparison } from "./comparison-factory";

export class NameComparator implements AttributeComparator {
  constructor(
    readonly attribute: EntityResolutionAttribute = ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME,
    private readonly power: DiscriminativePower = DISCRIMINATIVE_POWERS.MEDIUM
  ) {}

  compare(left: AttributeAssertion | undefined, right: AttributeAssertion | undefined) {
    const leftValue = normalizeText(left?.value);
    const rightValue = normalizeText(right?.value);
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
      matched ? COMPARISON_OUTCOMES.MATCH : COMPARISON_OUTCOMES.MISMATCH,
      this.power,
      CONTRADICTION_SEVERITIES.NONE,
      matched ? "NAME_NORMALIZED_EXACT_MATCH" : "NAME_NORMALIZED_MISMATCH",
      leftValue,
      rightValue
    );
  }
}
