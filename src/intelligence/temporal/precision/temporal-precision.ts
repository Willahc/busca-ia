export type TemporalPrecision =
  | "EXACT"
  | "DAY"
  | "MONTH"
  | "YEAR"
  | "APPROXIMATE"
  | "INTERVAL"
  | "UNKNOWN";

export const TEMPORAL_PRECISIONS = {
  EXACT: "EXACT",
  DAY: "DAY",
  MONTH: "MONTH",
  YEAR: "YEAR",
  APPROXIMATE: "APPROXIMATE",
  INTERVAL: "INTERVAL",
  UNKNOWN: "UNKNOWN",
} as const;

export const TEMPORAL_PRECISION_RANKS: Record<TemporalPrecision, number> = {
  EXACT: 5,
  DAY: 4,
  MONTH: 3,
  YEAR: 2,
  APPROXIMATE: 1,
  INTERVAL: 1,
  UNKNOWN: 0,
};