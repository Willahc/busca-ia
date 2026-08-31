import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readinessGet } from "@/app/api/readiness/route";
import { POST as postSource } from "@/app/api/v1/sources/route";
import { POST as postPerson } from "@/app/api/v1/persons/route";
import { POST as postMissingEvent } from "@/app/api/v1/missing-events/route";
import { POST as postCase } from "@/app/api/v1/cases/route";
import { POST as postEvidence } from "@/app/api/v1/evidence/route";
import { POST as postFact } from "@/app/api/v1/facts/route";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";
import { AUDIT_OUTCOMES } from "@/security";

function createSecuredRequest(
  url: string,
  method: string,
  body?: unknown,
  authHeaders?: Record<string, string>
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders,
  };

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("API Boundary: Security Authorization & Audit Integration", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  it("1. should allow GET /api/health and GET /api/readiness without any actor headers", async () => {
    const healthRes = await healthGet();
    expect(healthRes.status).toBe(200);

    const readyRes = await readinessGet();
    expect(readyRes.status).toBe(200);
  });

  it("2. should reject unauthenticated POST requests with 401 and write DENIED audit event", async () => {
    const unauthReq = createSecuredRequest(
      "http://localhost/api/v1/sources",
      "POST",
      {
        sourceId: "SOURCE-TEST-001",
        type: "OFFICIAL_RECORD",
        label: "Source",
      },
      { "x-request-id": "REQ-UNAUTH-001" } // No actor headers
    );

    const res = await postSource(unauthReq);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-UNAUTH-001");
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
    expect(audits[0].reasonCode).toBe("DENY_UNAUTHENTICATED");
  });

  it("3. should reject actor lacking required permission with 403 and write DENIED audit event", async () => {
    const publicUserReq = createSecuredRequest(
      "http://localhost/api/v1/evidence",
      "POST",
      {
        evidenceId: "EV-TEST-001",
        caseId: "CASE-TEST-001",
        sourceId: "SOURCE-TEST-001",
        description: "Public user trying to create evidence",
        provenance: { sourceId: "SOURCE-TEST-001", recordedBy: "CITIZEN" },
      },
      {
        "x-actor-id": "CITIZEN-001",
        "x-actor-roles": "PUBLIC_USER",
        "x-request-id": "REQ-FORBIDDEN-001",
      }
    );

    const res = await postEvidence(publicUserReq);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Access denied",
      },
    });

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-FORBIDDEN-001");
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
    expect(audits[0].actorId).toBe("CITIZEN-001");
    expect(audits[0].reasonCode).toBe("DENY_NO_PERMISSION");
  });

  it("4. CRITICAL: should reject SYSTEM_ADMIN attempting investigative entity creation with 403", async () => {
    const adminReq = createSecuredRequest(
      "http://localhost/api/v1/evidence",
      "POST",
      {
        evidenceId: "EV-TEST-001",
        caseId: "CASE-TEST-001",
        sourceId: "SOURCE-TEST-001",
        description: "Admin attempting evidence creation",
        provenance: { sourceId: "SOURCE-TEST-001", recordedBy: "ADMIN" },
      },
      {
        "x-actor-id": "ADMIN-001",
        "x-actor-roles": "SYSTEM_ADMIN",
        "x-request-id": "REQ-ADMIN-DENIED-001",
      }
    );

    const res = await postEvidence(adminReq);
    expect(res.status).toBe(403);

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-ADMIN-DENIED-001");
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
    expect(audits[0].reasonCode).toBe("DENY_NO_PERMISSION");
  });

  it("5. should enforce case-scopes: allow when in-scope, deny when out-of-scope", async () => {
    const authHeadersLE = {
      "x-actor-id": "OFFICER-001",
      "x-actor-roles": "LAW_ENFORCEMENT",
      "x-request-id": "REQ-SETUP-001",
    };

    // Setup base entities
    await postSource(createSecuredRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SRC-001", type: "OFFICIAL_RECORD", label: "Registry" }, authHeadersLE));
    await postPerson(createSecuredRequest("http://localhost/api/v1/persons", "POST", { personId: "PER-001" }, authHeadersLE));
    await postMissingEvent(createSecuredRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVT-001", personId: "PER-001" }, authHeadersLE));
    await postCase(createSecuredRequest("http://localhost/api/v1/cases", "POST", { caseId: "CASE-ALLOWED-001", personId: "PER-001", missingEventId: "EVT-001" }, authHeadersLE));

    // Analyst assigned ONLY to CASE-ALLOWED-001
    const inScopeReq = createSecuredRequest(
      "http://localhost/api/v1/evidence",
      "POST",
      {
        evidenceId: "EV-001",
        caseId: "CASE-ALLOWED-001",
        sourceId: "SRC-001",
        description: "Valid evidence on assigned case",
        provenance: { sourceId: "SRC-001", recordedBy: "ANALYST" },
      },
      {
        "x-actor-id": "ANALYST-001",
        "x-actor-roles": "ANALYST",
        "x-actor-case-scopes": "CASE-ALLOWED-001",
        "x-request-id": "REQ-IN-SCOPE-001",
      }
    );

    const allowRes = await postEvidence(inScopeReq);
    expect(allowRes.status).toBe(201);

    const allowAudits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-IN-SCOPE-001");
    expect(allowAudits).toHaveLength(1);
    expect(allowAudits[0].outcome).toBe(AUDIT_OUTCOMES.SUCCEEDED);
    expect(allowAudits[0].resourceId).toBe("EV-001");

    // Analyst attempting action on CASE-UNAUTHORIZED-999
    const outScopeReq = createSecuredRequest(
      "http://localhost/api/v1/evidence",
      "POST",
      {
        evidenceId: "EV-002",
        caseId: "CASE-UNAUTHORIZED-999",
        sourceId: "SRC-001",
        description: "Attempt on unassigned case",
        provenance: { sourceId: "SRC-001", recordedBy: "ANALYST" },
      },
      {
        "x-actor-id": "ANALYST-001",
        "x-actor-roles": "ANALYST",
        "x-actor-case-scopes": "CASE-ALLOWED-001",
        "x-request-id": "REQ-OUT-SCOPE-001",
      }
    );

    const denyRes = await postEvidence(outScopeReq);
    expect(denyRes.status).toBe(403);

    const denyAudits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-OUT-SCOPE-001");
    expect(denyAudits).toHaveLength(1);
    expect(denyAudits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
    expect(denyAudits[0].reasonCode).toBe("DENY_CASE_SCOPE");
  });

  it("6. should record FAILED audit when an authorized command encounters a business error", async () => {
    const authHeadersLE = {
      "x-actor-id": "OFFICER-001",
      "x-actor-roles": "LAW_ENFORCEMENT",
      "x-request-id": "REQ-BIZ-FAIL-001",
    };

    // Create source first so source exists
    await postSource(
      createSecuredRequest(
        "http://localhost/api/v1/sources",
        "POST",
        { sourceId: "SRC-001", type: "OFFICIAL_RECORD", label: "Source" },
        authHeadersLE
      )
    );

    // Try creating a DERIVED fact without parentFactIds (triggers 422 InvalidOperationError)
    const failReq = createSecuredRequest(
      "http://localhost/api/v1/facts",
      "POST",
      {
        factId: "FACT-FAIL-001",
        subjectId: "PER-001",
        attribute: "derivedAttr",
        value: "test",
        epistemicStatus: "DERIVED", // DERIVED without parents fails business rule
        provenance: { sourceId: "SRC-001", recordedBy: "OFFICER" },
      },
      { ...authHeadersLE, "x-request-id": "REQ-BIZ-FAIL-002" }
    );

    const res = await postFact(failReq);
    expect(res.status).toBe(422);

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-BIZ-FAIL-002");
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.FAILED);
  });
});