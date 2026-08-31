import { CaseId, EpistemicStatus, EvidenceId, FactId, TipId } from "@/domain";
import { TemporalPoint } from "./temporal-point";
import { TemporalInterval } from "./temporal-interval";

export type TimelineEventType =
  | "MISSING_EVENT"
  | "FACT_OBSERVATION"
  | "TIP_RECEIVED"
  | "EVIDENCE_RECORDED"
  | "HYPOTHESIS_CREATED"
  | "CASE_STATUS_CHANGED"
  | "CUSTOM";

export interface TimelineEventProps {
  readonly eventId: string;
  readonly caseId: CaseId;
  readonly eventType: TimelineEventType;
  readonly label: string;
  readonly temporalExpression?: TemporalPoint | TemporalInterval;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceFactIds?: readonly FactId[];
  readonly sourceTipIds?: readonly TipId[];
  readonly sourceEvidenceIds?: readonly EvidenceId[];
  readonly derived?: boolean;
  readonly metadata?: Readonly<Record<string, string>>;
}

export class TimelineEvent {
  readonly eventId: string;
  readonly caseId: CaseId;
  readonly eventType: TimelineEventType;
  readonly label: string;
  readonly temporalExpression?: TemporalPoint | TemporalInterval;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceFactIds: readonly FactId[];
  readonly sourceTipIds: readonly TipId[];
  readonly sourceEvidenceIds: readonly EvidenceId[];
  readonly derived: boolean;
  readonly metadata: Readonly<Record<string, string>>;

  constructor(props: TimelineEventProps) {
    if (!props.eventId || props.eventId.trim().length === 0) {
      throw new Error("TimelineEvent must have a non-empty eventId");
    }
    if (!props.label || props.label.trim().length === 0) {
      throw new Error("TimelineEvent must have a non-empty label");
    }

    this.eventId = props.eventId;
    this.caseId = props.caseId;
    this.eventType = props.eventType;
    this.label = props.label;
    this.temporalExpression = props.temporalExpression;
    this.epistemicStatus = props.epistemicStatus;
    this.sourceFactIds = props.sourceFactIds ?? [];
    this.sourceTipIds = props.sourceTipIds ?? [];
    this.sourceEvidenceIds = props.sourceEvidenceIds ?? [];
    this.derived = props.derived ?? false;
    this.metadata = Object.freeze({ ...(props.metadata ?? {}) });
  }

  get isDated(): boolean {
    return (
      this.temporalExpression !== undefined &&
      this.temporalExpression.precision !== "UNKNOWN"
    );
  }
}