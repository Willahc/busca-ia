import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postTimelineAnalyze } from "@/app/api/v1/cases/[caseId]/timeline/analyze/route";
import { POST as postSource } from "@/app/api/v1/sources/route";
import { POST as postPerson } from "@/app/api/v1/persons/route";
import { POST as postMissingEvent } from "@/app/api/v1/missing-events/route";
import { POST as postCase } from "@/app/api/v1/cases/route";
import { PrivacyLevel } from "@/domain";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";
import { AUDIT_OUTCOMES, PRIVACY_LEVELS } from "@/security";

function createSecuredRequest(
  url: string,
  method: string,
  body?: unknown,
  authHeaders?: Record<string, string>
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("API Boundary: Protected POST /api/v1/cases/[caseId]/timeline/analyze", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  const leHeaders = {
    "x-actor-id": "OFFICER-001",
    "x-actor-roles": "LAW_ENFORCEMENT",
    "x-request-id": "REQ-SETUP-001",
  };

  async function setupBaseCase(caseId = "CASE-TL-001", privacyLevel: PrivacyLevel = PRIVACY_LEVELS.RESTRICTED) {
    await postSource(createSecuredRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SRC-TL-01", type: "OFFICIAL_RECORD", label: "Registry" }, leHeaders));
    await postPerson(createSecuredRequest("http://localhost/api/v1/persons", "POST", { personId: "PER-TL-01" }, leHeaders));
    await postMissingEvent(createSecuredRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "ME-TL-01", personId: "PER-TL-01" }, leHeaders));
    await postCase(createSecuredRequest("http://localhost/api/v1/cases", "POST", { caseId, personId: "PER-TL-01", missingEventId: "ME-TL-01", privacyLevel }, leHeaders));
  }

  it("1. should reject unauthenticated request with 401 and write DENIED audit event", async () => {
    await setupBaseCase();

    const req = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-TL-001/timeline/analyze",
      "POST",
      {},
      { "x-request-id": "REQ-UNAUTH-TL" }
    );

    const res = await postTimelineAnalyze(req, {
      params: Promise.resolve({ caseId: "CASE-TL-001" }),
    });

    expect(res.status).toBe(401);

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId("REQ-UNAUTH-TL");
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
  });

  it("2. should reject actor without TIMELINE_ANALYZE permission with 403", async () => {
    await setupBaseCase();

    const req = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-TL-001/timeline/analyze",
      "POST",
      {},
      {
        "x-actor-id": "CITIZEN-001",
        "x-actor-roles": "PUBLIC_USER",
        "x-request-id": "REQ-PUBLIC-TL",
      }
    );

    const res = await postTimelineAnalyze(req, {
      params: Promise.resolve({ caseId: "CASE-TL-001" }),
    });

    expect(res.status).toBe(403);
  });

  it("3. CRITICAL: should reject SYSTEM_ADMIN with 403 (zero investigative permissions)", async () => {
    await setupBaseCase();

    const req = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-TL-001/timeline/analyze",
      "POST",
      {},
      {
        "x-actor-id": "ADMIN-001",
        "x-actor-roles": "SYSTEM_ADMIN",
        "x-request-id": "REQ-ADMIN-TL",
      }
    );

    const res = await postTimelineAnalyze(req, {
      params: Promise.resolve({ caseId: "CASE-TL-001" }),
    });

    expect(res.status).toBe(403);
  });

  it("4. should enforce case-scope for ANALYST role: allow in-scope, reject out-of-scope", async () => {
    await setupBaseCase("CASE-IN-SCOPE");
    await setupBaseCase("CASE-OUT-OF-SCOPE");

    // In-scope -> 200 OK
    const inScopeReq = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-IN-SCOPE/timeline/analyze",
      "POST",
      {},
      {
        "x-actor-id": "ANALYST-001",
        "x-actor-roles": "ANALYST",
        "x-actor-case-scopes": "CASE-IN-SCOPE",
        "x-request-id": "REQ-IN-SCOPE-TL",
      }
    );

    const allowRes = await postTimelineAnalyze(inScopeReq, {
      params: Promise.resolve({ caseId: "CASE-IN-SCOPE" }),
    });
    expect(allowRes.status).toBe(200);

    const json = await allowRes.json();
    expect(json.data.caseId).toBe("CASE-IN-SCOPE");

    // Out-of-scope -> 403 Forbidden
    const outScopeReq = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-OUT-OF-SCOPE/timeline/analyze",
      "POST",
      {},
      {
        "x-actor-id": "ANALYST-001",
        "x-actor-roles": "ANALYST",
        "x-actor-case-scopes": "CASE-IN-SCOPE",
        "x-request-id": "REQ-OUT-SCOPE-TL",
      }
    );

    const denyRes = await postTimelineAnalyze(outScopeReq, {
      params: Promise.resolve({ caseId: "CASE-OUT-OF-SCOPE" }),
    });
    expect(denyRes.status).toBe(403);
  });

  it("5. should fail closed on SEALED cases with 403", async () => {
    await setupBaseCase("CASE-SEALED-001", PRIVACY_LEVELS.SEALED);

    const req = createSecuredRequest(
      "http://localhost/api/v1/cases/CASE-SEALED-001/timeline/analyze",
      "POST",
      {},
      {
        "x-actor-id": "OFFICER-001",
        "x-actor-roles": "LAW_ENFORCEMENT",
        "x-request-id": "REQ-SEALED-TL",
      }
    );

    const res = await postTimelineAnalyze(req, {
      params: Promise.resolve({ caseId: "CASE-SEALED-001" }),
    });

    expect(res.status).toBe(403);
  });
});