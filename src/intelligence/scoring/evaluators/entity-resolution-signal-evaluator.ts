import {
  EPISTEMIC_STATUS,
  type Fact,
  type FactId,
  type Source,
  type SourceId,
} from "@/domain";
import {
  COMPARISON_OUTCOMES,
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
  type AttributeComparison,
  type EntityResolutionResult,
  ENTITY_RESOLUTION_ISSUE_CODES,
} from "@/intelligence/entity-resolution";
import { informationGainForAttribute } from "../dimensions/information-gain";
import { resolveSourceTrust } from "../dimensions/source-trust";
import {
  CORROBORATION_CATEGORIES,
  COMPATIBILITY_CATEGORIES,
  EVIDENCE_SIGNAL_NOTE_CODES,
  EVIDENCE_SIGNAL_TYPES,
  STRENGTH_CATEGORIES,
  type EvidenceSignal,
  type EvidenceSignalNoteCode,
  type EvidenceSubjectPair,
  type StrengthCategory,
} from "../model/evidence-assessment-model";
import { combineEpistemicStatuses } from "../rules/epistemic-rules";
import { rootFactIdsFor } from "../rules/provenance-rules";
import { evaluateCorroboration } from "./corroboration-evaluator";

function strengthFor(comparison: AttributeComparison): StrengthCategory {
  if (
    comparison.outcome === COMPARISON_OUTCOMES.UNKNOWN ||
    comparison.outcome === COMPARISON_OUTCOMES.NOT_APPLICABLE
  ) {
    return STRENGTH_CATEGORIES.NEGLIGIBLE;
  }
  if (comparison.contradictionSeverity === CONTRADICTION_SEVERITIES.HARD) {
    return STRENGTH_CATEGORIES.VERY_STRONG;
  }
  if (comparison.outcome === COMPARISON_OUTCOMES.MISMATCH) {
    return comparison.discriminativePower === DISCRIMINATIVE_POWERS.LOW
      ? STRENGTH_CATEGORIES.LOW
      : STRENGTH_CATEGORIES.MODERATE;
  }
  if (comparison.outcome === COMPARISON_OUTCOMES.PARTIAL_MATCH) {
    return comparison.discriminativePower === DISCRIMINATIVE_POWERS.LOW
      ? STRENGTH_CATEGORIES.LOW
      : STRENGTH_CATEGORIES.MODERATE;
  }
  switch (comparison.discriminativePower) {
    case DISCRIMINATIVE_POWERS.VERY_HIGH:
      return STRENGTH_CATEGORIES.VERY_STRONG;
    case DISCRIMINATIVE_POWERS.HIGH:
      return STRENGTH_CATEGORIES.STRONG;
    case DISCRIMINATIVE_POWERS.MEDIUM:
      return STRENGTH_CATEGORIES.MODERATE;
    default:
      return STRENGTH_CATEGORIES.LOW;
  }
}

function signalTypeFor(comparison: AttributeComparison) {
  if (
    comparison.outcome === COMPARISON_OUTCOMES.UNKNOWN ||
    comparison.outcome === COMPARISON_OUTCOMES.NOT_APPLICABLE
  ) {
    return EVIDENCE_SIGNAL_TYPES.INSUFFICIENT_DATA;
  }
  return comparison.outcome === COMPARISON_OUTCOMES.MISMATCH
    ? EVIDENCE_SIGNAL_TYPES.ATTRIBUTE_MISMATCH
    : EVIDENCE_SIGNAL_TYPES.ATTRIBUTE_MATCH;
}

function compatibilityFor(comparison: AttributeComparison) {
  switch (comparison.outcome) {
    case COMPARISON_OUTCOMES.MATCH:
      return COMPATIBILITY_CATEGORIES.COMPATIBLE;
    case COMPARISON_OUTCOMES.PARTIAL_MATCH:
      return COMPATIBILITY_CATEGORIES.PARTIALLY_COMPATIBLE;
    case COMPARISON_OUTCOMES.MISMATCH:
      return COMPATIBILITY_CATEGORIES.INCOMPATIBLE;
    case COMPARISON_OUTCOMES.NOT_APPLICABLE:
      return COMPATIBILITY_CATEGORIES.NOT_APPLICABLE;
    default:
      return COMPATIBILITY_CATEGORIES.UNKNOWN;
  }
}

function notesFor(
  comparison: AttributeComparison,
  facts: readonly Fact[],
  corroboration: EvidenceSignal["corroboration"]
): readonly EvidenceSignalNoteCode[] {
  const notes = new Set<EvidenceSignalNoteCode>([
    EVIDENCE_SIGNAL_NOTE_CODES.SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH,
  ]);
  if (comparison.outcome === COMPARISON_OUTCOMES.UNKNOWN) {
    notes.add(EVIDENCE_SIGNAL_NOTE_CODES.UNKNOWN_IS_NEUTRAL);
  }
  if (
    comparison.epistemicStatusLeft === EPISTEMIC_STATUS.SYNTHETIC ||
    comparison.epistemicStatusRight === EPISTEMIC_STATUS.SYNTHETIC
  ) {
    notes.add(EVIDENCE_SIGNAL_NOTE_CODES.SYNTHETIC_CONTEXT);
  }
  if (
    corroboration === CORROBORATION_CATEGORIES.MULTI_SOURCE &&
    [...comparison.sourceFactIdsLeft, ...comparison.sourceFactIdsRight].some((id) =>
      facts.find((fact) => fact.id === id)?.provenance.hasParentFacts()
    )
  ) {
    notes.add(EVIDENCE_SIGNAL_NOTE_CODES.DERIVED_FROM_SHARED_PROVENANCE);
  } else if (corroboration === CORROBORATION_CATEGORIES.MULTI_SOURCE) {
    notes.add(EVIDENCE_SIGNAL_NOTE_CODES.INDEPENDENCE_NOT_PROVEN);
  }
  return Object.freeze([...notes]);
}

function comparisonFingerprint(comparison: AttributeComparison, facts: readonly Fact[]): string {
  const roots = rootFactIdsFor(
    [...comparison.sourceFactIdsLeft, ...comparison.sourceFactIdsRight],
    facts
  );
  return [
    comparison.attribute,
    comparison.outcome,
    comparison.contradictionSeverity,
    roots.join("|"),
  ].join(":");
}

export function evaluateEntityResolutionSignals(
  result: EntityResolutionResult,
  facts: readonly Fact[],
  sources: readonly Source[]
): readonly EvidenceSignal[] {
  const subject: EvidenceSubjectPair = Object.freeze({
    leftPersonId: result.leftCandidateId,
    rightPersonId: result.rightCandidateId,
  });
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const fingerprints = new Set<string>();
  const signals: EvidenceSignal[] = [];

  for (const comparison of result.comparisons) {
    const fingerprint = comparisonFingerprint(comparison, facts);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);

    const factIds = Object.freeze([
      ...new Set<FactId>([
        ...comparison.sourceFactIdsLeft,
        ...comparison.sourceFactIdsRight,
      ]),
    ]);
    const sourceIds = Object.freeze([
      ...new Set<SourceId>(
        factIds
          .map((factId) => factById.get(factId)?.provenance.sourceId)
          .filter((sourceId): sourceId is SourceId => sourceId !== undefined)
      ),
    ]);
    const corroboration = evaluateCorroboration(
      comparison.sourceFactIdsLeft,
      comparison.sourceFactIdsRight,
      sourceIds,
      facts,
      comparison.outcome === COMPARISON_OUTCOMES.MISMATCH
    );

    signals.push(
      Object.freeze({
        signalId: `ER:${signals.length + 1}:${comparison.attribute}`,
        type: signalTypeFor(comparison),
        subject,
        attribute: comparison.attribute,
        outcome: comparison.outcome,
        compatibility: compatibilityFor(comparison),
        epistemicStatus: combineEpistemicStatuses([
          comparison.epistemicStatusLeft,
          comparison.epistemicStatusRight,
        ]),
        sourceIds,
        factIds,
        evidenceIds: Object.freeze([]),
        strengthCategory: strengthFor(comparison),
        discriminativePower: comparison.discriminativePower,
        sourceTrust: Object.freeze(
          sourceIds.map((sourceId) =>
            Object.freeze({
              sourceId,
              category: resolveSourceTrust(sourceById.get(sourceId)),
            })
          )
        ),
        corroboration,
        contradiction: comparison.contradictionSeverity,
        informationGain: informationGainForAttribute(
          comparison.attribute,
          comparison.discriminativePower
        ),
        notes: notesFor(comparison, facts, corroboration),
      })
    );
  }

  for (const issue of result.issues) {
    const internalConflict =
      issue.code === ENTITY_RESOLUTION_ISSUE_CODES.INTERNAL_ATTRIBUTE_CONFLICT;
    const factIds = Object.freeze([...new Set(issue.sourceFactIds)]);
    const sourceIds = Object.freeze([
      ...new Set<SourceId>(
        factIds
          .map((factId) => factById.get(factId)?.provenance.sourceId)
          .filter((sourceId): sourceId is SourceId => sourceId !== undefined)
      ),
    ]);
    signals.push(
      Object.freeze({
        signalId: `ER:ISSUE:${signals.length + 1}:${issue.attribute}`,
        type: internalConflict
          ? EVIDENCE_SIGNAL_TYPES.INTERNAL_CONFLICT
          : EVIDENCE_SIGNAL_TYPES.INSUFFICIENT_DATA,
        subject,
        attribute: issue.attribute,
        outcome: issue.code,
        compatibility: COMPATIBILITY_CATEGORIES.UNKNOWN,
        epistemicStatus: combineEpistemicStatuses(
          factIds.map((factId) => factById.get(factId)?.epistemicStatus)
        ),
        sourceIds,
        factIds,
        evidenceIds: Object.freeze([]),
        strengthCategory: internalConflict
          ? STRENGTH_CATEGORIES.STRONG
          : STRENGTH_CATEGORIES.NEGLIGIBLE,
        discriminativePower: DISCRIMINATIVE_POWERS.HIGH,
        sourceTrust: Object.freeze(
          sourceIds.map((sourceId) =>
            Object.freeze({ sourceId, category: resolveSourceTrust(sourceById.get(sourceId)) })
          )
        ),
        corroboration: evaluateCorroboration(
          factIds,
          factIds,
          sourceIds,
          facts,
          internalConflict
        ),
        contradiction: internalConflict
          ? CONTRADICTION_SEVERITIES.SOFT
          : CONTRADICTION_SEVERITIES.NONE,
        informationGain: informationGainForAttribute(
          issue.attribute,
          DISCRIMINATIVE_POWERS.HIGH
        ),
        notes: Object.freeze([
          EVIDENCE_SIGNAL_NOTE_CODES.SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH,
        ]),
      })
    );
  }

  return Object.freeze(signals);
}
