import { describe, expect, it } from "vitest";
import { createCaseId } from "@/domain";
import {
  authorize,
  createActorId,
  hasPermission,
  PERMISSIONS,
  PRIVACY_LEVELS,
  ROLES,
} from "@/security";

describe("Security: ENTITY_RESOLUTION_COMPARE", () => {
  it.each([ROLES.ANALYST, ROLES.LAW_ENFORCEMENT, ROLES.CASE_MANAGER])(
    "grants comparison to investigative role %s",
    (role) => {
      expect(hasPermission([role], PERMISSIONS.ENTITY_RESOLUTION_COMPARE)).toBe(true);
    }
  );

  it.each([ROLES.SYSTEM_ADMIN, ROLES.NGO_OPERATOR, ROLES.PUBLIC_USER])(
    "does not grant comparison to role %s",
    (role) => {
      expect(hasPermission([role], PERMISSIONS.ENTITY_RESOLUTION_COMPARE)).toBe(false);
    }
  );

  it("enforces scope and SEALED fail-closed policy", () => {
    const actor = {
      actorId: createActorId("ANALYST-ENTITY-RESOLUTION"),
      roles: [ROLES.ANALYST],
      caseScopes: [createCaseId("CASE-ENTITY-RESOLUTION")],
      requestId: "REQUEST-ENTITY-RESOLUTION",
      authenticated: true,
    };
    expect(
      authorize({
        actor,
        permission: PERMISSIONS.ENTITY_RESOLUTION_COMPARE,
        resource: {
          caseId: createCaseId("CASE-ENTITY-RESOLUTION"),
          privacyLevel: PRIVACY_LEVELS.RESTRICTED,
        },
      }).allowed
    ).toBe(true);
    expect(
      authorize({
        actor,
        permission: PERMISSIONS.ENTITY_RESOLUTION_COMPARE,
        resource: { caseId: createCaseId("CASE-OTHER") },
      }).allowed
    ).toBe(false);
    expect(
      authorize({
        actor,
        permission: PERMISSIONS.ENTITY_RESOLUTION_COMPARE,
        resource: {
          caseId: createCaseId("CASE-ENTITY-RESOLUTION"),
          privacyLevel: PRIVACY_LEVELS.SEALED,
        },
      }).allowed
    ).toBe(false);
  });
});
