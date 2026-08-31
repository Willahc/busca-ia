import {
  Case,
  Evidence,
  Fact,
  Hypothesis,
  MissingEvent,
  Tip,
} from "@/domain";
import { TimelineBuilder } from "../builder/timeline-builder";
import { TemporalRelationEvaluator } from "../relations/temporal-relation-evaluator";
import { TemporalRelation } from "../relations/temporal-relation";
import { TemporalContradictionEvaluator } from "../contradictions/temporal-contradiction-evaluator";
import { TemporalGapEvaluator } from "../gaps/temporal-gap-evaluator";
import { TemporalDerivationEngine } from "../derivations/temporal-derivation-engine";
import {
  TemporalAnalysisResult,
  TemporalAnalysisStatus,
} from "./temporal-analysis-result";

export interface TemporalIntelligenceInput {
  readonly caseEntity: Case;
  readonly missingEvent?: MissingEvent | null;
  readonly facts?: readonly Fact[];
  readonly tips?: readonly Tip[];
  readonly evidence?: readonly Evidence[];
  readonly hypotheses?: readonly Hypothesis[];
  readonly referenceClock?: Date;
}

export class TemporalIntelligenceEngine {
  /**
   * Deterministically analyzes temporal data across case entities.
   * Pure function: same inputs always yield identical analytical outputs.
   */
  static analyze(input: TemporalIntelligenceInput): TemporalAnalysisResult {
    const timeline = TimelineBuilder.build({
      caseEntity: input.caseEntity,
      missingEvent: input.missingEvent,
      facts: input.facts,
      tips: input.tips,
      evidence: input.evidence,
      hypotheses: input.hypotheses,
    });

    const datedEvents = timeline.getDatedEvents();
    const undatedEvents = timeline.getUndatedEvents();

    // Check if temporal data is insufficient
    let status: TemporalAnalysisStatus = "ANALYZED";
    if (datedEvents.length === 0) {
      status = "INSUFFICIENT_TEMPORAL_DATA";
      return new TemporalAnalysisResult({
        caseId: input.caseEntity.id,
        status,
        events: timeline.events,
        relations: [],
        contradictions: [],
        gaps: [],
        derivations: [],
        unresolvedEvents: undatedEvents,
        generatedAt: input.referenceClock,
      });
    }

    // 1. Evaluate chronological relations between all pairs of dated events
    const relations: TemporalRelation[] = [];
    for (let i = 0; i < datedEvents.length; i++) {
      for (let j = i + 1; j < datedEvents.length; j++) {
        const left = datedEvents[i];
        const right = datedEvents[j];
        const relation = TemporalRelationEvaluator.evaluate(
          left.temporalExpression,
          right.temporalExpression,
          left.eventId,
          right.eventId
        );
        relations.push(relation);
      }
    }

    // 2. Evaluate explicit temporal contradictions
    const contradictions =
      TemporalContradictionEvaluator.evaluateContradictions(datedEvents);

    // 3. Evaluate chronological gaps
    const gaps = TemporalGapEvaluator.evaluateGaps(datedEvents);

    // 4. Derive composite intervals and durations
    const derivations = TemporalDerivationEngine.derive(datedEvents);

    return new TemporalAnalysisResult({
      caseId: input.caseEntity.id,
      status,
      events: timeline.events,
      relations,
      contradictions,
      gaps,
      derivations,
      unresolvedEvents: undatedEvents,
      generatedAt: input.referenceClock,
    });
  }
}