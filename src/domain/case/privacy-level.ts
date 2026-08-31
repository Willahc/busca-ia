/**
 * Canonical Privacy Levels for cases and sensitive investigative records.
 *
 * Distinct and orthogonal to WorkflowStatus, OfficialStatus, and EpistemicStatus.
 */
export const PRIVACY_LEVELS = {
  PUBLIC: "PUBLIC",
  RESTRICTED: "RESTRICTED",
  CONFIDENTIAL: "CONFIDENTIAL",
  LAW_ENFORCEMENT_ONLY: "LAW_ENFORCEMENT_ONLY",
  SEALED: "SEALED",
} as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[keyof typeof PRIVACY_LEVELS];