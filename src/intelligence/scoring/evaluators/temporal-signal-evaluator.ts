import type { EvidenceId, Fact, FactId, Source, SourceId } from "@/domain";
import {
  CONTRADICTION_SEVERITIES,
  DISCRIMINATIVE_POWERS,
} from "@/intelligence/entity-resolution";
import type { TemporalAnalysisResult, TimelineEvent } from "@/intelligence/temporal";
import { resolveSourceTrust } from "../dimensions/source-trust";
import {
  CORROBORATION_CATEGORIES,
  COMPATIBILITY_CATEGORIES,
  EVIDENCE_SIGNAL_NOTE_CODES,
  EVIDENCE_SIGNAL_TYPES,
  INFORMATION_GAIN_CATEGORIES,
  STRENGTH_CATEGORIES,
  type EvidenceSignal,
  type EvidenceReferenceMetadata,
  type EvidenceSubjectPair,
} from "../model/evidence-assessment-model";
import { combineEpistemicStatuses } from "../rules/epistemic-rules";

function pairApplicable(
  factIds: readonly FactId[],
  facts: readonly Fact[],
  subject: EvidenceSubjectPair
): boolean {
  const subjects = new Set(
    facts.filter((fact) => factIds.includes(fact.id)).map((fact) => fact.subjectId)
  );
  return subjects.has(subject.leftPersonId) && subjects.has(subject.rightPersonId);
}

function provenanceForEvents(
  events: readonly TimelineEvent[],
  facts: readonly Fact[],
  sources: readonly Source[],
  evidenceMetadata: readonly EvidenceReferenceMetadata[],
  additionalFactIds: readonly FactId[] = []
) {
  const factIds = Object.freeze([
    ...new Set<FactId>([
      ...events.flatMap((event) => [...event.sourceFactIds]),
      ...additionalFactIds,
    ]),
  ]);
  const evidenceIds = Object.freeze([
    ...new Set<EvidenceId>(events.flatMap((event) => [...event.sourceEvidenceIds])),
  ]);
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  const evidenceById = new Map(
    evidenceMetadata.map((evidence) => [evidence.evidenceId, evidence])
  );
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const sourceIds = Object.freeze([
    ...new Set<SourceId>(
      [
        ...factIds.map((id) => factById.get(id)?.provenance.sourceId),
        ...evidenceIds.map((id) => evidenceById.get(id)?.sourceId),
      ].filter((id): id is SourceId => id !== undefined)
    ),
  ]);
  return {
    factIds,
    evidenceIds,
    sourceIds,
    epistemicStatus: combineEpistemicStatuses([
      ...events.map((event) => event.epistemicStatus),
      ...evidenceIds.map((id) => evidenceById.get(id)?.epistemicStatus),
    ]),
    sourceTrust: Object.freeze(
      sourceIds.map((sourceId) =>
        Object.freeze({ sourceId, category: resolveSourceTrust(sourceById.get(sourceId)) })
      )
    ),
  };
}

/** Only pair-linked temporal provenance is eligible; case-wide temporal facts are ignored. */
export function evaluateTemporalSignals(
  result: TemporalAnalysisResult | undefined,
  subject: EvidenceSubjectPair,
  facts: readonly Fact[],
  sources: readonly Source[],
  evidenceMetadata: readonly EvidenceReferenceMetadata[] = []
): readonly EvidenceSignal[] {
  if (!result) return Object.freeze([]);
  const eventById = new Map(result.events.map((event) => [event.eventId, event]));
  const signals: EvidenceSignal[] = [];

  for (const relation of result.relations) {
    if (relation.relation === "INDETERMINATE") continue;
    const events = [eventById.get(relation.leftEventId), eventById.get(relation.rightEventId)].filter(
      (event): event is TimelineEvent => event !== undefined
    );
    if (events.length !== 2) continue;
    const provenance = provenanceForEvents(events, facts, sources, evidenceMetadata);
    if (!pairApplicable(provenance.factIds, facts, subject)) continue;
    signals.push(
      Object.freeze({
        signalId: `TEMPORAL:RELATION:${signals.length + 1}`,
        type: EVIDENCE_SIGNAL_TYPES.TEMPORAL_COMPATIBILITY,
        subject,
        attribute: "TEMPORAL_RELATION",
        outcome: relation.relation,
        compatibility: COMPATIBILITY_CATEGORIES.COMPATIBLE,
        ...provenance,
        strengthCategory: STRENGTH_CATEGORIES.LOW,
        discriminativePower: DISCRIMINATIVE_POWERS.LOW,
        corroboration:
          provenance.sourceIds.length > 1
            ? CORROBORATION_CATEGORIES.MULTI_SOURCE
            : provenance.sourceIds.length === 1
              ? CORROBORATION_CATEGORIES.SINGLE_SOURCE
              : CORROBORATION_CATEGORIES.NONE,
        contradiction: CONTRADICTION_SEVERITIES.NONE,
        informationGain: INFORMATION_GAIN_CATEGORIES.LOW,
        notes: Object.freeze([
          EVIDENCE_SIGNAL_NOTE_CODES.SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH,
          EVIDENCE_SIGNAL_NOTE_CODES.TEMPORAL_COMPATIBILITY_IS_NOT_IDENTITY_CONFIRMATION,
        ]),
      })
    );
  }

  for (const contradiction of result.contradictions) {
    const events = [
      eventById.get(contradiction.leftEventId),
      eventById.get(contradiction.rightEventId),
    ].filter((event): event is TimelineEvent => event !== undefined);
    const provenance = provenanceForEvents(
      events,
      facts,
      sources,
      evidenceMetadata,
      contradiction.sourceFactIds
    );
    if (!pairApplicable(provenance.factIds, facts, subject)) continue;
    const hard = contradiction.severity === "HARD";
    signals.push(
      Object.freeze({
        signalId: `TEMPORAL:CONTRADICTION:${signals.length + 1}`,
        type: EVIDENCE_SIGNAL_TYPES.TEMPORAL_CONTRADICTION,
        subject,
        attribute: "TEMPORAL_RELATION",
        outcome: contradiction.reasonCode,
        compatibility: COMPATIBILITY_CATEGORIES.INCOMPATIBLE,
        ...provenance,
        strengthCategory: hard
          ? STRENGTH_CATEGORIES.VERY_STRONG
          : STRENGTH_CATEGORIES.MODERATE,
        discriminativePower: hard
          ? DISCRIMINATIVE_POWERS.HIGH
          : DISCRIMINATIVE_POWERS.MEDIUM,
        corroboration:
          provenance.sourceIds.length > 1
            ? CORROBORATION_CATEGORIES.CONFLICTING_SOURCES
            : provenance.sourceIds.length === 1
              ? CORROBORATION_CATEGORIES.SINGLE_SOURCE
              : CORROBORATION_CATEGORIES.NONE,
        contradiction: hard
          ? CONTRADICTION_SEVERITIES.HARD
          : CONTRADICTION_SEVERITIES.SOFT,
        informationGain: hard
          ? INFORMATION_GAIN_CATEGORIES.HIGH
          : INFORMATION_GAIN_CATEGORIES.MEDIUM,
        notes: Object.freeze([
          EVIDENCE_SIGNAL_NOTE_CODES.SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH,
        ]),
      })
    );
  }
  return Object.freeze(signals);
}
