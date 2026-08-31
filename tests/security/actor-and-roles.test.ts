import { describe, it, expect } from "vitest";
import {
  createActorId,
  createUnauthenticatedActorContext,
  hasPermission,
  PERMISSIONS,
  resolveActorContext,
  ROLE_PERMISSIONS,
  ROLES,
} from "@/security";

describe("Security Core: Actor & RBAC Role-Permissions", () => {
  it("1. should validate ActorId and reject empty/whitespace", () => {
    expect(() => createActorId("")).toThrow();
    expect(() => createActorId("   ")).toThrow();

    const actorId = createActorId("ACTOR-001");
    expect(actorId).toBe("ACTOR-001");
  });

  it("2. should create unauthenticated context with empty roles", () => {
    const ctx = createUnauthenticatedActorContext("REQ-001");
    expect(ctx.authenticated).toBe(false);
    expect(ctx.roles).toHaveLength(0);
    expect(ctx.requestId).toBe("REQ-001");
  });

  it("3. should resolve actor context from dev headers in non-production environment", () => {
    const req = new Request("http://localhost/api/v1/sources", {
      headers: {
        "x-actor-id": "ACTOR-TEST-001",
        "x-actor-roles": "ANALYST,CASE_MANAGER",
        "x-actor-case-scopes": "CASE-001,CASE-002",
        "x-actor-organization-id": "ORG-001",
        "x-request-id": "REQ-TEST-001",
      },
    });

    const ctx = resolveActorContext(req);
    expect(ctx.authenticated).toBe(true);
    expect(ctx.actorId).toBe("ACTOR-TEST-001");
    expect(ctx.roles).toEqual(["ANALYST", "CASE_MANAGER"]);
    expect(ctx.caseScopes).toEqual(["CASE-001", "CASE-002"]);
    expect(ctx.organizationId).toBe("ORG-001");
    expect(ctx.requestId).toBe("REQ-TEST-001");
  });

  it("4. CRITICAL: should strictly disable dev header resolution when NODE_ENV is production", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const req = new Request("http://localhost/api/v1/sources", {
        headers: {
          "x-actor-id": "ACTOR-TEST-001",
          "x-actor-roles": "SYSTEM_ADMIN,LAW_ENFORCEMENT",
          "x-request-id": "REQ-PROD-001",
        },
      });

      const ctx = resolveActorContext(req);
      expect(ctx.authenticated).toBe(false);
      expect(ctx.actorId).toBeUndefined();
      expect(ctx.roles).toHaveLength(0);
      expect(ctx.requestId).toBe("REQ-PROD-001");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });

  it("5. CRITICAL: SYSTEM_ADMIN has ONLY technical admin and audit permissions, ZERO investigative permissions", () => {
    const adminPermissions = ROLE_PERMISSIONS[ROLES.SYSTEM_ADMIN];
    expect(adminPermissions.has(PERMISSIONS.SYSTEM_ADMINISTRATION)).toBe(true);
    expect(adminPermissions.has(PERMISSIONS.AUDIT_VIEW)).toBe(true);

    // Assert zero investigative permissions
    expect(adminPermissions.has(PERMISSIONS.SOURCE_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.PERSON_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.MISSING_EVENT_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.CASE_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.FACT_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.TIP_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.EVIDENCE_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.HYPOTHESIS_CREATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.CASE_WORKFLOW_UPDATE)).toBe(false);
    expect(adminPermissions.has(PERMISSIONS.CASE_OFFICIAL_STATUS_UPDATE)).toBe(false);

    expect(hasPermission([ROLES.SYSTEM_ADMIN], PERMISSIONS.EVIDENCE_CREATE)).toBe(false);
    expect(hasPermission([ROLES.SYSTEM_ADMIN], PERMISSIONS.HYPOTHESIS_CREATE)).toBe(false);
  });
});