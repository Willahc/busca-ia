import type { EpistemicStatus, FactId, PersonId, SourceId } from "@/domain";

export const ENTITY_RESOLUTION_ATTRIBUTES = {
  FULL_NAME: "FULL_NAME",
  BIRTH_DATE: "BIRTH_DATE",
  SEX: "SEX",
  MOTHER_NAME: "MOTHER_NAME",
  FATHER_NAME: "FATHER_NAME",
  NATIONALITY: "NATIONALITY",
  DISTINCTIVE_MARK: "DISTINCTIVE_MARK",
} as const;

export type EntityResolutionAttribute =
  (typeof ENTITY_RESOLUTION_ATTRIBUTES)[keyof typeof ENTITY_RESOLUTION_ATTRIBUTES];

export const FACT_ATTRIBUTE_REGISTRY: Readonly<Record<string, EntityResolutionAttribute>> =
  Object.freeze({
    "person.full_name": ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME,
    "person.birth_date": ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE,
    "person.sex": ENTITY_RESOLUTION_ATTRIBUTES.SEX,
    "person.mother_name": ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
    "person.father_name": ENTITY_RESOLUTION_ATTRIBUTES.FATHER_NAME,
    "person.nationality": ENTITY_RESOLUTION_ATTRIBUTES.NATIONALITY,
    "person.distinctive_mark": ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK,
  });

/** Controlled case-level Fact used to bind an additional Person to an analysis context. */
export const ENTITY_RESOLUTION_CASE_CANDIDATE_FACT =
  "case.entity_resolution_candidate_person_id";

export const COMPARISON_OUTCOMES = {
  MATCH: "MATCH",
  PARTIAL_MATCH: "PARTIAL_MATCH",
  MISMATCH: "MISMATCH",
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type ComparisonOutcome =
  (typeof COMPARISON_OUTCOMES)[keyof typeof COMPARISON_OUTCOMES];

export const DISCRIMINATIVE_POWERS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
} as const;

export type DiscriminativePower =
  (typeof DISCRIMINATIVE_POWERS)[keyof typeof DISCRIMINATIVE_POWERS];

export const CONTRADICTION_SEVERITIES = {
  NONE: "NONE",
  SOFT: "SOFT",
  HARD: "HARD",
} as const;

export type ContradictionSeverity =
  (typeof CONTRADICTION_SEVERITIES)[keyof typeof CONTRADICTION_SEVERITIES];

export const ENTITY_RESOLUTION_CONCLUSIONS = {
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  COMPATIBLE: "COMPATIBLE",
  INCOMPATIBLE: "INCOMPATIBLE",
  REQUIRES_HUMAN_REVIEW: "REQUIRES_HUMAN_REVIEW",
} as const;

export type EntityResolutionConclusion =
  (typeof ENTITY_RESOLUTION_CONCLUSIONS)[keyof typeof ENTITY_RESOLUTION_CONCLUSIONS];

export interface AttributeAssertion<T = unknown> {
  readonly attribute: EntityResolutionAttribute;
  readonly value: T;
  readonly factId: FactId;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceId: SourceId;
}

export interface CandidateAttribute {
  readonly attribute: EntityResolutionAttribute;
  readonly assertions: readonly AttributeAssertion[];
}

export interface EntityResolutionCandidate {
  readonly candidateId: string;
  readonly personId?: PersonId;
  readonly attributes: readonly CandidateAttribute[];
  readonly sourceReferences: readonly SourceId[];
  readonly issues: readonly EntityResolutionIssue[];
}

export interface AttributeComparison {
  readonly attribute: EntityResolutionAttribute;
  readonly leftValue: unknown | null;
  readonly rightValue: unknown | null;
  readonly outcome: ComparisonOutcome;
  readonly discriminativePower: DiscriminativePower;
  readonly contradictionSeverity: ContradictionSeverity;
  readonly reasonCode: string;
  readonly sourceFactIdsLeft: readonly FactId[];
  readonly sourceFactIdsRight: readonly FactId[];
  readonly epistemicStatusLeft: EpistemicStatus | null;
  readonly epistemicStatusRight: EpistemicStatus | null;
}

export const ENTITY_RESOLUTION_ISSUE_CODES = {
  INTERNAL_ATTRIBUTE_CONFLICT: "INTERNAL_ATTRIBUTE_CONFLICT",
  INVALID_ATTRIBUTE_ASSERTION: "INVALID_ATTRIBUTE_ASSERTION",
} as const;

export type EntityResolutionIssueCode =
  (typeof ENTITY_RESOLUTION_ISSUE_CODES)[keyof typeof ENTITY_RESOLUTION_ISSUE_CODES];

export interface EntityResolutionIssue {
  readonly code: EntityResolutionIssueCode;
  readonly candidateId: string;
  readonly attribute: EntityResolutionAttribute;
  readonly sourceFactIds: readonly FactId[];
}

export interface EntityResolutionResult {
  readonly leftCandidateId: string;
  readonly rightCandidateId: string;
  readonly comparisons: readonly AttributeComparison[];
  readonly matches: readonly AttributeComparison[];
  readonly mismatches: readonly AttributeComparison[];
  readonly unknowns: readonly AttributeComparison[];
  readonly hardContradictions: readonly AttributeComparison[];
  readonly softContradictions: readonly AttributeComparison[];
  readonly highDiscriminationMatches: readonly AttributeComparison[];
  readonly conclusion: EntityResolutionConclusion;
  readonly issues: readonly EntityResolutionIssue[];
}
