import { TemporalPoint } from "../model/temporal-point";
import { TemporalInterval } from "../model/temporal-interval";
import {
  TemporalRelation,
  TemporalRelationType,
} from "./temporal-relation";

export class TemporalRelationEvaluator {
  /**
   * Evaluates the deterministic chronological relation between two temporal expressions.
   */
  static evaluate(
    leftExpr: TemporalPoint | TemporalInterval | undefined,
    rightExpr: TemporalPoint | TemporalInterval | undefined,
    leftEventId: string,
    rightEventId: string
  ): TemporalRelation {
    if (
      !leftExpr ||
      !rightExpr ||
      leftExpr.precision === "UNKNOWN" ||
      rightExpr.precision === "UNKNOWN"
    ) {
      return new TemporalRelation({
        leftEventId,
        rightEventId,
        relation: "INDETERMINATE",
        explanation: "Indeterminate due to missing or unknown temporal precision",
      });
    }

    const rangeA = leftExpr.getUtcRange();
    const rangeB = rightExpr.getUtcRange();

    let relation: TemporalRelationType = "INDETERMINATE";
    let explanation = "";

    if (rangeA.maxMs < rangeB.minMs) {
      relation = "BEFORE";
      explanation = `Event ${leftEventId} precedes event ${rightEventId}`;
    } else if (rangeA.minMs > rangeB.maxMs) {
      relation = "AFTER";
      explanation = `Event ${leftEventId} succeeds event ${rightEventId}`;
    } else if (rangeA.minMs === rangeB.minMs && rangeA.maxMs === rangeB.maxMs) {
      relation = "EQUAL";
      explanation = `Events ${leftEventId} and ${rightEventId} share identical temporal bounds`;
    } else if (rangeA.minMs <= rangeB.minMs && rangeA.maxMs >= rangeB.maxMs) {
      relation = "CONTAINS";
      explanation = `Event ${leftEventId} temporally contains event ${rightEventId}`;
    } else if (rangeB.minMs <= rangeA.minMs && rangeB.maxMs >= rangeA.maxMs) {
      relation = "CONTAINED_BY";
      explanation = `Event ${leftEventId} is temporally contained by event ${rightEventId}`;
    } else {
      relation = "OVERLAPS";
      explanation = `Events ${leftEventId} and ${rightEventId} partially overlap`;
    }

    return new TemporalRelation({
      leftEventId,
      rightEventId,
      relation,
      explanation,
    });
  }
}