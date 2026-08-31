export const AUTHORIZATION_REASON_CODES = {
  ALLOW_ROLE_PERMISSION: "ALLOW_ROLE_PERMISSION",
  DENY_UNAUTHENTICATED: "DENY_UNAUTHENTICATED",
  DENY_NO_PERMISSION: "DENY_NO_PERMISSION",
  DENY_CASE_SCOPE: "DENY_CASE_SCOPE",
  DENY_PRIVACY_LEVEL: "DENY_PRIVACY_LEVEL",
  DENY_SEALED: "DENY_SEALED",
  DENY_INVALID_CONTEXT: "DENY_INVALID_CONTEXT",
} as const;

export type AuthorizationReasonCode =
  (typeof AUTHORIZATION_REASON_CODES)[keyof typeof AUTHORIZATION_REASON_CODES];

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reasonCode: AuthorizationReasonCode;
  readonly message?: string;
}

export function allow(
  reasonCode: AuthorizationReasonCode = AUTHORIZATION_REASON_CODES.ALLOW_ROLE_PERMISSION,
  message?: string
): AuthorizationDecision {
  return { allowed: true, reasonCode, message };
}

export function deny(
  reasonCode: AuthorizationReasonCode,
  message?: string
): AuthorizationDecision {
  return { allowed: false, reasonCode, message };
}