import { ContradictionSeverity, FactId } from "@/domain";

export const TEMPORAL_CONTRADICTION_REASONS = {
  EXACT_TIMESTAMP_CONFLICT: "EXACT_TIMESTAMP_CONFLICT",
  NON_OVERLAPPING_EXCLUSIVE_INTERVALS: "NON_OVERLAPPING_EXCLUSIVE_INTERVALS",
  IMPOSSIBLE_SEQUENCE: "IMPOSSIBLE_SEQUENCE",
} as const;

export type TemporalContradictionReason =
  (typeof TEMPORAL_CONTRADICTION_REASONS)[keyof typeof TEMPORAL_CONTRADICTION_REASONS];

export interface TemporalContradictionProps {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly severity: ContradictionSeverity;
  readonly reasonCode: TemporalContradictionReason;
  readonly explanation: string;
  readonly sourceFactIds?: readonly FactId[];
}

export class TemporalContradiction {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly severity: ContradictionSeverity;
  readonly reasonCode: TemporalContradictionReason;
  readonly explanation: string;
  readonly sourceFactIds: readonly FactId[];

  constructor(props: TemporalContradictionProps) {
    this.leftEventId = props.leftEventId;
    this.rightEventId = props.rightEventId;
    this.severity = props.severity;
    this.reasonCode = props.reasonCode;
    this.explanation = props.explanation;
    this.sourceFactIds = props.sourceFactIds ?? [];
  }
}