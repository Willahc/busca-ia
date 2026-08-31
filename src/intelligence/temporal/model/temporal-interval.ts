import { TemporalPrecision } from "../precision/temporal-precision";
import { TemporalPoint } from "./temporal-point";

export interface TemporalIntervalProps {
  readonly start?: TemporalPoint;
  readonly end?: TemporalPoint;
  readonly startInclusive?: boolean;
  readonly endInclusive?: boolean;
  readonly precision?: TemporalPrecision;
  readonly rawExpression?: string;
}

export class TemporalInterval {
  readonly start?: TemporalPoint;
  readonly end?: TemporalPoint;
  readonly startInclusive: boolean;
  readonly endInclusive: boolean;
  readonly precision: TemporalPrecision;
  readonly rawExpression?: string;

  constructor(props: TemporalIntervalProps) {
    if (!props.start && !props.end) {
      throw new Error("TemporalInterval must contain at least a start or an end point");
    }

    this.start = props.start;
    this.end = props.end;
    this.startInclusive = props.startInclusive ?? true;
    this.endInclusive = props.endInclusive ?? true;
    this.precision = props.precision ?? "INTERVAL";
    this.rawExpression = props.rawExpression;
  }

  get isOpenStart(): boolean {
    return this.start === undefined;
  }

  get isOpenEnd(): boolean {
    return this.end === undefined;
  }

  getUtcRange(): { minMs: number; maxMs: number } {
    const minMs = this.start ? this.start.getUtcRange().minMs : -Infinity;
    const maxMs = this.end ? this.end.getUtcRange().maxMs : Infinity;
    return { minMs, maxMs };
  }
}