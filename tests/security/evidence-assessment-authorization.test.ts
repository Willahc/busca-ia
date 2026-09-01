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

describe("Security: EVIDENCE_ASSESSMENT_RUN", () => {
  it.each([ROLES.ANALYST, ROLES.LAW_ENFORCEMENT, ROLES.CASE_MANAGER])(
    "grants assessment to investigative role %s",
    (role) => {
      expect(hasPermission([role], PERMISSIONS.EVIDENCE_ASSESSMENT_RUN)).toBe(true);
    }
  );

  it.each([ROLES.SYSTEM_ADMIN, ROLES.NGO_OPERATOR, ROLES.PUBLIC_USER])(
    "does not grant assessment to role %s",
    (role) => {
      expect(hasPermission([role], PERMISSIONS.EVIDENCE_ASSESSMENT_RUN)).toBe(false);
    }
  );

  it("enforces case scope, SEALED fail-closed, and LAW_ENFORCEMENT_ONLY", () => {
    const caseId = createCaseId("CASE-ASSESSMENT-AUTH");
    const analyst = {
      actorId: createActorId("ANALYST-ASSESSMENT"),
      roles: [ROLES.ANALYST],
      caseScopes: [caseId],
      requestId: "REQUEST-ASSESSMENT",
      authenticated: true,
    };
    expect(
      authorize({
        actor: analyst,
        permission: PERMISSIONS.EVIDENCE_ASSESSMENT_RUN,
        resource: { caseId, privacyLevel: PRIVACY_LEVELS.RESTRICTED },
      }).allowed
    ).toBe(true);
    expect(
      authorize({
        actor: analyst,
        permission: PERMISSIONS.EVIDENCE_ASSESSMENT_RUN,
        resource: { caseId, privacyLevel: PRIVACY_LEVELS.SEALED },
      }).allowed
    ).toBe(false);
    expect(
      authorize({
        actor: analyst,
        permission: PERMISSIONS.EVIDENCE_ASSESSMENT_RUN,
        resource: { caseId, privacyLevel: PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY },
      }).allowed
    ).toBe(false);
  });
});
