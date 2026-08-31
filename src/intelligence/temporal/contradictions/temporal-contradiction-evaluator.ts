import { TimelineEvent } from "../model/timeline-event";
import {
  TEMPORAL_CONTRADICTION_REASONS,
  TemporalContradiction,
} from "./temporal-contradiction";

export class TemporalContradictionEvaluator {
  /**
   * Evaluates a collection of TimelineEvents for explicit, deterministic temporal contradictions.
   * EPISTEMIC RULE: Absence of temporal data or large gaps between events NEVER constitute contradiction.
   */
  static evaluateContradictions(
    events: readonly TimelineEvent[]
  ): readonly TemporalContradiction[] {
    const contradictions: TemporalContradiction[] = [];

    // Filter to dated events
    const datedEvents = events.filter((e) => e.isDated && e.temporalExpression !== undefined);

    for (let i = 0; i < datedEvents.length; i++) {
      for (let j = i + 1; j < datedEvents.length; j++) {
        const left = datedEvents[i];
        const right = datedEvents[j];

        const leftAttr = left.metadata.attribute;
        const rightAttr = right.metadata.attribute;
        const leftSubject = left.metadata.subjectId;
        const rightSubject = right.metadata.subjectId;

        // Rule 1: EXACT_TIMESTAMP_CONFLICT
        // Conflicting distinct values asserted for the exact same singular attribute on the same subject
        const singularExclusiveAttributes = ["missing.at", "date_of_birth"];
        if (
          leftSubject &&
          rightSubject &&
          leftSubject === rightSubject &&
          leftAttr &&
          rightAttr &&
          leftAttr === rightAttr &&
          singularExclusiveAttributes.includes(leftAttr)
        ) {
          const rangeLeft = left.temporalExpression!.getUtcRange();
          const rangeRight = right.temporalExpression!.getUtcRange();

          // If ranges are strictly disjoint, they cannot both be true for the singular event
          if (rangeLeft.maxMs < rangeRight.minMs || rangeLeft.minMs > rangeRight.maxMs) {
            contradictions.push(
              new TemporalContradiction({
                leftEventId: left.eventId,
                rightEventId: right.eventId,
                severity: "HARD",
                reasonCode: TEMPORAL_CONTRADICTION_REASONS.EXACT_TIMESTAMP_CONFLICT,
                explanation: `Mutually exclusive timestamps asserted for singular attribute '${leftAttr}' on subject ${leftSubject}`,
                sourceFactIds: [...left.sourceFactIds, ...right.sourceFactIds],
              })
            );
          }
        }

        // Rule 2: IMPOSSIBLE_SEQUENCE
        // e.g. An event start is declared to be strictly AFTER its corresponding event end
        if (
          left.metadata.aggregateId &&
          right.metadata.aggregateId &&
          left.metadata.aggregateId === right.metadata.aggregateId
        ) {
          if (leftAttr === "event.start" && rightAttr === "event.end") {
            const rangeStart = left.temporalExpression!.getUtcRange();
            const rangeEnd = right.temporalExpression!.getUtcRange();
            if (rangeStart.minMs > rangeEnd.maxMs) {
              contradictions.push(
                new TemporalContradiction({
                  leftEventId: left.eventId,
                  rightEventId: right.eventId,
                  severity: "HARD",
                  reasonCode: TEMPORAL_CONTRADICTION_REASONS.IMPOSSIBLE_SEQUENCE,
                  explanation: `Event start is chronologically later than event end for aggregate ${left.metadata.aggregateId}`,
                  sourceFactIds: [...left.sourceFactIds, ...right.sourceFactIds],
                })
              );
            }
          }
        }
      }
    }

    return Object.freeze(contradictions);
  }
}