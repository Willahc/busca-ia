import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
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
import {
  createCaseId,
  createFactId,
  createHypothesisId,
  createPersonId,
  createSourceId,
  createTipId,
} from "@/domain";
import {
  createAppContainer,
  resetApplicationContainer,
} from "@/infrastructure";

function createJsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("40. Full HTTP Lifecycle and Persistence Restart Smoke Test", () => {
  let tempDbPath: string | null = null;

  afterEach(() => {
    resetApplicationContainer();
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
        const walPath = `${tempDbPath}-wal`;
        const shmPath = `${tempDbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      } catch {
        // Cleanup error ignored
      }
    }
  });

  it("should execute complete 10-step lifecycle via Route Handlers and survive container restart", async () => {
    tempDbPath = path.join(os.tmpdir(), `buscaia-api-smoke-${Date.now()}.db`);

    // Initialize container for Next.js Route Handlers
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: tempDbPath });

    // Step 1: POST /api/v1/sources
    const res1 = await postSource(
      createJsonRequest("http://localhost/api/v1/sources", "POST", {
        sourceId: "SOURCE-API-001",
        type: "OFFICIAL_RECORD",
        label: "Official State Registry",
      })
    );
    expect(res1.status).toBe(201);

    // Step 2: POST /api/v1/persons
    const res2 = await postPerson(
      createJsonRequest("http://localhost/api/v1/persons", "POST", {
        personId: "PERSON-API-001",
      })
    );
    expect(res2.status).toBe(201);

    // Step 3: POST /api/v1/missing-events
    const res3 = await postMissingEvent(
      createJsonRequest("http://localhost/api/v1/missing-events", "POST", {
        missingEventId: "EVENT-API-001",
        personId: "PERSON-API-001",
      })
    );
    expect(res3.status).toBe(201);

    // Step 4: POST /api/v1/cases
    const res4 = await postCase(
      createJsonRequest("http://localhost/api/v1/cases", "POST", {
        caseId: "CASE-API-001",
        personId: "PERSON-API-001",
        missingEventId: "EVENT-API-001",
        workflowStatus: "DRAFT",
        officialStatus: "STATUS_TO_VERIFY",
      })
    );
    expect(res4.status).toBe(201);

    // Step 5: POST /api/v1/facts
    const res5 = await postFact(
      createJsonRequest("http://localhost/api/v1/facts", "POST", {
        factId: "FACT-API-001",
        subjectId: "PERSON-API-001",
        attribute: "approximateHeight",
        value: 177,
        epistemicStatus: "UNVERIFIED",
        provenance: {
          sourceId: "SOURCE-API-001",
          recordedAt: "2026-08-31T10:00:00.000Z",
          recordedBy: "OPERATOR_01",
        },
        confidence: 0.9,
      })
    );
    expect(res5.status).toBe(201);

    // Step 6: POST /api/v1/tips
    const res6 = await postTip(
      createJsonRequest("http://localhost/api/v1/tips", "POST", {
        tipId: "TIP-API-001",
        caseId: "CASE-API-001",
        sourceId: "SOURCE-API-001",
        originalText: "Relato via API preservado com acentos e \nquebras de linha.",
        receivedAt: "2026-08-31T10:15:00.000Z",
      })
    );
    expect(res6.status).toBe(201);

    // Step 7: POST /api/v1/evidence
    const res7 = await postEvidence(
      createJsonRequest("http://localhost/api/v1/evidence", "POST", {
        evidenceId: "EV-API-001",
        caseId: "CASE-API-001",
        sourceId: "SOURCE-API-001",
        description: "Registro de transporte coletivo verificado via API.",
        provenance: {
          sourceId: "SOURCE-API-001",
          recordedBy: "ANALYST_01",
        },
      })
    );
    expect(res7.status).toBe(201);

    // Step 8: POST /api/v1/hypotheses
    const res8 = await postHypothesis(
      createJsonRequest("http://localhost/api/v1/hypotheses", "POST", {
        hypothesisId: "HYP-API-001",
        caseId: "CASE-API-001",
        statement: "Pessoa utilizou linha de ônibus no terminal.",
        supportingEvidenceIds: ["EV-API-001"],
      })
    );
    expect(res8.status).toBe(201);

    // Step 9: PATCH /api/v1/cases/CASE-API-001/workflow-status
    const res9 = await patchWorkflow(
      createJsonRequest("http://localhost/api/v1/cases/CASE-API-001/workflow-status", "PATCH", {
        workflowStatus: "ACTIVE",
      }),
      { params: Promise.resolve({ caseId: "CASE-API-001" }) }
    );
    expect(res9.status).toBe(200);

    // Step 10: PATCH /api/v1/cases/CASE-API-001/official-status
    const res10 = await patchOfficial(
      createJsonRequest("http://localhost/api/v1/cases/CASE-API-001/official-status", "PATCH", {
        officialStatus: "OFFICIALLY_MISSING",
        provenance: {
          sourceId: "SOURCE-API-001",
          recordedBy: "POLICE_DEPT",
        },
      }),
      { params: Promise.resolve({ caseId: "CASE-API-001" }) }
    );
    expect(res10.status).toBe(200);

    // Close container connection completely
    resetApplicationContainer();

    // RESTART: Create a brand new container instance pointing to the same DB file and verify persistence
    const newContainer = createAppContainer({ dbPath: tempDbPath });

    const source = await newContainer.repositories.sourceRepository.findById(createSourceId("SOURCE-API-001"));
    expect(source?.label).toBe("Official State Registry");

    const person = await newContainer.repositories.personRepository.findById(createPersonId("PERSON-API-001"));
    expect(person).not.toBeNull();

    const c = await newContainer.repositories.caseRepository.findById(createCaseId("CASE-API-001"));
    expect(c?.workflowStatus).toBe("ACTIVE");
    expect(c?.officialStatus).toBe("OFFICIALLY_MISSING");

    const fact = await newContainer.repositories.factRepository.findById(createFactId("FACT-API-001"));
    expect(fact?.attribute).toBe("approximateHeight");
    expect(fact?.value).toBe(177);

    const tip = await newContainer.repositories.tipRepository.findById(createTipId("TIP-API-001"));
    expect(tip?.originalText).toBe("Relato via API preservado com acentos e \nquebras de linha.");

    const hyp = await newContainer.repositories.hypothesisRepository.findById(createHypothesisId("HYP-API-001"));
    expect(hyp?.supportingEvidenceIds).toContain("EV-API-001");

    newContainer.close();
  });
});