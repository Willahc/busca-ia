import { describe, it, expect } from "vitest";
import { createCaseId } from "@/domain";
import {
  AUTHORIZATION_REASON_CODES,
  authorize,
  createActorId,
  createUnauthenticatedActorContext,
  PERMISSIONS,
  PRIVACY_LEVELS,
  ROLES,
} from "@/security";

describe("Security Core: Authorization Policy Engine", () => {
  it("1. should deny unauthenticated actor with DENY_UNAUTHENTICATED", () => {
    const unauth = createUnauthenticatedActorContext("REQ-001");
    const decision = authorize({
      actor: unauth,
      permission: PERMISSIONS.CASE_CREATE,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_UNAUTHENTICATED);
  });

  it("2. should deny actor lacking required permission with DENY_NO_PERMISSION", () => {
    const publicActor = {
      actorId: createActorId("USER-001"),
      roles: [ROLES.PUBLIC_USER],
      requestId: "REQ-001",
      authenticated: true,
    };

    const decision = authorize({
      actor: publicActor,
      permission: PERMISSIONS.EVIDENCE_CREATE,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_NO_PERMISSION);
  });

  it("3. should allow actor possessing permission with ALLOW_ROLE_PERMISSION", () => {
    const analyst = {
      actorId: createActorId("ANALYST-001"),
      roles: [ROLES.ANALYST],
      requestId: "REQ-001",
      authenticated: true,
    };

    const decision = authorize({
      actor: analyst,
      permission: PERMISSIONS.FACT_CREATE,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.ALLOW_ROLE_PERMISSION);
  });

  it("4. should enforce case-scope: allow when case is in actor scope, deny when outside", () => {
    const analyst = {
      actorId: createActorId("ANALYST-001"),
      roles: [ROLES.ANALYST],
      caseScopes: [createCaseId("CASE-001"), createCaseId("CASE-002")],
      requestId: "REQ-001",
      authenticated: true,
    };

    // In-scope case -> ALLOW
    const allowDecision = authorize({
      actor: analyst,
      permission: PERMISSIONS.EVIDENCE_CREATE,
      resource: { caseId: createCaseId("CASE-001") },
    });
    expect(allowDecision.allowed).toBe(true);

    // Out-of-scope case -> DENY_CASE_SCOPE
    const denyDecision = authorize({
      actor: analyst,
      permission: PERMISSIONS.EVIDENCE_CREATE,
      resource: { caseId: createCaseId("CASE-999") },
    });
    expect(denyDecision.allowed).toBe(false);
    expect(denyDecision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_CASE_SCOPE);
  });

  it("5. should deny case-scoped operations when scoped role has zero assigned case scopes", () => {
    const familyActor = {
      actorId: createActorId("FAMILY-001"),
      roles: [ROLES.FAMILY_AUTHORIZED],
      requestId: "REQ-001",
      authenticated: true,
    };

    const decision = authorize({
      actor: familyActor,
      permission: PERMISSIONS.TIP_CREATE,
      resource: { caseId: createCaseId("CASE-001") },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_CASE_SCOPE);
  });

  it("6. should enforce privacy level restrictions: SEALED is fail-closed", () => {
    const lawEnforcement = {
      actorId: createActorId("OFFICER-001"),
      roles: [ROLES.LAW_ENFORCEMENT],
      requestId: "REQ-001",
      authenticated: true,
    };

    // SEALED case -> DENY_SEALED
    const sealedDecision = authorize({
      actor: lawEnforcement,
      permission: PERMISSIONS.CASE_VIEW_LAW_ENFORCEMENT,
      resource: { privacyLevel: PRIVACY_LEVELS.SEALED },
    });
    expect(sealedDecision.allowed).toBe(false);
    expect(sealedDecision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_SEALED);

    // LAW_ENFORCEMENT_ONLY case for LE -> ALLOW
    const leDecision = authorize({
      actor: lawEnforcement,
      permission: PERMISSIONS.CASE_VIEW_LAW_ENFORCEMENT,
      resource: { privacyLevel: PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY },
    });
    expect(leDecision.allowed).toBe(true);

    // LAW_ENFORCEMENT_ONLY case for Analyst -> DENY_PRIVACY_LEVEL
    const analyst = {
      actorId: createActorId("ANALYST-001"),
      roles: [ROLES.ANALYST],
      requestId: "REQ-001",
      authenticated: true,
    };
    const analystDecision = authorize({
      actor: analyst,
      permission: PERMISSIONS.CASE_VIEW_CONFIDENTIAL,
      resource: { privacyLevel: PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY },
    });
    expect(analystDecision.allowed).toBe(false);
    expect(analystDecision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_PRIVACY_LEVEL);
  });

  it("7. CRITICAL: SYSTEM_ADMIN is denied for all investigative actions and SEALED resources", () => {
    const adminActor = {
      actorId: createActorId("SYSADMIN-001"),
      roles: [ROLES.SYSTEM_ADMIN],
      requestId: "REQ-ADMIN-001",
      authenticated: true,
    };

    const investigativePermissions = [
      PERMISSIONS.FACT_CREATE,
      PERMISSIONS.TIP_CREATE,
      PERMISSIONS.EVIDENCE_CREATE,
      PERMISSIONS.HYPOTHESIS_CREATE,
      PERMISSIONS.CASE_WORKFLOW_UPDATE,
      PERMISSIONS.CASE_OFFICIAL_STATUS_UPDATE,
    ];

    for (const perm of investigativePermissions) {
      const decision = authorize({
        actor: adminActor,
        permission: perm,
        resource: { caseId: createCaseId("CASE-001") },
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(AUTHORIZATION_REASON_CODES.DENY_NO_PERMISSION);
    }

    // Access to SEALED
    const sealedDecision = authorize({
      actor: adminActor,
      permission: PERMISSIONS.CASE_VIEW_SEALED,
      resource: { privacyLevel: PRIVACY_LEVELS.SEALED },
    });
    expect(sealedDecision.allowed).toBe(false);
  });
});