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