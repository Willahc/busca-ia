import { TemporalPoint } from "../model/temporal-point";

export type TemporalGapClassification =
  | "KNOWN_GAP"
  | "OPEN_START"
  | "OPEN_END"
  | "INSUFFICIENT_INFORMATION";

export interface TemporalGapProps {
  readonly startEventId?: string;
  readonly endEventId?: string;
  readonly start?: TemporalPoint;
  readonly end?: TemporalPoint;
  readonly durationMinutes?: number;
  readonly durationDays?: number;
  readonly classification: TemporalGapClassification;
  readonly explanation: string;
}

export class TemporalGap {
  readonly startEventId?: string;
  readonly endEventId?: string;
  readonly start?: TemporalPoint;
  readonly end?: TemporalPoint;
  readonly durationMinutes?: number;
  readonly durationDays?: number;
  readonly classification: TemporalGapClassification;
  readonly explanation: string;

  constructor(props: TemporalGapProps) {
    this.startEventId = props.startEventId;
    this.endEventId = props.endEventId;
    this.start = props.start;
    this.end = props.end;
    this.durationMinutes = props.durationMinutes;
    this.durationDays = props.durationDays;
    this.classification = props.classification;
    this.explanation = props.explanation;
  }
}