import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postSource } from "@/app/api/v1/sources/route";
import { POST as postPerson } from "@/app/api/v1/persons/route";
import { POST as postMissingEvent } from "@/app/api/v1/missing-events/route";
import { POST as postCase } from "@/app/api/v1/cases/route";
import { POST as postFact } from "@/app/api/v1/facts/route";
import { POST as postTip } from "@/app/api/v1/tips/route";
import { POST as postEvidence } from "@/app/api/v1/evidence/route";
import { POST as postHypothesis } from "@/app/api/v1/hypotheses/route";
import { PATCH as patchWorkflow } from "@/app/api/v1/cases/[caseId]/workflow-status/route";
import { PATCH as patchOfficial } from "@/app/api/v1/cases/[caseId]/official-status/route";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

function createJsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-actor-id": "ACTOR-TEST-001",
      "x-actor-roles": "LAW_ENFORCEMENT,CASE_MANAGER",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("HTTP API v1 Command Endpoints", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  it("4, 5, 30, 31, 34. POST /api/v1/sources should handle valid creation, conflict, enum errors and strict payload validation", async () => {
    // 4. Valid source
    const req1 = createJsonRequest("http://localhost/api/v1/sources", "POST", {
      sourceId: "SOURCE-TEST-001",
      type: "OFFICIAL_RECORD",
      label: "Official Civil Registry",
      externalReference: "DOC-REF-001",
    });
    const res1 = await postSource(req1);
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    expect(json1.data.sourceId).toBe("SOURCE-TEST-001");
    expect(json1.data.label).toBe("Official Civil Registry");

    // 5. Conflict (duplicate sourceId)
    const req2 = createJsonRequest("http://localhost/api/v1/sources", "POST", {
      sourceId: "SOURCE-TEST-001",
      type: "OFFICIAL_RECORD",
      label: "Duplicate label",
    });
    const res2 = await postSource(req2);
    expect(res2.status).toBe(409);
    const json2 = await res2.json();
    expect(json2.error.code).toBe("CONFLICT");

    // 31. Invalid Enum type
    const req3 = createJsonRequest("http://localhost/api/v1/sources", "POST", {
      sourceId: "SOURCE-TEST-002",
      type: "INVALID_SOURCE_TYPE",
      label: "Invalid Type",
    });
    const res3 = await postSource(req3);
    expect(res3.status).toBe(400);

    // 34. Unknown JSON field (strict schema rejection)
    const req4 = createJsonRequest("http://localhost/api/v1/sources", "POST", {
      sourceId: "SOURCE-TEST-003",
      type: "OFFICIAL_RECORD",
      label: "Valid Label",
      unexpectedField: "hack",
    });
    const res4 = await postSource(req4);
    expect(res4.status).toBe(400);
    const json4 = await res4.json();
    expect(json4.error.code).toBe("VALIDATION_ERROR");
  });

  it("6, 7, 33. POST /api/v1/persons should create incomplete person, reject duplicates and whitespace IDs", async () => {
    // 6. Valid Person
    const res1 = await postPerson(
      createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" })
    );
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    expect(json1.data.personId).toBe("PERSON-TEST-001");

    // 7. Duplicate Person
    const res2 = await postPerson(
      createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" })
    );
    expect(res2.status).toBe(409);

    // 33. Empty / whitespace personId
    const res3 = await postPerson(
      createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "   " })
    );
    expect(res3.status).toBe(400);
  });

  it("8, 9. POST /api/v1/missing-events should require existing Person and succeed when valid", async () => {
    // 8. Without Person -> 404
    const res1 = await postMissingEvent(
      createJsonRequest("http://localhost/api/v1/missing-events", "POST", {
        missingEventId: "EVENT-TEST-001",
        personId: "PERSON-NON-EXISTENT",
      })
    );
    expect(res1.status).toBe(404);

    // Create Person
    await postPerson(
      createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" })
    );

    // 9. Valid Missing Event -> 201
    const res2 = await postMissingEvent(
      createJsonRequest("http://localhost/api/v1/missing-events", "POST", {
        missingEventId: "EVENT-TEST-001",
        personId: "PERSON-TEST-001",
      })
    );
    expect(res2.status).toBe(201);
  });

  it("10, 11, 12, 13. POST /api/v1/cases should validate referential integrity between Person and MissingEvent", async () => {
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" }));
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-002" }));
    await postMissingEvent(createJsonRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVENT-TEST-001", personId: "PERSON-TEST-001" }));

    // 10. Nonexistent Person -> 404
    const res1 = await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", {
      caseId: "CASE-TEST-001",
      personId: "PERSON-UNKNOWN",
      missingEventId: "EVENT-TEST-001",
    }));
    expect(res1.status).toBe(404);

    // 11. Nonexistent MissingEvent -> 404
    const res2 = await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", {
      caseId: "CASE-TEST-001",
      personId: "PERSON-TEST-001",
      missingEventId: "EVENT-UNKNOWN",
    }));
    expect(res2.status).toBe(404);

    // 12. MissingEvent of another Person -> 422
    const res3 = await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", {
      caseId: "CASE-TEST-001",
      personId: "PERSON-TEST-002",
      missingEventId: "EVENT-TEST-001", // Linked to PERSON-TEST-001
    }));
    expect(res3.status).toBe(422);

    // 13. Valid Case -> 201
    const res4 = await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", {
      caseId: "CASE-TEST-001",
      personId: "PERSON-TEST-001",
      missingEventId: "EVENT-TEST-001",
      workflowStatus: "ACTIVE",
      officialStatus: "STATUS_TO_VERIFY",
    }));
    expect(res4.status).toBe(201);
  });

  it("14, 15, 16, 32. POST /api/v1/facts should handle valid fact, parent derivation check, missing source and invalid dates", async () => {
    await postSource(createJsonRequest("http://localhost/api/v1/sources", "POST", {
      sourceId: "SOURCE-TEST-001",
      type: "OFFICIAL_RECORD",
      label: "Bureau",
    }));

    // 16. Source does not exist -> 404
    const res1 = await postFact(createJsonRequest("http://localhost/api/v1/facts", "POST", {
      factId: "FACT-TEST-001",
      subjectId: "PERSON-TEST-001",
      attribute: "hairColor",
      value: "dark brown",
      epistemicStatus: "UNVERIFIED",
      provenance: {
        sourceId: "SOURCE-UNKNOWN",
        recordedAt: "2026-08-31T10:00:00Z",
        recordedBy: "OPERATOR",
      },
    }));
    expect(res1.status).toBe(404);

    // 15. DERIVED fact without parents -> 422
    const res2 = await postFact(createJsonRequest("http://localhost/api/v1/facts", "POST", {
      factId: "FACT-TEST-002",
      subjectId: "PERSON-TEST-001",
      attribute: "calculatedAge",
      value: 40,
      epistemicStatus: "DERIVED",
      provenance: {
        sourceId: "SOURCE-TEST-001",
        recordedAt: "2026-08-31T10:00:00Z",
        recordedBy: "OPERATOR",
      },
    }));
    expect(res2.status).toBe(422);

    // 32. Invalid Date format -> 400
    const res3 = await postFact(createJsonRequest("http://localhost/api/v1/facts", "POST", {
      factId: "FACT-TEST-003",
      subjectId: "PERSON-TEST-001",
      attribute: "eyeColor",
      value: "green",
      epistemicStatus: "UNVERIFIED",
      provenance: {
        sourceId: "SOURCE-TEST-001",
        recordedAt: "INVALID-DATE-STRING",
        recordedBy: "OPERATOR",
      },
    }));
    expect(res3.status).toBe(400);

    // 14. Valid UNVERIFIED Fact -> 201
    const res4 = await postFact(createJsonRequest("http://localhost/api/v1/facts", "POST", {
      factId: "FACT-TEST-004",
      subjectId: "PERSON-TEST-001",
      attribute: "hairColor",
      value: "black",
      epistemicStatus: "UNVERIFIED",
      provenance: {
        sourceId: "SOURCE-TEST-001",
        recordedAt: "2026-08-31T10:00:00Z",
        recordedBy: "OPERATOR",
      },
      confidence: 0.85,
    }));
    expect(res4.status).toBe(201);
  });

  it("17, 18, 19, 20. POST /api/v1/tips should preserve verbatim text and validate Case/Source presence", async () => {
    await postSource(createJsonRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SOURCE-TEST-001", type: "AUTHENTICATED_CITIZEN", label: "Citizen App" }));
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" }));
    await postMissingEvent(createJsonRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVENT-TEST-001", personId: "PERSON-TEST-001" }));
    await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", { caseId: "CASE-TEST-001", personId: "PERSON-TEST-001", missingEventId: "EVENT-TEST-001" }));

    // 19. Case not found -> 404
    const res1 = await postTip(createJsonRequest("http://localhost/api/v1/tips", "POST", {
      tipId: "TIP-TEST-001",
      caseId: "CASE-UNKNOWN",
      sourceId: "SOURCE-TEST-001",
      originalText: "Texto",
    }));
    expect(res1.status).toBe(404);

    // 20. Source not found -> 404
    const res2 = await postTip(createJsonRequest("http://localhost/api/v1/tips", "POST", {
      tipId: "TIP-TEST-001",
      caseId: "CASE-TEST-001",
      sourceId: "SOURCE-UNKNOWN",
      originalText: "Texto",
    }));
    expect(res2.status).toBe(404);

    // 17 & 18. Valid Tip with verbatim text
    const multilineRaw = "Relato em múltiplas linhas.\nLinha 2 — com acentuação e pontuação: R$ 50,00!";
    const res3 = await postTip(createJsonRequest("http://localhost/api/v1/tips", "POST", {
      tipId: "TIP-TEST-001",
      caseId: "CASE-TEST-001",
      sourceId: "SOURCE-TEST-001",
      originalText: multilineRaw,
    }));
    expect(res3.status).toBe(201);
    const json3 = await res3.json();
    expect(json3.data.originalText).toBe(multilineRaw);
  });

  it("21, 22, 23. POST /api/v1/evidence should require Case/Source and persist successfully", async () => {
    await postSource(createJsonRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SOURCE-TEST-001", type: "HEALTH_INSTITUTION", label: "Hospital" }));
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" }));
    await postMissingEvent(createJsonRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVENT-TEST-001", personId: "PERSON-TEST-001" }));
    await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", { caseId: "CASE-TEST-001", personId: "PERSON-TEST-001", missingEventId: "EVENT-TEST-001" }));

    // 22. Without Case -> 404
    const res1 = await postEvidence(createJsonRequest("http://localhost/api/v1/evidence", "POST", {
      evidenceId: "EV-TEST-001",
      caseId: "CASE-UNKNOWN",
      sourceId: "SOURCE-TEST-001",
      description: "Desc",
      provenance: { sourceId: "SOURCE-TEST-001", recordedBy: "STAFF" },
    }));
    expect(res1.status).toBe(404);

    // 21. Valid Evidence -> 201
    const res2 = await postEvidence(createJsonRequest("http://localhost/api/v1/evidence", "POST", {
      evidenceId: "EV-TEST-001",
      caseId: "CASE-TEST-001",
      sourceId: "SOURCE-TEST-001",
      description: "Prontuário de triagem hospitalar",
      provenance: { sourceId: "SOURCE-TEST-001", recordedBy: "STAFF" },
    }));
    expect(res2.status).toBe(201);
  });

  it("24, 25. POST /api/v1/hypotheses should accept 0 evidences, reject nonexistent evidences, and persist valid ones", async () => {
    await postSource(createJsonRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SOURCE-TEST-001", type: "OFFICIAL_RECORD", label: "Registry" }));
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" }));
    await postMissingEvent(createJsonRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVENT-TEST-001", personId: "PERSON-TEST-001" }));
    await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", { caseId: "CASE-TEST-001", personId: "PERSON-TEST-001", missingEventId: "EVENT-TEST-001" }));

    // 24. Zero evidence hypothesis -> 201
    const res1 = await postHypothesis(createJsonRequest("http://localhost/api/v1/hypotheses", "POST", {
      hypothesisId: "HYP-TEST-001",
      caseId: "CASE-TEST-001",
      statement: "Possível trajeto em direção ao norte.",
    }));
    expect(res1.status).toBe(201);

    // 25. Nonexistent evidence -> 404
    const res2 = await postHypothesis(createJsonRequest("http://localhost/api/v1/hypotheses", "POST", {
      hypothesisId: "HYP-TEST-002",
      caseId: "CASE-TEST-001",
      statement: "Hipótese com evidência falsa",
      supportingEvidenceIds: ["EV-NON-EXISTENT"],
    }));
    expect(res2.status).toBe(404);
  });

  it("26, 27, 28, 29. PATCH status routes should alter only targeted status and preserve the other", async () => {
    await postSource(createJsonRequest("http://localhost/api/v1/sources", "POST", { sourceId: "SOURCE-TEST-001", type: "LAW_ENFORCEMENT", label: "Police" }));
    await postPerson(createJsonRequest("http://localhost/api/v1/persons", "POST", { personId: "PERSON-TEST-001" }));
    await postMissingEvent(createJsonRequest("http://localhost/api/v1/missing-events", "POST", { missingEventId: "EVENT-TEST-001", personId: "PERSON-TEST-001" }));
    await postCase(createJsonRequest("http://localhost/api/v1/cases", "POST", {
      caseId: "CASE-TEST-001",
      personId: "PERSON-TEST-001",
      missingEventId: "EVENT-TEST-001",
      workflowStatus: "DRAFT",
      officialStatus: "STATUS_TO_VERIFY",
    }));

    // 26 & 27. PATCH workflow status -> 200, preserves officialStatus
    const res1 = await patchWorkflow(
      createJsonRequest("http://localhost/api/v1/cases/CASE-TEST-001/workflow-status", "PATCH", {
        workflowStatus: "ACTIVE",
      }),
      { params: Promise.resolve({ caseId: "CASE-TEST-001" }) }
    );
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.data.workflowStatus).toBe("ACTIVE");
    expect(json1.data.officialStatus).toBe("STATUS_TO_VERIFY"); // Preserved

    // 28 & 29. PATCH official status -> 200, preserves workflowStatus
    const res2 = await patchOfficial(
      createJsonRequest("http://localhost/api/v1/cases/CASE-TEST-001/official-status", "PATCH", {
        officialStatus: "OFFICIALLY_MISSING",
        provenance: {
          sourceId: "SOURCE-TEST-001",
          recordedBy: "POLICE_OFFICER",
        },
      }),
      { params: Promise.resolve({ caseId: "CASE-TEST-001" }) }
    );
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.data.officialStatus).toBe("OFFICIALLY_MISSING");
    expect(json2.data.workflowStatus).toBe("ACTIVE"); // Preserved
  });
});