import { EPISTEMIC_STATUS, type EpistemicStatus } from "@/domain";

/** Preserves the most restrictive context; no input status is promoted. */
export function combineEpistemicStatuses(
  statuses: readonly (EpistemicStatus | null | undefined)[]
): EpistemicStatus {
  const present = statuses.filter((status): status is EpistemicStatus => status !== null && status !== undefined);
  if (present.includes(EPISTEMIC_STATUS.SYNTHETIC)) return EPISTEMIC_STATUS.SYNTHETIC;
  if (present.includes(EPISTEMIC_STATUS.HYPOTHESIS)) return EPISTEMIC_STATUS.HYPOTHESIS;
  if (present.includes(EPISTEMIC_STATUS.UNVERIFIED)) return EPISTEMIC_STATUS.UNVERIFIED;
  if (present.includes(EPISTEMIC_STATUS.DERIVED)) return EPISTEMIC_STATUS.DERIVED;
  if (present.length > 0 && present.every((status) => status === EPISTEMIC_STATUS.CONFIRMED)) {
    return EPISTEMIC_STATUS.CONFIRMED;
  }
  return EPISTEMIC_STATUS.UNVERIFIED;
}
