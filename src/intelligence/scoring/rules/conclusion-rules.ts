import { CONTRADICTION_SEVERITIES } from "@/intelligence/entity-resolution";
import {
  DATA_SUFFICIENCY_LEVELS,
  EVIDENCE_REASON_CODES,
  EVIDENCE_SIGNAL_TYPES,
  INVESTIGATIVE_CONCLUSIONS,
  type DataSufficiency,
  type EvidenceReasonCode,
  type EvidenceSignal,
  type InvestigativeConclusion,
} from "../model/evidence-assessment-model";
import { isSupportSignal } from "../evaluators/data-sufficiency-evaluator";

export const EVIDENCE_ASSESSMENT_RULES = {
  HARD_CONTRADICTION_BLOCKS_COMPATIBLE: "HARD_CONTRADICTION_BLOCKS_COMPATIBLE",
  GENERIC_MATCHES_DO_NOT_ESTABLISH_MEANINGFUL_EVIDENCE:
    "GENERIC_MATCHES_DO_NOT_ESTABLISH_MEANINGFUL_EVIDENCE",
  HIGH_DISCRIMINATION_SUPPORT_REQUIRES_NO_HARD_CONTRADICTION:
    "HIGH_DISCRIMINATION_SUPPORT_REQUIRES_NO_HARD_CONTRADICTION",
  INDEPENDENT_CORROBORATION_STRENGTHENS_EVIDENCE:
    "INDEPENDENT_CORROBORATION_STRENGTHENS_EVIDENCE",
  UNKNOWN_DOES_NOT_SUPPORT_OR_CONTRADICT: "UNKNOWN_DOES_NOT_SUPPORT_OR_CONTRADICT",
  INTERNAL_CONFLICT_REQUIRES_REVIEW: "INTERNAL_CONFLICT_REQUIRES_REVIEW",
} as const;

export interface ConclusionDecision {
  readonly conclusion: InvestigativeConclusion;
  readonly reasonCodes: readonly EvidenceReasonCode[];
}

export function applyConclusionRules(
  signals: readonly EvidenceSignal[],
  highValueSignals: readonly EvidenceSignal[],
  dataSufficiency: DataSufficiency
): ConclusionDecision {
  const hard = signals.some(
    (signal) => signal.contradiction === CONTRADICTION_SEVERITIES.HARD
  );
  if (hard) {
    return {
      conclusion: INVESTIGATIVE_CONCLUSIONS.INCOMPATIBLE,
      reasonCodes: [EVIDENCE_REASON_CODES.HARD_CONTRADICTION_PRESENT],
    };
  }

  const internalConflict = signals.some(
    (signal) => signal.type === EVIDENCE_SIGNAL_TYPES.INTERNAL_CONFLICT
  );
  if (internalConflict) {
    return {
      conclusion: INVESTIGATIVE_CONCLUSIONS.REQUIRES_HUMAN_REVIEW,
      reasonCodes: [EVIDENCE_REASON_CODES.INTERNAL_CONFLICT_PRESENT],
    };
  }

  const support = signals.filter(isSupportSignal);
  const softConflict = signals.some(
    (signal) => signal.contradiction === CONTRADICTION_SEVERITIES.SOFT
  );
  if (softConflict) {
    return {
      conclusion: INVESTIGATIVE_CONCLUSIONS.REQUIRES_HUMAN_REVIEW,
      reasonCodes: [
        support.length > 0
          ? EVIDENCE_REASON_CODES.MIXED_SUPPORT_AND_CONFLICT
          : EVIDENCE_REASON_CODES.RELEVANT_SOFT_CONTRADICTION_PRESENT,
      ],
    };
  }

  if (
    support.length === 0 ||
    dataSufficiency === DATA_SUFFICIENCY_LEVELS.INSUFFICIENT
  ) {
    return {
      conclusion: INVESTIGATIVE_CONCLUSIONS.INSUFFICIENT_DATA,
      reasonCodes: [
        EVIDENCE_REASON_CODES.INSUFFICIENT_DISCRIMINATIVE_EVIDENCE,
        EVIDENCE_REASON_CODES.UNKNOWN_INFORMATION_IS_NEUTRAL,
      ],
    };
  }

  if (
    highValueSignals.length > 0 &&
    (dataSufficiency === DATA_SUFFICIENCY_LEVELS.ADEQUATE ||
      dataSufficiency === DATA_SUFFICIENCY_LEVELS.STRONG_COVERAGE)
  ) {
    return {
      conclusion: INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_MEANINGFUL_EVIDENCE,
      reasonCodes: [EVIDENCE_REASON_CODES.MEANINGFUL_HIGH_DISCRIMINATION_SUPPORT],
    };
  }

  return {
    conclusion: INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_LOW_EVIDENCE,
    reasonCodes: [EVIDENCE_REASON_CODES.GENERIC_SUPPORT_ONLY],
  };
}
