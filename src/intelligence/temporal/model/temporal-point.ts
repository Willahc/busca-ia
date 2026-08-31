import { TemporalPrecision } from "../precision/temporal-precision";

export interface TemporalPointProps {
  readonly year: number;
  readonly month?: number; // 1-12
  readonly day?: number; // 1-31
  readonly timeIso?: string; // e.g. "14:30:00Z"
  readonly timestampMs?: number; // UTC epoch milliseconds if exact
  readonly precision: TemporalPrecision;
  readonly isApproximate?: boolean;
  readonly rawExpression?: string;
}

export class TemporalPoint {
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
  readonly timeIso?: string;
  readonly timestampMs?: number;
  readonly precision: TemporalPrecision;
  readonly isApproximate: boolean;
  readonly rawExpression?: string;

  constructor(props: TemporalPointProps) {
    if (props.precision === "UNKNOWN") {
      this.year = 0;
      this.precision = "UNKNOWN";
      this.isApproximate = true;
      this.rawExpression = props.rawExpression;
      return;
    }

    if (!Number.isInteger(props.year)) {
      throw new Error(`Invalid year: ${props.year}`);
    }

    if (props.month !== undefined && (props.month < 1 || props.month > 12)) {
      throw new Error(`Invalid month: ${props.month}. Must be between 1 and 12.`);
    }

    if (props.day !== undefined && (props.day < 1 || props.day > 31)) {
      throw new Error(`Invalid day: ${props.day}. Must be between 1 and 31.`);
    }

    this.year = props.year;
    this.month = props.month;
    this.day = props.day;
    this.timeIso = props.timeIso;
    this.timestampMs = props.timestampMs;
    this.precision = props.precision;
    this.isApproximate = props.isApproximate ?? false;
    this.rawExpression = props.rawExpression;
  }

  /**
   * Returns lower and upper UTC epoch milliseconds bounds for interval comparison
   */
  getUtcRange(): { minMs: number; maxMs: number } {
    if (this.timestampMs !== undefined) {
      return { minMs: this.timestampMs, maxMs: this.timestampMs };
    }

    const year = this.year;
    const month = this.month ?? 1;
    const endMonth = this.month ?? 12;
    const day = this.day ?? 1;
    const endDay = this.day ?? new Date(Date.UTC(year, endMonth, 0)).getUTCDate();

    const minMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const maxMs = Date.UTC(year, endMonth - 1, endDay, 23, 59, 59, 999);

    return { minMs, maxMs };
  }
}