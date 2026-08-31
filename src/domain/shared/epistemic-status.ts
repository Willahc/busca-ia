/**
 * Canonical Epistemic Status for all knowledge representations in the system.
 *
 * Distinguishes categorically between:
 * - Observed/proven facts (CONFIRMED)
 * - Calculated facts (DERIVED)
 * - Raw/unverified reports (UNVERIFIED)
 * - Analytical propositions (HYPOTHESIS)
 * - Simulated/test data (SYNTHETIC)
 */
export const EPISTEMIC_STATUS = {
  CONFIRMED: "CONFIRMED",
  DERIVED: "DERIVED",
  UNVERIFIED: "UNVERIFIED",
  HYPOTHESIS: "HYPOTHESIS",
  SYNTHETIC: "SYNTHETIC",
} as const;

export type EpistemicStatus = (typeof EPISTEMIC_STATUS)[keyof typeof EPISTEMIC_STATUS];

export function isSyntheticStatus(status: EpistemicStatus): boolean {
  return status === EPISTEMIC_STATUS.SYNTHETIC;
}

export function isConfirmedStatus(status: EpistemicStatus): boolean {
  return status === EPISTEMIC_STATUS.CONFIRMED;
}

export function isDerivedStatus(status: EpistemicStatus): boolean {
  return status === EPISTEMIC_STATUS.DERIVED;
}

export function isHypothesisStatus(status: EpistemicStatus): boolean {
  return status === EPISTEMIC_STATUS.HYPOTHESIS;
}

export function isUnverifiedStatus(status: EpistemicStatus): boolean {
  return status === EPISTEMIC_STATUS.UNVERIFIED;
}