import {
  TEMPORAL_PRECISION_RANKS,
  TemporalPrecision,
} from "../precision/temporal-precision";
import { TemporalInterval } from "../model/temporal-interval";
import { TemporalPoint } from "../model/temporal-point";
import { TimelineEvent } from "../model/timeline-event";
import { TemporalDerivation } from "./temporal-derivation";

export class TemporalDerivationEngine {
  /**
   * Deterministically derives composite temporal intervals and facts.
   * INVARIANT: Precision of the derived result cannot exceed the coarsest precision among its inputs.
   */
  static derive(
    events: readonly TimelineEvent[]
  ): readonly TemporalDerivation[] {
    const derivations: TemporalDerivation[] = [];

    // Derive intervals for events that have paired start and end facts
    const eventsByAggregate: Record<string, { start?: TimelineEvent; end?: TimelineEvent }> = {};

    for (const event of events) {
      const aggId = event.metadata.aggregateId;
      const attr = event.metadata.attribute;
      if (aggId && attr) {
        if (!eventsByAggregate[aggId]) {
          eventsByAggregate[aggId] = {};
        }
        if (attr === "event.start") {
          eventsByAggregate[aggId].start = event;
        } else if (attr === "event.end") {
          eventsByAggregate[aggId].end = event;
        }
      }
    }

    for (const [aggId, pair] of Object.entries(eventsByAggregate)) {
      if (pair.start?.temporalExpression && pair.end?.temporalExpression) {
        const startExpr = pair.start.temporalExpression;
        const endExpr = pair.end.temporalExpression;

        const rankStart = TEMPORAL_PRECISION_RANKS[startExpr.precision];
        const rankEnd = TEMPORAL_PRECISION_RANKS[endExpr.precision];

        // The derived precision is the minimum (coarsest) of the two precisions
        const minRank = Math.min(rankStart, rankEnd);
        let derivedPrecision: TemporalPrecision = "INTERVAL";
        if (minRank >= 5) {
          derivedPrecision = "EXACT";
        } else if (minRank === 4) {
          derivedPrecision = "DAY";
        } else if (minRank === 3) {
          derivedPrecision = "MONTH";
        } else if (minRank === 2) {
          derivedPrecision = "YEAR";
        }

        const startPoint =
          startExpr instanceof TemporalPoint ? startExpr : startExpr.start;
        const endPoint =
          endExpr instanceof TemporalPoint ? endExpr : endExpr.end;

        const interval = new TemporalInterval({
          start: startPoint,
          end: endPoint,
          precision: derivedPrecision,
          rawExpression: `${startExpr.rawExpression ?? ""} / ${endExpr.rawExpression ?? ""}`,
        });

        derivations.push(
          new TemporalDerivation({
            derivationId: `DERIV-INT-${aggId}`,
            derivedAttribute: "event.duration_interval",
            temporalExpression: interval,
            precision: derivedPrecision,
            epistemicStatus: "DERIVED",
            sourceFactIds: [...pair.start.sourceFactIds, ...pair.end.sourceFactIds],
            sourceEventIds: [pair.start.eventId, pair.end.eventId],
            explanation: `Derived temporal interval from paired start and end events for aggregate ${aggId}`,
          })
        );
      }
    }

    return Object.freeze(derivations);
  }
}