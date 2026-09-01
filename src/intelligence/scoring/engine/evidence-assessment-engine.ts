import {
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
} from "@/intelligence/entity-resolution";
import { evaluateDataSufficiency, isSupportSignal } from "../evaluators/data-sufficiency-evaluator";
import { evaluateEntityResolutionSignals } from "../evaluators/entity-resolution-signal-evaluator";
import { evaluateTemporalSignals } from "../evaluators/temporal-signal-evaluator";
import {
  CORROBORATION_CATEGORIES,
  EVIDENCE_REASON_CODES,
  INFORMATION_GAIN_CATEGORIES,
  type CorroborationCategory,
  type EvidenceAssessmentInput,
  type EvidenceReasonCode,
  type EvidenceSignal,
  type InvestigativeAssessment,
  type InvestigativeExplanation,
} from "../model/evidence-assessment-model";
import { applyConclusionRules } from "../rules/conclusion-rules";

const EXPLANATION_MESSAGES: Readonly<Record<EvidenceReasonCode, string>> = Object.freeze({
  [EVIDENCE_REASON_CODES.HARD_CONTRADICTION_PRESENT]:
    "A valid hard contradiction blocks a compatible conclusion.",
  [EVIDENCE_REASON_CODES.INTERNAL_CONFLICT_PRESENT]:
    "Internal inconsistency requires human review before a compatible conclusion.",
  [EVIDENCE_REASON_CODES.MIXED_SUPPORT_AND_CONFLICT]:
    "Relevant support and conflict coexist and require human review.",
  [EVIDENCE_REASON_CODES.RELEVANT_SOFT_CONTRADICTION_PRESENT]:
    "A relevant soft contradiction creates ambiguity that requires human review.",
  [EVIDENCE_REASON_CODES.MEANINGFUL_HIGH_DISCRIMINATION_SUPPORT]:
    "High-discrimination support is available without a hard contradiction; this does not confirm identity.",
  [EVIDENCE_REASON_CODES.INDEPENDENT_CORROBORATION_PRESENT]:
    "At least one high-value signal has proven independent multi-source corroboration.",
  [EVIDENCE_REASON_CODES.GENERIC_SUPPORT_ONLY]:
    "Available compatibility signals are generic or have limited information gain.",
  [EVIDENCE_REASON_CODES.INSUFFICIENT_DISCRIMINATIVE_EVIDENCE]:
    "Available data does not provide enough discriminative evidence for a compatible conclusion.",
  [EVIDENCE_REASON_CODES.UNKNOWN_INFORMATION_IS_NEUTRAL]:
    "Unknown information provides neither support nor contradiction.",
});

function summarizeCorroboration(signals: readonly EvidenceSignal[]): CorroborationCategory {
  if (signals.some((signal) => signal.corroboration === CORROBORATION_CATEGORIES.CONFLICTING_SOURCES)) {
    return CORROBORATION_CATEGORIES.CONFLICTING_SOURCES;
  }
  if (
    signals.some(
      (signal) => signal.corroboration === CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE
    )
  ) {
    return CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE;
  }
  if (signals.some((signal) => signal.corroboration === CORROBORATION_CATEGORIES.MULTI_SOURCE)) {
    return CORROBORATION_CATEGORIES.MULTI_SOURCE;
  }
  if (signals.some((signal) => signal.corroboration === CORROBORATION_CATEGORIES.SINGLE_SOURCE)) {
    return CORROBORATION_CATEGORIES.SINGLE_SOURCE;
  }
  return CORROBORATION_CATEGORIES.NONE;
}

function isHighValue(signal: EvidenceSignal): boolean {
  return (
    isSupportSignal(signal) &&
    (signal.discriminativePower === DISCRIMINATIVE_POWERS.HIGH ||
      signal.discriminativePower === DISCRIMINATIVE_POWERS.VERY_HIGH) &&
    (signal.informationGain === INFORMATION_GAIN_CATEGORIES.HIGH ||
      signal.informationGain === INFORMATION_GAIN_CATEGORIES.VERY_HIGH)
  );
}

/** Categorical, explainable assessment engine. It contains no numeric score or probability. */
export class EvidenceAssessmentEngine {
  static assess(input: EvidenceAssessmentInput): InvestigativeAssessment {
    const subjectPair = Object.freeze({
      leftPersonId: input.entityResolutionResult.leftCandidateId,
      rightPersonId: input.entityResolutionResult.rightCandidateId,
    });
    const signals = Object.freeze([
      ...evaluateEntityResolutionSignals(
        input.entityResolutionResult,
        input.facts,
        input.sources
      ),
      ...evaluateTemporalSignals(
        input.temporalAnalysisResult,
        subjectPair,
        input.facts,
        input.sources,
        input.evidenceMetadata
      ),
    ]);
    const highValueSignals = Object.freeze(signals.filter(isHighValue));
    const hardContradictions = Object.freeze(
      signals.filter((signal) => signal.contradiction === CONTRADICTION_SEVERITIES.HARD)
    );
    const softContradictions = Object.freeze(
      signals.filter((signal) => signal.contradiction === CONTRADICTION_SEVERITIES.SOFT)
    );
    const dataSufficiency = evaluateDataSufficiency(signals);
    const corroborationSummary = summarizeCorroboration(signals);
    const decision = applyConclusionRules(signals, highValueSignals, dataSufficiency);
    const reasonCodes = new Set(decision.reasonCodes);
    if (corroborationSummary === CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE) {
      reasonCodes.add(EVIDENCE_REASON_CODES.INDEPENDENT_CORROBORATION_PRESENT);
    }
    const explanations: readonly InvestigativeExplanation[] = Object.freeze(
      [...reasonCodes].map((reasonCode) =>
        Object.freeze({ reasonCode, message: EXPLANATION_MESSAGES[reasonCode] })
      )
    );
    const issues = Object.freeze(
      input.entityResolutionResult.issues.map((issue) => {
        const relatedSignal = signals.find(
          (signal) => signal.outcome === issue.code && signal.attribute === issue.attribute
        );
        return Object.freeze({
          code: issue.code,
          attribute: issue.attribute,
          signalIds: Object.freeze(relatedSignal ? [relatedSignal.signalId] : []),
          factIds: Object.freeze([...issue.sourceFactIds]),
        });
      })
    );

    return Object.freeze({
      caseId: input.caseId,
      subjectPair,
      signals,
      highValueSignals,
      hardContradictions,
      softContradictions,
      corroborationSummary,
      dataSufficiency,
      conclusion: decision.conclusion,
      explanations,
      issues,
    });
  }
}
