import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as compareCandidates } from "@/app/api/v1/cases/[caseId]/entity-resolution/compare/route";
import {
  Case,
  createCaseId,
  createFactId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  Fact,
  MissingEvent,
  Person,
  PrivacyLevel,
  Provenance,
  Source,
} from "@/domain";
import {
  ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
  ENTITY_RESOLUTION_CONCLUSIONS,
} from "@/intelligence";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, PRIVACY_LEVELS } from "@/security";

function request(
  caseId: string,
  body: unknown,
  headers: Record<string, string> = {},
  rawBody?: string
) {
  return new NextRequest(
    `http://localhost/api/v1/cases/${caseId}/entity-resolution/compare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: rawBody ?? JSON.stringify(body),
    }
  );
}

describe("API Boundary: protected entity resolution comparison", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });
  afterEach(() => resetApplicationContainer());

  const lawHeaders = {
    "x-actor-id": "OFFICER-ER-TEST",
    "x-actor-roles": "LAW_ENFORCEMENT",
    "x-request-id": "REQUEST-ER-DEFAULT",
  };

  async function setup(
    privacyLevel: PrivacyLevel = PRIVACY_LEVELS.RESTRICTED,
    factMode: "compatible" | "incompatible" | "insufficient" = "compatible"
  ) {
    const container = globalThis.__buscaIaAppContainer!;
    const caseId = createCaseId("CASE-ER-API-001");
    const leftPersonId = createPersonId("PERSON-ER-API-LEFT");
    const rightPersonId = createPersonId("PERSON-ER-API-RIGHT");
    const sourceId = createSourceId("SOURCE-ER-API");
    const provenance = () =>
      new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T12:00:00Z"),
        recordedBy: "SYNTHETIC-API-TEST",
      });
    await container.repositories.sourceRepository.save(
      new Source({ id: sourceId, type: "SYNTHETIC_TEST", label: "Synthetic API fixture" })
    );
    await container.repositories.personRepository.save(new Person({ id: leftPersonId }));
    await container.repositories.personRepository.save(new Person({ id: rightPersonId }));
    const missingEventId = createMissingEventId("EVENT-ER-API");
    await container.repositories.missingEventRepository.save(
      new MissingEvent({ id: missingEventId, personId: leftPersonId })
    );
    await container.repositories.caseRepository.save(
      new Case({ id: caseId, personId: leftPersonId, missingEventId, privacyLevel })
    );
    await container.repositories.factRepository.save(
      new Fact({
        id: createFactId("FACT-ER-API-LINK"),
        subjectId: caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: rightPersonId,
        epistemicStatus: "SYNTHETIC",
        provenance: provenance(),
      })
    );

    const definitions =
      factMode === "insufficient"
        ? [["SEX", "person.sex", "FEMALE", "FEMALE"]] as const
        : [
            ["NAME", "person.full_name", "Pessoa Teste API", "PESSOA TESTE API"],
            [
              "DOB",
              "person.birth_date",
              "1992-12-15",
              factMode === "incompatible" ? "1993-12-15" : "1992-12-15",
            ],
            ["MOTHER", "person.mother_name", "Parente Teste API", "PARENTE TESTE API"],
            ["SEX", "person.sex", "FEMALE", "FEMALE"],
          ] as const;
    for (const [suffix, attribute, leftValue, rightValue] of definitions) {
      for (const [side, personId, value] of [
        ["LEFT", leftPersonId, leftValue],
        ["RIGHT", rightPersonId, rightValue],
      ] as const) {
        await container.repositories.factRepository.save(
          new Fact({
            id: createFactId(`FACT-ER-API-${side}-${suffix}`),
            subjectId: personId,
            attribute,
            value,
            epistemicStatus: factMode === "insufficient" ? "SYNTHETIC" : "CONFIRMED",
            provenance: provenance(),
          })
        );
      }
    }
    return { caseId, leftPersonId, rightPersonId, provenance, sourceId };
  }

  async function post(
    fixture: Awaited<ReturnType<typeof setup>>,
    headers: Record<string, string> = lawHeaders,
    body: unknown = {
      leftPersonId: fixture.leftPersonId,
      rightPersonId: fixture.rightPersonId,
    }
  ) {
    return compareCandidates(request(fixture.caseId, body, headers), {
      params: Promise.resolve({ caseId: fixture.caseId }),
    });
  }

  it("returns 401 and DENIED audit without an actor", async () => {
    const fixture = await setup();
    const requestId = "REQUEST-ER-UNAUTHENTICATED";
    const response = await post(fixture, { "x-request-id": requestId });
    expect(response.status).toBe(401);
    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe(AUDIT_ACTIONS.ENTITY_RESOLUTION_COMPARE);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.DENIED);
  });

  it.each([
    ["PUBLIC_USER", "PUBLIC-ER-TEST"],
    ["SYSTEM_ADMIN", "ADMIN-ER-TEST"],
  ])("returns 403 for role %s without investigative permission", async (role, actorId) => {
    const fixture = await setup();
    const response = await post(fixture, {
      "x-actor-id": actorId,
      "x-actor-roles": role,
      "x-request-id": `REQUEST-ER-DENIED-${role}`,
    });
    expect(response.status).toBe(403);
  });

  it("enforces ANALYST case scope", async () => {
    const fixture = await setup();
    const denied = await post(fixture, {
      "x-actor-id": "ANALYST-ER-TEST",
      "x-actor-roles": "ANALYST",
      "x-actor-case-scopes": "CASE-OTHER",
      "x-request-id": "REQUEST-ER-OUT-OF-SCOPE",
    });
    const allowed = await post(fixture, {
      "x-actor-id": "ANALYST-ER-TEST",
      "x-actor-roles": "ANALYST",
      "x-actor-case-scopes": fixture.caseId,
      "x-request-id": "REQUEST-ER-IN-SCOPE",
    });
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });

  it("fails closed for SEALED and applies LAW_ENFORCEMENT_ONLY policy", async () => {
    const sealed = await setup(PRIVACY_LEVELS.SEALED);
    expect((await post(sealed)).status).toBe(403);

    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
    const restricted = await setup(PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY);
    const analyst = await post(restricted, {
      "x-actor-id": "ANALYST-ER-LAW-ONLY",
      "x-actor-roles": "ANALYST",
      "x-actor-case-scopes": restricted.caseId,
      "x-request-id": "REQUEST-ER-LAW-ONLY-ANALYST",
    });
    const law = await post(restricted, {
      ...lawHeaders,
      "x-request-id": "REQUEST-ER-LAW-ONLY-OFFICER",
    });
    expect(analyst.status).toBe(403);
    expect(law.status).toBe(200);
  });

  it.each([
    ["compatible", ENTITY_RESOLUTION_CONCLUSIONS.COMPATIBLE],
    ["incompatible", ENTITY_RESOLUTION_CONCLUSIONS.INCOMPATIBLE],
    ["insufficient", ENTITY_RESOLUTION_CONCLUSIONS.INSUFFICIENT_DATA],
  ] as const)("returns HTTP 200 for analytical conclusion %s", async (mode, conclusion) => {
    const fixture = await setup(PRIVACY_LEVELS.RESTRICTED, mode);
    const response = await post(fixture);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.conclusion).toBe(conclusion);
    expect(json.data.comparisons[0]).not.toHaveProperty("leftValue");
    expect(json.data.comparisons[0]).not.toHaveProperty("rightValue");
    expect(json.data).not.toHaveProperty("samePerson");
  });

  it("returns 400 for invalid body and 422 for comparing the same Person", async () => {
    const fixture = await setup();
    expect((await post(fixture, lawHeaders, { leftPersonId: fixture.leftPersonId })).status).toBe(400);
    expect(
      (
        await post(fixture, lawHeaders, {
          leftPersonId: fixture.leftPersonId,
          rightPersonId: fixture.leftPersonId,
        })
      ).status
    ).toBe(422);
  });

  it("returns 404 and FAILED audit for an explicitly linked missing Person", async () => {
    const fixture = await setup();
    const missingId = createPersonId("PERSON-ER-API-MISSING");
    await globalThis.__buscaIaAppContainer!.repositories.factRepository.save(
      new Fact({
        id: createFactId("FACT-ER-API-MISSING-LINK"),
        subjectId: fixture.caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: missingId,
        epistemicStatus: "SYNTHETIC",
        provenance: fixture.provenance(),
      })
    );
    const requestId = "REQUEST-ER-MISSING-PERSON";
    const response = await post(
      fixture,
      { ...lawHeaders, "x-request-id": requestId },
      { leftPersonId: fixture.leftPersonId, rightPersonId: missingId }
    );
    expect(response.status).toBe(404);
    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.FAILED);
    expect(audits[0].resourceId).toContain(`rightPersonId=${missingId}`);
  });

  it("writes a minimized SUCCEEDED audit for an authorized comparison", async () => {
    const fixture = await setup();
    const requestId = "REQUEST-ER-SUCCEEDED";
    const response = await post(fixture, { ...lawHeaders, "x-request-id": requestId });
    expect(response.status).toBe(200);
    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.SUCCEEDED);
    expect(audits[0].resourceId).toBe(
      `caseId=${fixture.caseId};leftPersonId=${fixture.leftPersonId};rightPersonId=${fixture.rightPersonId}`
    );
  });
});
