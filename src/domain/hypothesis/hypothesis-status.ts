/**
 * Canonical lifecycle status for an investigative hypothesis.
 */
export const HYPOTHESIS_STATUS = {
  OPEN: "OPEN",
  SUPPORTED: "SUPPORTED",
  WEAKENED: "WEAKENED",
  REJECTED: "REJECTED",
  RESOLVED: "RESOLVED",
} as const;

export type HypothesisStatus = (typeof HYPOTHESIS_STATUS)[keyof typeof HYPOTHESIS_STATUS];