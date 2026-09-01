import {
  COMPARISON_OUTCOMES,
  DISCRIMINATIVE_POWERS,
} from "@/intelligence/entity-resolution";
import {
  CORROBORATION_CATEGORIES,
  DATA_SUFFICIENCY_LEVELS,
  EVIDENCE_SIGNAL_TYPES,
  type DataSufficiency,
  type EvidenceSignal,
} from "../model/evidence-assessment-model";

function isSupport(signal: EvidenceSignal): boolean {
  return (
    (signal.type === EVIDENCE_SIGNAL_TYPES.ATTRIBUTE_MATCH ||
      signal.type === EVIDENCE_SIGNAL_TYPES.TEMPORAL_COMPATIBILITY) &&
    (signal.outcome === COMPARISON_OUTCOMES.MATCH ||
      signal.outcome === COMPARISON_OUTCOMES.PARTIAL_MATCH ||
      signal.type === EVIDENCE_SIGNAL_TYPES.TEMPORAL_COMPATIBILITY)
  );
}
/** Named semantic coverage rules; signal volume is never converted to a score. */
export function evaluateDataSufficiency(signals: readonly EvidenceSignal[]): DataSufficiency {
  const support = signals.filter(isSupport);
  const highAttributes = new Set(
    support
      .filter(
        (signal) =>
          signal.discriminativePower === DISCRIMINATIVE_POWERS.HIGH ||
          signal.discriminativePower === DISCRIMINATIVE_POWERS.VERY_HIGH
      )
      .map((signal) => signal.attribute)
  );
  const mediumAttributes = new Set(
    support
      .filter((signal) => signal.discriminativePower === DISCRIMINATIVE_POWERS.MEDIUM)
      .map((signal) => signal.attribute)
  );
  const supportedAttributes = new Set(support.map((signal) => signal.attribute));
  const independentHighValue = support.some(
    (signal) =>
      (signal.discriminativePower === DISCRIMINATIVE_POWERS.HIGH ||
        signal.discriminativePower === DISCRIMINATIVE_POWERS.VERY_HIGH) &&
      signal.corroboration === CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE
  );

  if (highAttributes.size >= 2 && independentHighValue) {
    return DATA_SUFFICIENCY_LEVELS.STRONG_COVERAGE;
  }
  if (highAttributes.size >= 2 || (highAttributes.size >= 1 && mediumAttributes.size >= 1)) {
    return DATA_SUFFICIENCY_LEVELS.ADEQUATE;
  }
  if (highAttributes.size >= 1 || supportedAttributes.size >= 2) {
    return DATA_SUFFICIENCY_LEVELS.MINIMAL;
  }
  return DATA_SUFFICIENCY_LEVELS.INSUFFICIENT;
}

export function isSupportSignal(signal: EvidenceSignal): boolean {
  return isSupport(signal);
}
