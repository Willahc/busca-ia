/**
 * Internal operational/investigative workflow status within the platform.
 */
export const WORKFLOW_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
} as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

/**
 * External legal/administrative status reported by public authorities or official registries.
 */
export const OFFICIAL_STATUS = {
  OFFICIALLY_MISSING: "OFFICIALLY_MISSING",
  OFFICIALLY_LOCATED: "OFFICIALLY_LOCATED",
  STATUS_TO_VERIFY: "STATUS_TO_VERIFY",
  UNKNOWN: "UNKNOWN",
} as const;

export type OfficialStatus = (typeof OFFICIAL_STATUS)[keyof typeof OFFICIAL_STATUS];