import { AuthorizationReasonCode } from "./authorization-decision";

/**
 * Thrown when an unauthenticated actor attempts an operation requiring authentication.
 * Maps to HTTP 401 Unauthorized.
 */
export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/**
 * Thrown when an authenticated actor is denied access to an operation or resource.
 * Maps to HTTP 403 Forbidden.
 */
export class AuthorizationDeniedError extends Error {
  readonly code = "FORBIDDEN";
  readonly reasonCode?: AuthorizationReasonCode;

  constructor(message = "Access denied", reasonCode?: AuthorizationReasonCode) {
    super(message);
    this.name = "AuthorizationDeniedError";
    this.reasonCode = reasonCode;
  }
}