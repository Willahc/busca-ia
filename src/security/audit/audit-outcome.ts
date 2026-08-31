export const AUDIT_OUTCOMES = {
  SUCCEEDED: "SUCCEEDED",
  DENIED: "DENIED",
  FAILED: "FAILED",
} as const;

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[keyof typeof AUDIT_OUTCOMES];