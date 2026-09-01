import {
  Case,
  Evidence,
  Fact,
  Hypothesis,
  MissingEvent,
  Person,
  Source,
  Tip,
} from "@/domain";
import {
  TemporalAnalysisResult,
  TemporalContradiction,
  TemporalDerivation,
  TemporalGap,
  TemporalPoint,
  TemporalRelation,
  TimelineEvent,
  AttributeComparison,
  EvidenceSignal,
  InvestigativeAssessment,
} from "@/intelligence";
import type { ComparePersonCandidatesResult } from "@/application";

export interface SourceDto {
  readonly sourceId: string;
  readonly type: string;
  readonly label: string;
  readonly externalReference?: string;
  readonly isSynthetic: boolean;
}

export function toSourceDto(source: Source): SourceDto {
  return {
    sourceId: source.id,
    type: source.type,
    label: source.label,
    externalReference: source.externalReference,
    isSynthetic: source.isSynthetic,
  };
}

export interface PersonDto {
  readonly personId: string;
  readonly createdAt: string;
}

export function toPersonDto(person: Person): PersonDto {
  return {
    personId: person.id,
    createdAt: person.createdAt.toISOString(),
  };
}

export interface MissingEventDto {
  readonly missingEventId: string;
  readonly personId: string;
  readonly createdAt: string;
}

export function toMissingEventDto(event: MissingEvent): MissingEventDto {
  return {
    missingEventId: event.id,
    personId: event.personId,
    createdAt: event.createdAt.toISOString(),
  };
}

export interface CaseDto {
  readonly caseId: string;
  readonly personId: string;
  readonly missingEventId: string;
  readonly workflowStatus: string;
  readonly officialStatus: string;
  readonly privacyLevel: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toCaseDto(c: Case): CaseDto {
  return {
    caseId: c.id,
    personId: c.personId,
    missingEventId: c.missingEventId,
    workflowStatus: c.workflowStatus,
    officialStatus: c.officialStatus,
    privacyLevel: c.privacyLevel,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export interface ProvenanceDto {
  readonly sourceId: string;
  readonly observedAt?: string;
  readonly recordedAt: string;
  readonly recordedBy: string;
  readonly parentFactIds?: readonly string[];
  readonly note?: string;
}

export interface FactDto {
  readonly factId: string;
  readonly subjectId: string;
  readonly attribute: string;
  readonly value: unknown;
  readonly epistemicStatus: string;
  readonly provenance: ProvenanceDto;
  readonly confidence?: number;
}

export function toFactDto(fact: Fact): FactDto {
  return {
    factId: fact.id,
    subjectId: fact.subjectId,
    attribute: fact.attribute,
    value: fact.value,
    epistemicStatus: fact.epistemicStatus,
    provenance: {
      sourceId: fact.provenance.sourceId,
      observedAt: fact.provenance.observedAt?.toISOString(),
      recordedAt: fact.provenance.recordedAt.toISOString(),
      recordedBy: fact.provenance.recordedBy,
      parentFactIds: fact.provenance.parentFactIds,
      note: fact.provenance.note,
    },
    confidence: fact.confidence,
  };
}

export interface TipDto {
  readonly tipId: string;
  readonly caseId: string;
  readonly sourceId: string;
  readonly originalText: string;
  readonly receivedAt: string;
  readonly epistemicStatus: string;
  readonly provenance: ProvenanceDto;
}

export function toTipDto(tip: Tip): TipDto {
  return {
    tipId: tip.id,
    caseId: tip.caseId,
    sourceId: tip.sourceId,
    originalText: tip.originalText,
    receivedAt: tip.receivedAt.toISOString(),
    epistemicStatus: tip.epistemicStatus,
    provenance: {
      sourceId: tip.provenance.sourceId,
      observedAt: tip.provenance.observedAt?.toISOString(),
      recordedAt: tip.provenance.recordedAt.toISOString(),
      recordedBy: tip.provenance.recordedBy,
      note: tip.provenance.note,
    },
  };
}

export interface EvidenceDto {
  readonly evidenceId: string;
  readonly caseId: string;
  readonly sourceId: string;
  readonly description: string;
  readonly epistemicStatus: string;
  readonly provenance: ProvenanceDto;
  readonly createdAt: string;
}

export function toEvidenceDto(evidence: Evidence): EvidenceDto {
  return {
    evidenceId: evidence.id,
    caseId: evidence.caseId,
    sourceId: evidence.sourceId,
    description: evidence.description,
    epistemicStatus: evidence.epistemicStatus,
    provenance: {
      sourceId: evidence.provenance.sourceId,
      observedAt: evidence.provenance.observedAt?.toISOString(),
      recordedAt: evidence.provenance.recordedAt.toISOString(),
      recordedBy: evidence.provenance.recordedBy,
      note: evidence.provenance.note,
    },
    createdAt: evidence.createdAt.toISOString(),
  };
}

export interface HypothesisDto {
  readonly hypothesisId: string;
  readonly caseId: string;
  readonly statement: string;
  readonly status: string;
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toHypothesisDto(hypothesis: Hypothesis): HypothesisDto {
  return {
    hypothesisId: hypothesis.id,
    caseId: hypothesis.caseId,
    statement: hypothesis.statement,
    status: hypothesis.status,
    supportingEvidenceIds: hypothesis.supportingEvidenceIds,
    contradictingEvidenceIds: hypothesis.contradictingEvidenceIds,
    createdAt: hypothesis.createdAt.toISOString(),
    updatedAt: hypothesis.updatedAt.toISOString(),
  };
}

export interface TimelineEventDto {
  readonly eventId: string;
  readonly caseId: string;
  readonly eventType: string;
  readonly label: string;
  readonly temporalExpression?: {
    readonly precision: string;
    readonly isApproximate?: boolean;
    readonly rawExpression?: string;
    readonly minUtcIso?: string;
    readonly maxUtcIso?: string;
  };
  readonly epistemicStatus: string;
  readonly sourceFactIds: readonly string[];
  readonly sourceTipIds: readonly string[];
  readonly sourceEvidenceIds: readonly string[];
  readonly derived: boolean;
  readonly metadata: Record<string, string>;
}

export interface TemporalRelationDto {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly relation: string;
  readonly explanation: string;
}

export interface TemporalContradictionDto {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly severity: string;
  readonly reasonCode: string;
  readonly explanation: string;
  readonly sourceFactIds: readonly string[];
}

export interface TemporalGapDto {
  readonly startEventId?: string;
  readonly endEventId?: string;
  readonly durationMinutes?: number;
  readonly durationDays?: number;
  readonly classification: string;
  readonly explanation: string;
}

export interface TemporalDerivationDto {
  readonly derivationId: string;
  readonly derivedAttribute: string;
  readonly precision: string;
  readonly epistemicStatus: string;
  readonly sourceFactIds: readonly string[];
  readonly sourceEventIds: readonly string[];
  readonly explanation: string;
}

export interface TemporalAnalysisResultDto {
  readonly caseId: string;
  readonly status: string;
  readonly events: readonly TimelineEventDto[];
  readonly relations: readonly TemporalRelationDto[];
  readonly contradictions: readonly TemporalContradictionDto[];
  readonly gaps: readonly TemporalGapDto[];
  readonly derivations: readonly TemporalDerivationDto[];
  readonly unresolvedEvents: readonly TimelineEventDto[];
  readonly generatedAt?: string;
}

export function toTimelineEventDto(event: TimelineEvent): TimelineEventDto {
  let temporalExpression: TimelineEventDto["temporalExpression"] = undefined;
  if (event.temporalExpression) {
    const range = event.temporalExpression.getUtcRange();
    const isApproximate =
      event.temporalExpression instanceof TemporalPoint
        ? event.temporalExpression.isApproximate ?? false
        : false;

    temporalExpression = {
      precision: event.temporalExpression.precision,
      isApproximate,
      rawExpression: event.temporalExpression.rawExpression,
      minUtcIso: isFinite(range.minMs) ? new Date(range.minMs).toISOString() : undefined,
      maxUtcIso: isFinite(range.maxMs) ? new Date(range.maxMs).toISOString() : undefined,
    };
  }

  return {
    eventId: event.eventId,
    caseId: event.caseId,
    eventType: event.eventType,
    label: event.label,
    temporalExpression,
    epistemicStatus: event.epistemicStatus,
    sourceFactIds: event.sourceFactIds ?? [],
    sourceTipIds: event.sourceTipIds ?? [],
    sourceEvidenceIds: event.sourceEvidenceIds ?? [],
    derived: event.derived ?? false,
    metadata: event.metadata ?? {},
  };
}

export function toTemporalAnalysisResultDto(
  result: TemporalAnalysisResult
): TemporalAnalysisResultDto {
  return {
    caseId: result.caseId,
    status: result.status,
    events: result.events.map(toTimelineEventDto),
    relations: result.relations.map((r: TemporalRelation) => ({
      leftEventId: r.leftEventId,
      rightEventId: r.rightEventId,
      relation: r.relation,
      explanation: r.explanation,
    })),
    contradictions: result.contradictions.map((c: TemporalContradiction) => ({
      leftEventId: c.leftEventId,
      rightEventId: c.rightEventId,
      severity: c.severity,
      reasonCode: c.reasonCode,
      explanation: c.explanation,
      sourceFactIds: c.sourceFactIds ?? [],
    })),
    gaps: result.gaps.map((g: TemporalGap) => ({
      startEventId: g.startEventId,
      endEventId: g.endEventId,
      durationMinutes: g.durationMinutes,
      durationDays: g.durationDays,
      classification: g.classification,
      explanation: g.explanation,
    })),
    derivations: result.derivations.map((d: TemporalDerivation) => ({
      derivationId: d.derivationId,
      derivedAttribute: d.derivedAttribute,
      precision: d.precision,
      epistemicStatus: d.epistemicStatus,
      sourceFactIds: d.sourceFactIds ?? [],
      sourceEventIds: d.sourceEventIds ?? [],
      explanation: d.explanation,
    })),
    unresolvedEvents: result.unresolvedEvents.map(toTimelineEventDto),
    generatedAt: result.generatedAt ? result.generatedAt.toISOString() : undefined,
  };
}

export interface EntityResolutionComparisonDto {
  readonly attribute: string;
  readonly outcome: string;
  readonly discriminativePower: string;
  readonly contradictionSeverity: string;
  readonly reasonCode: string;
  readonly sourceFactIdsLeft: readonly string[];
  readonly sourceFactIdsRight: readonly string[];
  readonly epistemicStatusLeft: string | null;
  readonly epistemicStatusRight: string | null;
}

export interface EntityResolutionResultDto {
  readonly caseId: string;
  readonly leftCandidateId: string;
  readonly rightCandidateId: string;
  readonly conclusion: string;
  readonly comparisons: readonly EntityResolutionComparisonDto[];
  readonly hardContradictions: readonly EntityResolutionComparisonDto[];
  readonly highDiscriminationMatches: readonly EntityResolutionComparisonDto[];
  readonly unknownAttributes: readonly string[];
  readonly issues: readonly {
    code: string;
    candidateId: string;
    attribute: string;
    sourceFactIds: readonly string[];
  }[];
}

function toEntityResolutionComparisonDto(
  item: AttributeComparison
): EntityResolutionComparisonDto {
  return {
    attribute: item.attribute,
    outcome: item.outcome,
    discriminativePower: item.discriminativePower,
    contradictionSeverity: item.contradictionSeverity,
    reasonCode: item.reasonCode,
    sourceFactIdsLeft: item.sourceFactIdsLeft,
    sourceFactIdsRight: item.sourceFactIdsRight,
    epistemicStatusLeft: item.epistemicStatusLeft,
    epistemicStatusRight: item.epistemicStatusRight,
  };
}

/** Privacy-minimized DTO: compared raw/normalized values are deliberately omitted. */
export function toEntityResolutionResultDto(
  result: ComparePersonCandidatesResult
): EntityResolutionResultDto {
  return {
    caseId: result.caseId,
    leftCandidateId: result.leftCandidateId,
    rightCandidateId: result.rightCandidateId,
    conclusion: result.conclusion,
    comparisons: result.comparisons.map(toEntityResolutionComparisonDto),
    hardContradictions: result.hardContradictions.map(toEntityResolutionComparisonDto),
    highDiscriminationMatches: result.highDiscriminationMatches.map(
      toEntityResolutionComparisonDto
    ),
    unknownAttributes: [
      ...new Set(result.unknowns.map((comparison) => comparison.attribute)),
    ],
    issues: result.issues.map((issue) => ({
      code: issue.code,
      candidateId: issue.candidateId,
      attribute: issue.attribute,
      sourceFactIds: issue.sourceFactIds,
    })),
  };
}

export interface EvidenceSignalDto {
  readonly signalId: string;
  readonly type: string;
  readonly subject: {
    readonly leftPersonId: string;
    readonly rightPersonId: string;
  };
  readonly attribute: string;
  readonly outcome: string;
  readonly compatibility: string;
  readonly epistemicStatus: string;
  readonly sourceIds: readonly string[];
  readonly factIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly strengthCategory: string;
  readonly discriminativePower: string;
  readonly sourceTrust: readonly { readonly sourceId: string; readonly category: string }[];
  readonly corroboration: string;
  readonly contradiction: string;
  readonly informationGain: string;
  readonly notes: readonly string[];
}

function toEvidenceSignalDto(signal: EvidenceSignal): EvidenceSignalDto {
  return {
    signalId: signal.signalId,
    type: signal.type,
    subject: signal.subject,
    attribute: signal.attribute,
    outcome: signal.outcome,
    compatibility: signal.compatibility,
    epistemicStatus: signal.epistemicStatus,
    sourceIds: signal.sourceIds,
    factIds: signal.factIds,
    evidenceIds: signal.evidenceIds,
    strengthCategory: signal.strengthCategory,
    discriminativePower: signal.discriminativePower,
    sourceTrust: signal.sourceTrust,
    corroboration: signal.corroboration,
    contradiction: signal.contradiction,
    informationGain: signal.informationGain,
    notes: signal.notes,
  };
}

export interface InvestigativeAssessmentDto {
  readonly caseId: string;
  readonly subjectPair: { readonly leftPersonId: string; readonly rightPersonId: string };
  readonly signals: readonly EvidenceSignalDto[];
  readonly highValueSignals: readonly EvidenceSignalDto[];
  readonly hardContradictions: readonly EvidenceSignalDto[];
  readonly softContradictions: readonly EvidenceSignalDto[];
  readonly corroborationSummary: string;
  readonly dataSufficiency: string;
  readonly conclusion: string;
  readonly explanations: readonly { readonly reasonCode: string; readonly message: string }[];
  readonly issues: readonly {
    readonly code: string;
    readonly attribute?: string;
    readonly signalIds: readonly string[];
    readonly factIds: readonly string[];
  }[];
}

/** Privacy-minimized DTO: values, Tip text, Evidence descriptions and document data are absent. */
export function toInvestigativeAssessmentDto(
  assessment: InvestigativeAssessment
): InvestigativeAssessmentDto {
  return {
    caseId: assessment.caseId,
    subjectPair: assessment.subjectPair,
    signals: assessment.signals.map(toEvidenceSignalDto),
    highValueSignals: assessment.highValueSignals.map(toEvidenceSignalDto),
    hardContradictions: assessment.hardContradictions.map(toEvidenceSignalDto),
    softContradictions: assessment.softContradictions.map(toEvidenceSignalDto),
    corroborationSummary: assessment.corroborationSummary,
    dataSufficiency: assessment.dataSufficiency,
    conclusion: assessment.conclusion,
    explanations: assessment.explanations,
    issues: assessment.issues,
  };
}
