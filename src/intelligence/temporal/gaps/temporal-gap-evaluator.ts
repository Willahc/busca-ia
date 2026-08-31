import { TemporalPoint } from "../model/temporal-point";
import { TimelineEvent } from "../model/timeline-event";
import { TemporalGap } from "./temporal-gap";

export class TemporalGapEvaluator {
  /**
   * Evaluates chronological gaps between consecutive ordered timeline events.
   * Gaps represent distance between observations, NOT contradictions.
   */
  static evaluateGaps(
    events: readonly TimelineEvent[]
  ): readonly TemporalGap[] {
    const datedEvents = events
      .filter((e) => e.isDated && e.temporalExpression !== undefined)
      .slice()
      .sort((a, b) => {
        const rangeA = a.temporalExpression!.getUtcRange();
        const rangeB = b.temporalExpression!.getUtcRange();
        return rangeA.minMs - rangeB.minMs;
      });

    if (datedEvents.length < 2) {
      return Object.freeze([]);
    }

    const gaps: TemporalGap[] = [];

    for (let i = 0; i < datedEvents.length - 1; i++) {
      const current = datedEvents[i];
      const next = datedEvents[i + 1];

      const rangeCurrent = current.temporalExpression!.getUtcRange();
      const rangeNext = next.temporalExpression!.getUtcRange();

      // Check if there is a positive forward gap (next starts after current ends)
      if (rangeNext.minMs > rangeCurrent.maxMs) {
        const diffMs = rangeNext.minMs - rangeCurrent.maxMs;

        const isBothExact =
          current.temporalExpression?.precision === "EXACT" &&
          next.temporalExpression?.precision === "EXACT";

        const isBothDayOrExact =
          (current.temporalExpression?.precision === "EXACT" ||
            current.temporalExpression?.precision === "DAY") &&
          (next.temporalExpression?.precision === "EXACT" ||
            next.temporalExpression?.precision === "DAY");

        let durationMinutes: number | undefined;
        let durationDays: number | undefined;

        if (isBothExact) {
          durationMinutes = Math.floor(diffMs / (1000 * 60));
        }

        if (isBothDayOrExact) {
          durationDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        const startPoint =
          current.temporalExpression instanceof TemporalPoint
            ? current.temporalExpression
            : current.temporalExpression?.end;

        const endPoint =
          next.temporalExpression instanceof TemporalPoint
            ? next.temporalExpression
            : next.temporalExpression?.start;

        gaps.push(
          new TemporalGap({
            startEventId: current.eventId,
            endEventId: next.eventId,
            start: startPoint,
            end: endPoint,
            durationMinutes,
            durationDays,
            classification: "KNOWN_GAP",
            explanation: `Chronological gap of ${durationDays ?? "indeterminate"} days between ${current.eventId} and ${next.eventId}`,
          })
        );
      }
    }

    return Object.freeze(gaps);
  }
}