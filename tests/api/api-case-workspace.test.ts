import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listCases } from "@/app/api/v1/cases/route";
import { GET as getCase } from "@/app/api/v1/cases/[caseId]/route";
import {
  createFactId,
  createCaseId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  EPISTEMIC_STATUS,
  Provenance,
  PrivacyLevel,
  PRIVACY_LEVELS,
  SOURCE_TYPES,
} from "@/domain";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

function securedRequest(path: string, role = "CASE_ADMIN") {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: {
      "x-actor-id": "WORKSPACE-TEST-ADMIN",
      "x-actor-roles": role,
    },
  });
}

describe("Case workspace query endpoints", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  async function createCase(
    caseId: string,
    privacyLevel: PrivacyLevel = PRIVACY_LEVELS.RESTRICTED,
    synthetic = true
  ) {
    const personId = createPersonId(`${synthetic ? "SIM-PERSON" : "PERSON"}-${caseId}`);
    const missingEventId = createMissingEventId(
      `${synthetic ? "SIM-EVENT" : "EVENT"}-${caseId}`
    );
    const container = globalThis.__buscaIaAppContainer!;
    await container.useCases.registerPerson.execute({ id: personId });
    await container.useCases.registerMissingEvent.execute({
      id: missingEventId,
      personId,
    });
    await container.useCases.createCase.execute({
      id: createCaseId(caseId),
      personId,
      missingEventId,
      privacyLevel,
    });
    if (synthetic) {
      const sourceId = createSourceId(`SOURCE-${caseId}`);
      await container.useCases.registerSource.execute({
        id: sourceId,
        type: SOURCE_TYPES.SYNTHETIC_TEST,
        label: "Synthetic workspace test data",
      });
      await container.useCases.addFact.execute({
        id: createFactId(`FACT-${caseId}`),
        subjectId: personId,
        attribute: "display_name",
        value: "Pessoa Sintética de Teste",
        epistemicStatus: EPISTEMIC_STATUS.SYNTHETIC,
        provenance: new Provenance({
          sourceId,
          recordedAt: new Date(),
          recordedBy: "TEST",
        }),
      });
    }
  }

  it("lists non-sealed cases for the operational case administrator", async () => {
    await createCase("SIM-CASE-WORKSPACE-OPEN");
    await createCase("SIM-CASE-WORKSPACE-SEALED", PRIVACY_LEVELS.SEALED);
    await createCase("CASE-WORKSPACE-NON-SYNTHETIC", PRIVACY_LEVELS.RESTRICTED, false);

    const response = await listCases(securedRequest("/api/v1/cases"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.map((item: { caseId: string }) => item.caseId)).toEqual([
      "SIM-CASE-WORKSPACE-OPEN",
    ]);
  });

  it("returns case details to the operational case administrator", async () => {
    await createCase("SIM-CASE-WORKSPACE-DETAIL");

    const response = await getCase(
      securedRequest("/api/v1/cases/SIM-CASE-WORKSPACE-DETAIL"),
      { params: Promise.resolve({ caseId: "SIM-CASE-WORKSPACE-DETAIL" }) }
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.case.caseId).toBe("SIM-CASE-WORKSPACE-DETAIL");
    expect(payload.data.facts).toHaveLength(1);
    expect(payload.data.tips).toEqual([]);
  });

  it("does not grant workspace access to SYSTEM_ADMIN", async () => {
    const response = await listCases(securedRequest("/api/v1/cases", "SYSTEM_ADMIN"));
    expect(response.status).toBe(403);
  });

  it("denies direct reads of sealed cases", async () => {
    await createCase("SIM-CASE-WORKSPACE-SEALED-READ", PRIVACY_LEVELS.SEALED);

    const response = await getCase(
      securedRequest("/api/v1/cases/SIM-CASE-WORKSPACE-SEALED-READ"),
      { params: Promise.resolve({ caseId: "SIM-CASE-WORKSPACE-SEALED-READ" }) }
    );
    expect(response.status).toBe(403);
  });

  it("does not return non-synthetic cases through a direct detail lookup", async () => {
    await createCase("CASE-WORKSPACE-NON-SYNTHETIC-DETAIL", PRIVACY_LEVELS.RESTRICTED, false);

    const response = await getCase(
      securedRequest("/api/v1/cases/CASE-WORKSPACE-NON-SYNTHETIC-DETAIL"),
      { params: Promise.resolve({ caseId: "CASE-WORKSPACE-NON-SYNTHETIC-DETAIL" }) }
    );
    expect(response.status).toBe(404);
  });
});
