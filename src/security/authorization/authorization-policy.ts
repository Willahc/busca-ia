import { CaseId, PrivacyLevel, PRIVACY_LEVELS } from "@/domain";
import { ActorContext } from "../actor/actor-context";
import { Permission, PERMISSIONS } from "../rbac/permission";
import { hasPermission } from "../rbac/role-permissions";
import { ROLES } from "../rbac/role";
import {
  allow,
  AUTHORIZATION_REASON_CODES,
  AuthorizationDecision,
  deny,
} from "./authorization-decision";

export interface AuthorizationRequest {
  readonly actor: ActorContext;
  readonly permission: Permission;
  readonly resource?: {
    readonly caseId?: CaseId | string;
    readonly privacyLevel?: PrivacyLevel;
  };
}

/**
 * Central Authorization Policy Engine.
 *
 * ENFORCES DENY-BY-DEFAULT:
 * Any operation or context not explicitly allowed is strictly rejected.
 */
export function authorize(request: AuthorizationRequest): AuthorizationDecision {
  const { actor, permission, resource } = request;

  // 1. Authenticated check
  if (!actor || !actor.authenticated) {
    return deny(
      AUTHORIZATION_REASON_CODES.DENY_UNAUTHENTICATED,
      "Actor is not authenticated."
    );
  }

  // 2. Validate roles presence
  if (!actor.roles || actor.roles.length === 0) {
    return deny(
      AUTHORIZATION_REASON_CODES.DENY_NO_PERMISSION,
      "Actor has no roles assigned."
    );
  }

  // 3. Evaluate Role-Permission Matrix
  const roleHasPermission = hasPermission(actor.roles, permission);
  if (!roleHasPermission) {
    return deny(
      AUTHORIZATION_REASON_CODES.DENY_NO_PERMISSION,
      `Actor roles lack required permission '${permission}'.`
    );
  }

  // 4. Evaluate Case Scope (if operation is bound to a specific caseId)
  if (resource?.caseId) {
    const targetCaseId = resource.caseId as CaseId;

    if (actor.caseScopes && actor.caseScopes.length > 0) {
      if (!actor.caseScopes.includes(targetCaseId)) {
        return deny(
          AUTHORIZATION_REASON_CODES.DENY_CASE_SCOPE,
          `Case '${targetCaseId}' is outside actor authorized case scopes.`
        );
      }
    } else {
      // If actor belongs only to scope-constrained roles and has no caseScopes defined:
      const hasInstitutionalBreadth = actor.roles.some(
        (r) => r === ROLES.LAW_ENFORCEMENT || r === ROLES.CASE_MANAGER
      );

      if (!hasInstitutionalBreadth) {
        return deny(
          AUTHORIZATION_REASON_CODES.DENY_CASE_SCOPE,
          "Actor lacks explicit case scope assignment for target case."
        );
      }
    }
  }

  // 5. Evaluate Privacy Level (if resource privacyLevel is present)
  if (resource?.privacyLevel) {
    const level = resource.privacyLevel;

    if (level === PRIVACY_LEVELS.SEALED) {
      // SEALED is fail-closed by default
      return deny(
        AUTHORIZATION_REASON_CODES.DENY_SEALED,
        "Access to SEALED case is denied."
      );
    }

    if (level === PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY) {
      if (!hasPermission(actor.roles, PERMISSIONS.CASE_VIEW_LAW_ENFORCEMENT)) {
        return deny(
          AUTHORIZATION_REASON_CODES.DENY_PRIVACY_LEVEL,
          "Resource requires LAW_ENFORCEMENT privacy authorization."
        );
      }
    }

    if (level === PRIVACY_LEVELS.CONFIDENTIAL) {
      if (!hasPermission(actor.roles, PERMISSIONS.CASE_VIEW_CONFIDENTIAL)) {
        return deny(
          AUTHORIZATION_REASON_CODES.DENY_PRIVACY_LEVEL,
          "Resource requires CONFIDENTIAL privacy authorization."
        );
      }
    }

    if (level === PRIVACY_LEVELS.RESTRICTED) {
      if (!hasPermission(actor.roles, PERMISSIONS.CASE_VIEW_RESTRICTED)) {
        return deny(
          AUTHORIZATION_REASON_CODES.DENY_PRIVACY_LEVEL,
          "Resource requires RESTRICTED privacy authorization."
        );
      }
    }
  }

  // 6. Explicit Allow
  return allow(
    AUTHORIZATION_REASON_CODES.ALLOW_ROLE_PERMISSION,
    "Operation explicitly authorized."
  );
}