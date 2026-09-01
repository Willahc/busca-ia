import type {
  CaseId,
  EpistemicStatus,
  EvidenceId,
  Fact,
  FactId,
  Source,
  SourceId,
} from "@/domain";
import type {
  ContradictionSeverity,
  DiscriminativePower,
  EntityResolutionResult,
} from "@/intelligence/entity-resolution";
import type { TemporalAnalysisResult } from "@/intelligence/temporal";

export const EVIDENCE_SIGNAL_TYPES = {
  ATTRIBUTE_MATCH: "ATTRIBUTE_MATCH",
  ATTRIBUTE_MISMATCH: "ATTRIBUTE_MISMATCH",
  TEMPORAL_COMPATIBILITY: "TEMPORAL_COMPATIBILITY",
  TEMPORAL_CONTRADICTION: "TEMPORAL_CONTRADICTION",
  CORROBORATING_FACT: "CORROBORATING_FACT",
  CONTRADICTING_FACT: "CONTRADICTING_FACT",
  SOURCE_SUPPORT: "SOURCE_SUPPORT",
  SOURCE_CONFLICT: "SOURCE_CONFLICT",
  INTERNAL_CONFLICT: "INTERNAL_CONFLICT",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type EvidenceSignalType =
  (typeof EVIDENCE_SIGNAL_TYPES)[keyof typeof EVIDENCE_SIGNAL_TYPES];

export const COMPATIBILITY_CATEGORIES = {
  COMPATIBLE: "COMPATIBLE",
  PARTIALLY_COMPATIBLE: "PARTIALLY_COMPATIBLE",
  INCOMPATIBLE: "INCOMPATIBLE",
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type CompatibilityCategory =
  (typeof COMPATIBILITY_CATEGORIES)[keyof typeof COMPATIBILITY_CATEGORIES];

export const STRENGTH_CATEGORIES = {
  NEGLIGIBLE: "NEGLIGIBLE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  STRONG: "STRONG",
  VERY_STRONG: "VERY_STRONG",
} as const;

export type StrengthCategory =
  (typeof STRENGTH_CATEGORIES)[keyof typeof STRENGTH_CATEGORIES];

export const SOURCE_TRUST_CATEGORIES = {
  OFFICIAL: "OFFICIAL",
  INSTITUTIONAL: "INSTITUTIONAL",
  DIRECT_WITNESS: "DIRECT_WITNESS",
  FIRST_PARTY: "FIRST_PARTY",
  SECONDARY: "SECONDARY",
  UNVERIFIED: "UNVERIFIED",
  SYNTHETIC: "SYNTHETIC",
  UNKNOWN: "UNKNOWN",
} as const;

export type SourceTrustCategory =
  (typeof SOURCE_TRUST_CATEGORIES)[keyof typeof SOURCE_TRUST_CATEGORIES];

export const CORROBORATION_CATEGORIES = {
  NONE: "NONE",
  SINGLE_SOURCE: "SINGLE_SOURCE",
  MULTI_SOURCE: "MULTI_SOURCE",
  INDEPENDENT_MULTI_SOURCE: "INDEPENDENT_MULTI_SOURCE",
  CONFLICTING_SOURCES: "CONFLICTING_SOURCES",
} as const;

export type CorroborationCategory =
  (typeof CORROBORATION_CATEGORIES)[keyof typeof CORROBORATION_CATEGORIES];

export const INFORMATION_GAIN_CATEGORIES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
} as const;

export type InformationGainCategory =
  (typeof INFORMATION_GAIN_CATEGORIES)[keyof typeof INFORMATION_GAIN_CATEGORIES];

export const DATA_SUFFICIENCY_LEVELS = {
  INSUFFICIENT: "INSUFFICIENT",
  MINIMAL: "MINIMAL",
  ADEQUATE: "ADEQUATE",
  STRONG_COVERAGE: "STRONG_COVERAGE",
} as const;

export type DataSufficiency =
  (typeof DATA_SUFFICIENCY_LEVELS)[keyof typeof DATA_SUFFICIENCY_LEVELS];

export const INVESTIGATIVE_CONCLUSIONS = {
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  INCOMPATIBLE: "INCOMPATIBLE",
  COMPATIBLE_LOW_EVIDENCE: "COMPATIBLE_LOW_EVIDENCE",
  COMPATIBLE_MEANINGFUL_EVIDENCE: "COMPATIBLE_MEANINGFUL_EVIDENCE",
  REQUIRES_HUMAN_REVIEW: "REQUIRES_HUMAN_REVIEW",
} as const;

export type InvestigativeConclusion =
  (typeof INVESTIGATIVE_CONCLUSIONS)[keyof typeof INVESTIGATIVE_CONCLUSIONS];

export const EVIDENCE_REASON_CODES = {
  HARD_CONTRADICTION_PRESENT: "HARD_CONTRADICTION_PRESENT",
  INTERNAL_CONFLICT_PRESENT: "INTERNAL_CONFLICT_PRESENT",
  MIXED_SUPPORT_AND_CONFLICT: "MIXED_SUPPORT_AND_CONFLICT",
  RELEVANT_SOFT_CONTRADICTION_PRESENT: "RELEVANT_SOFT_CONTRADICTION_PRESENT",
  MEANINGFUL_HIGH_DISCRIMINATION_SUPPORT: "MEANINGFUL_HIGH_DISCRIMINATION_SUPPORT",
  INDEPENDENT_CORROBORATION_PRESENT: "INDEPENDENT_CORROBORATION_PRESENT",
  GENERIC_SUPPORT_ONLY: "GENERIC_SUPPORT_ONLY",
  INSUFFICIENT_DISCRIMINATIVE_EVIDENCE: "INSUFFICIENT_DISCRIMINATIVE_EVIDENCE",
  UNKNOWN_INFORMATION_IS_NEUTRAL: "UNKNOWN_INFORMATION_IS_NEUTRAL",
} as const;

export type EvidenceReasonCode =
  (typeof EVIDENCE_REASON_CODES)[keyof typeof EVIDENCE_REASON_CODES];

export const EVIDENCE_SIGNAL_NOTE_CODES = {
  SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH: "SOURCE_TRUST_IS_CONTEXT_NOT_TRUTH",
  TEMPORAL_COMPATIBILITY_IS_NOT_IDENTITY_CONFIRMATION:
    "TEMPORAL_COMPATIBILITY_IS_NOT_IDENTITY_CONFIRMATION",
  DERIVED_FROM_SHARED_PROVENANCE: "DERIVED_FROM_SHARED_PROVENANCE",
  INDEPENDENCE_NOT_PROVEN: "INDEPENDENCE_NOT_PROVEN",
  SYNTHETIC_CONTEXT: "SYNTHETIC_CONTEXT",
  UNKNOWN_IS_NEUTRAL: "UNKNOWN_IS_NEUTRAL",
} as const;

export type EvidenceSignalNoteCode =
  (typeof EVIDENCE_SIGNAL_NOTE_CODES)[keyof typeof EVIDENCE_SIGNAL_NOTE_CODES];

export interface EvidenceSubjectPair {
  readonly leftPersonId: string;
  readonly rightPersonId: string;
}

export interface SourceTrustReference {
  readonly sourceId: SourceId;
  readonly category: SourceTrustCategory;
}

export interface EvidenceSignal {
  readonly signalId: string;
  readonly type: EvidenceSignalType;
  readonly subject: EvidenceSubjectPair;
  readonly attribute: string;
  readonly outcome: string;
  readonly compatibility: CompatibilityCategory;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceIds: readonly SourceId[];
  readonly factIds: readonly FactId[];
  readonly evidenceIds: readonly EvidenceId[];
  readonly strengthCategory: StrengthCategory;
  readonly discriminativePower: DiscriminativePower;
  readonly sourceTrust: readonly SourceTrustReference[];
  readonly corroboration: CorroborationCategory;
  readonly contradiction: ContradictionSeverity;
  readonly informationGain: InformationGainCategory;
  readonly notes: readonly EvidenceSignalNoteCode[];
}

export interface InvestigativeExplanation {
  readonly reasonCode: EvidenceReasonCode;
  readonly message: string;
}

export interface InvestigativeIssue {
  readonly code: string;
  readonly attribute?: string;
  readonly signalIds: readonly string[];
  readonly factIds: readonly FactId[];
}

export interface InvestigativeAssessment {
  readonly caseId: CaseId;
  readonly subjectPair: EvidenceSubjectPair;
  readonly signals: readonly EvidenceSignal[];
  readonly highValueSignals: readonly EvidenceSignal[];
  readonly hardContradictions: readonly EvidenceSignal[];
  readonly softContradictions: readonly EvidenceSignal[];
  readonly corroborationSummary: CorroborationCategory;
  readonly dataSufficiency: DataSufficiency;
  readonly conclusion: InvestigativeConclusion;
  readonly explanations: readonly InvestigativeExplanation[];
  readonly issues: readonly InvestigativeIssue[];
}

export interface EvidenceAssessmentInput {
  readonly caseId: CaseId;
  readonly entityResolutionResult: EntityResolutionResult;
  readonly facts: readonly Fact[];
  readonly sources: readonly Source[];
  readonly evidenceMetadata?: readonly EvidenceReferenceMetadata[];
  readonly temporalAnalysisResult?: TemporalAnalysisResult;
}

export interface EvidenceReferenceMetadata {
  readonly evidenceId: EvidenceId;
  readonly sourceId: SourceId;
  readonly epistemicStatus: EpistemicStatus;
}
