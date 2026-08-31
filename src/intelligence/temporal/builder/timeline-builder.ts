import {
  Case,
  Evidence,
  Fact,
  Hypothesis,
  MissingEvent,
  Tip,
} from "@/domain";
import { normalizeTemporalFactAttribute } from "../model/temporal-fact-attribute";
import { TimelineEvent } from "../model/timeline-event";
import { Timeline } from "../model/timeline";
import { TemporalParser } from "../parser/temporal-parser";

export interface TimelineBuilderInput {
  readonly caseEntity: Case;
  readonly missingEvent?: MissingEvent | null;
  readonly facts?: readonly Fact[];
  readonly tips?: readonly Tip[];
  readonly evidence?: readonly Evidence[];
  readonly hypotheses?: readonly Hypothesis[];
}

export class TimelineBuilder {
  /**
   * Constructs a structured Timeline from domain entities.
   * Preserves precise semantics between reception, recording and observation timestamps.
   */
  static build(input: TimelineBuilderInput): Timeline {
    const events: TimelineEvent[] = [];
    const caseId = input.caseEntity.id;

    // 1. Missing Event
    if (input.missingEvent) {
      const parsedCreated = TemporalParser.parse(input.missingEvent.createdAt);
      events.push(
        new TimelineEvent({
          eventId: `EVT-ME-${input.missingEvent.id}`,
          caseId,
          eventType: "MISSING_EVENT",
          label: "Missing event registered",
          temporalExpression: parsedCreated ?? undefined,
          epistemicStatus: input.caseEntity.workflowStatus === "DRAFT" ? "UNVERIFIED" : "CONFIRMED",
          metadata: {
            missingEventId: input.missingEvent.id,
            personId: input.missingEvent.personId,
          },
        })
      );
    }

    // 2. Facts
    if (input.facts) {
      for (const fact of input.facts) {
        const normAttr = normalizeTemporalFactAttribute(fact.attribute);
        if (normAttr) {
          // Parse value or observedAt
          let parsedExpr = TemporalParser.parse(fact.value);
          if (!parsedExpr && fact.provenance.observedAt) {
            parsedExpr = TemporalParser.parse(fact.provenance.observedAt);
          }

          events.push(
            new TimelineEvent({
              eventId: `EVT-FACT-${fact.id}`,
              caseId,
              eventType: "FACT_OBSERVATION",
              label: `Temporal fact: ${normAttr}`,
              temporalExpression: parsedExpr ?? undefined,
              epistemicStatus: fact.epistemicStatus,
              sourceFactIds: [fact.id],
              metadata: {
                factId: fact.id,
                subjectId: fact.subjectId,
                attribute: normAttr,
                sourceId: fact.provenance.sourceId,
              },
            })
          );
        }
      }
    }

    // 3. Tips (Preserving receivedAt semantics - NEVER conflate with observedAt)
    if (input.tips) {
      for (const tip of input.tips) {
        const parsedReceived = TemporalParser.parse(tip.receivedAt);
        events.push(
          new TimelineEvent({
            eventId: `EVT-TIP-${tip.id}`,
            caseId,
            eventType: "TIP_RECEIVED",
            label: "Tip received",
            temporalExpression: parsedReceived ?? undefined,
            epistemicStatus: tip.epistemicStatus,
            sourceTipIds: [tip.id],
            metadata: {
              tipId: tip.id,
              sourceId: tip.sourceId,
              timestampType: "reception_time",
            },
          })
        );
      }
    }

    // 4. Evidence (Preserving recordedAt semantics)
    if (input.evidence) {
      for (const ev of input.evidence) {
        const parsedRecorded = TemporalParser.parse(ev.provenance.recordedAt);
        events.push(
          new TimelineEvent({
            eventId: `EVT-EVID-${ev.id}`,
            caseId,
            eventType: "EVIDENCE_RECORDED",
            label: "Evidence recorded",
            temporalExpression: parsedRecorded ?? undefined,
            epistemicStatus: ev.epistemicStatus,
            sourceEvidenceIds: [ev.id],
            metadata: {
              evidenceId: ev.id,
              sourceId: ev.sourceId,
              timestampType: "custody_recording_time",
            },
          })
        );
      }
    }

    // 5. Hypotheses
    if (input.hypotheses) {
      for (const hyp of input.hypotheses) {
        const parsedCreated = TemporalParser.parse(hyp.createdAt);
        events.push(
          new TimelineEvent({
            eventId: `EVT-HYP-${hyp.id}`,
            caseId,
            eventType: "HYPOTHESIS_CREATED",
            label: "Hypothesis formulated",
            temporalExpression: parsedCreated ?? undefined,
            epistemicStatus: "HYPOTHESIS",
            metadata: {
              hypothesisId: hyp.id,
              hypothesisStatus: hyp.status,
            },
          })
        );
      }
    }

    return new Timeline(caseId, events);
  }
}