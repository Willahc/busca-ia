import { EPISTEMIC_STATUS } from "@/domain";
import { TemporalParser } from "../../temporal/parser/temporal-parser";
import { TemporalPoint } from "../../temporal/model/temporal-point";
import {
  AttributeAssertion,
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
  ENTITY_RESOLUTION_ATTRIBUTES,
} from "../model/entity-resolution-model";
import { AttributeComparator } from "./comparator";
import { comparison } from "./comparison-factory";

function parseBirthDate(assertion: AttributeAssertion | undefined): TemporalPoint | null {
  const parsed = TemporalParser.parse(assertion?.value);
  if (!(parsed instanceof TemporalPoint)) {
    return null;
  }
  if (parsed.precision !== "YEAR" && parsed.precision !== "MONTH" && parsed.precision !== "DAY") {
    return null;
  }
  return parsed;
}

function normalizedDate(point: TemporalPoint | null): string | null {
  if (!point) return null;
  const month = point.month === undefined ? "" : `-${String(point.month).padStart(2, "0")}`;
  const day = point.day === undefined ? "" : `-${String(point.day).padStart(2, "0")}`;
  return `${String(point.year).padStart(4, "0")}${month}${day}`;
}

export class BirthDateComparator implements AttributeComparator {
  readonly attribute = ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE;

  compare(left: AttributeAssertion | undefined, right: AttributeAssertion | undefined) {
    const leftDate = parseBirthDate(left);
    const rightDate = parseBirthDate(right);
    const leftValue = normalizedDate(leftDate);
    const rightValue = normalizedDate(rightDate);

    if (!leftDate || !rightDate) {
      return comparison(
        this.attribute,
        left,
        right,
        COMPARISON_OUTCOMES.UNKNOWN,
        DISCRIMINATIVE_POWERS.HIGH,
        CONTRADICTION_SEVERITIES.NONE,
        "BIRTH_DATE_UNKNOWN_OR_INVALID",
        leftValue,
        rightValue
      );
    }

    const leftRange = leftDate.getUtcRange();
    const rightRange = rightDate.getUtcRange();
    const overlaps = leftRange.minMs <= rightRange.maxMs && rightRange.minMs <= leftRange.maxMs;
    const bothDay = leftDate.precision === "DAY" && rightDate.precision === "DAY";

    if (overlaps) {
      const identicalPrecisionAndValue =
        leftDate.precision === rightDate.precision && leftValue === rightValue;
      return comparison(
        this.attribute,
        left,
        right,
        identicalPrecisionAndValue ? COMPARISON_OUTCOMES.MATCH : COMPARISON_OUTCOMES.PARTIAL_MATCH,
        bothDay ? DISCRIMINATIVE_POWERS.HIGH : DISCRIMINATIVE_POWERS.MEDIUM,
        CONTRADICTION_SEVERITIES.NONE,
        identicalPrecisionAndValue
          ? bothDay
            ? "BIRTH_DATE_EXACT_MATCH"
            : "BIRTH_DATE_SAME_PARTIAL_PRECISION"
          : "BIRTH_DATE_PRECISION_CONTAINMENT",
        leftValue,
        rightValue
      );
    }

    const hard =
      bothDay &&
      left?.epistemicStatus === EPISTEMIC_STATUS.CONFIRMED &&
      right?.epistemicStatus === EPISTEMIC_STATUS.CONFIRMED;

    return comparison(
      this.attribute,
      left,
      right,
      COMPARISON_OUTCOMES.MISMATCH,
      bothDay ? DISCRIMINATIVE_POWERS.HIGH : DISCRIMINATIVE_POWERS.MEDIUM,
      hard ? CONTRADICTION_SEVERITIES.HARD : CONTRADICTION_SEVERITIES.NONE,
      hard ? "CONFIRMED_EXACT_BIRTH_DATE_CONFLICT" : "BIRTH_DATE_NON_OVERLAPPING",
      leftValue,
      rightValue
    );
  }
}
