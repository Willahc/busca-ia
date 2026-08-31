/**
 * Categorization of contradiction severity.
 *
 * Distinguishes reconcilable divergences (SOFT) from mutually exclusive facts (HARD).
 */
export const CONTRADICTION_SEVERITY = {
  SOFT: "SOFT",
  HARD: "HARD",
} as const;

export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITY)[keyof typeof CONTRADICTION_SEVERITY];

export interface ContradictionEvaluation<T = unknown> {
  readonly hasContradiction: boolean;
  readonly isMissingInformation: boolean;
  readonly severity?: ContradictionSeverity;
  readonly reason?: string;
  readonly valueA?: T;
  readonly valueB?: T;
}

/**
 * Fundamental domain rule: MISSING INFORMATION IS NOT A CONTRADICTION.
 *
 * If either value is undefined or null, we do not know enough to declare a contradiction.
 */
export function evaluateAttributeComparison<T>(
  attributeName: string,
  observedValue: T | undefined | null,
  candidateValue: T | undefined | null,
  isHardMismatchPredicate?: (a: T, b: T) => boolean
): ContradictionEvaluation<T> {
  if (observedValue === undefined || observedValue === null || candidateValue === undefined || candidateValue === null) {
    return {
      hasContradiction: false,
      isMissingInformation: true,
      reason: `Attribute '${attributeName}' is missing in one or both records (absence of data is neutral).`,
      valueA: observedValue ?? undefined,
      valueB: candidateValue ?? undefined,
    };
  }

  if (observedValue === candidateValue) {
    return {
      hasContradiction: false,
      isMissingInformation: false,
      valueA: observedValue,
      valueB: candidateValue,
    };
  }

  const isHard = isHardMismatchPredicate ? isHardMismatchPredicate(observedValue, candidateValue) : false;

  return {
    hasContradiction: true,
    isMissingInformation: false,
    severity: isHard ? CONTRADICTION_SEVERITY.HARD : CONTRADICTION_SEVERITY.SOFT,
    reason: `Attribute '${attributeName}' differs between observed ('${String(observedValue)}') and candidate ('${String(candidateValue)}').`,
    valueA: observedValue,
    valueB: candidateValue,
  };
}