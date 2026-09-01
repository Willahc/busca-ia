import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as runEvidenceAssessment } from "@/app/api/v1/cases/[caseId]/evidence-assessment/route";
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
  type PrivacyLevel,
  Provenance,
  Source,
} from "@/domain";
import {
  ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
  INVESTIGATIVE_CONCLUSIONS,
} from "@/intelligence";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, PRIVACY_LEVELS } from "@/security";

function request(caseId: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/v1/cases/${caseId}/evidence-assessment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("API Boundary: protected evidence assessment", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });
  afterEach(() => resetApplicationContainer());

  const lawHeaders = {
    "x-actor-id": "OFFICER-ASSESSMENT-API",
    "x-actor-roles": "LAW_ENFORCEMENT",
    "x-request-id": "REQUEST-ASSESSMENT-DEFAULT",
  };

  async function setup(
    suffix: string,
    privacyLevel: PrivacyLevel = PRIVACY_LEVELS.RESTRICTED
  ) {
    const container = globalThis.__buscaIaAppContainer!;
    const caseId = createCaseId(`CASE-ASSESSMENT-API-${suffix}`);
    const leftPersonId = createPersonId(`PERSON-ASSESSMENT-LEFT-${suffix}`);
    const rightPersonId = createPersonId(`PERSON-ASSESSMENT-RIGHT-${suffix}`);
    const sourceId = createSourceId(`SOURCE-ASSESSMENT-API-${suffix}`);
    const missingEventId = createMissingEventId(`EVENT-ASSESSMENT-API-${suffix}`);
    const provenance = () =>
      new Provenance({
        sourceId,
        recordedAt: new Date("2026-09-01T12:00:00Z"),
        recordedBy: "SYNTHETIC-ASSESSMENT-API",
      });
    await container.repositories.sourceRepository.save(
      new Source({ id: sourceId, type: "SYNTHETIC_TEST", label: "Synthetic API source" })
    );
    await container.repositories.personRepository.save(new Person({ id: leftPersonId }));
    await container.repositories.personRepository.save(new Person({ id: rightPersonId }));
    await container.repositories.missingEventRepository.save(
      new MissingEvent({ id: missingEventId, personId: leftPersonId })
    );
    await container.repositories.caseRepository.save(
      new Case({ id: caseId, personId: leftPersonId, missingEventId, privacyLevel })
    );
    await container.repositories.factRepository.save(
      new Fact({
        id: createFactId(`FACT-ASSESSMENT-LINK-${suffix}`),
        subjectId: caseId,
        attribute: ENTITY_RESOLUTION_CASE_CANDIDATE_FACT,
        value: rightPersonId,
        epistemicStatus: "SYNTHETIC",
        provenance: provenance(),
      })
    );
    const definitions = [
      ["NAME", "person.full_name", "DOCUMENT-RAW-SHOULD-NOT-LEAK"],
      ["DOB", "person.birth_date", "1992-12-15"],
      ["MOTHER", "person.mother_name", "PARENTE SINTETICO"],
    ] as const;
    for (const [attributeSuffix, attribute, value] of definitions) {
      for (const [side, personId] of [
        ["LEFT", leftPersonId],
        ["RIGHT", rightPersonId],
      ] as const) {
        await container.repositories.factRepository.save(
          new Fact({
            id: createFactId(`FACT-ASSESSMENT-${suffix}-${side}-${attributeSuffix}`),
            subjectId: personId,
            attribute,
            value,
            epistemicStatus: "CONFIRMED",
            provenance: provenance(),
          })
        );
      }
    }
    return { caseId, leftPersonId, rightPersonId };
  }

  async function post(
    fixture: Awaited<ReturnType<typeof setup>>,
    headers: Record<string, string>,
    body: unknown = {
      leftPersonId: fixture.leftPersonId,
      rightPersonId: fixture.rightPersonId,
    }
  ) {
    return runEvidenceAssessment(request(fixture.caseId, body, headers), {
      params: Promise.resolve({ caseId: fixture.caseId }),
    });
  }

  it("returns a privacy-minimized categorical assessment and SUCCEEDED audit", async () => {
    const fixture = await setup("SUCCESS");
    const requestId = "REQUEST-ASSESSMENT-SUCCESS";
    const response = await post(fixture, { ...lawHeaders, "x-request-id": requestId });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.conclusion).toBe(
      INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_MEANINGFUL_EVIDENCE
    );
    expect(json.data.highValueSignals.length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain("DOCUMENT-RAW-SHOULD-NOT-LEAK");
    expect(json.data).not.toHaveProperty("score");
    expect(json.data).not.toHaveProperty("probability");
    expect(json.data).not.toHaveProperty("identityConfirmed");

    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe(AUDIT_ACTIONS.EVIDENCE_ASSESSMENT_RUN);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.SUCCEEDED);
    expect(audits[0].resourceId).toBe(
      `caseId=${fixture.caseId};leftPersonId=${fixture.leftPersonId};rightPersonId=${fixture.rightPersonId}`
    );
    expect(audits[0]).not.toHaveProperty("assessment");
  });

  it("records DENIED for unauthenticated and disallowed SYSTEM_ADMIN access", async () => {
    const fixture = await setup("DENIED");
    const requestId = "REQUEST-ASSESSMENT-UNAUTHENTICATED";
    expect((await post(fixture, { "x-request-id": requestId })).status).toBe(401);
    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits[0]).toMatchObject({
      action: AUDIT_ACTIONS.EVIDENCE_ASSESSMENT_RUN,
      outcome: AUDIT_OUTCOMES.DENIED,
    });
    expect(
      (
        await post(fixture, {
          "x-actor-id": "ADMIN-ASSESSMENT",
          "x-actor-roles": "SYSTEM_ADMIN",
          "x-request-id": "REQUEST-ASSESSMENT-ADMIN",
        })
      ).status
    ).toBe(403);
  });

  it("records FAILED for an authenticated invalid request", async () => {
    const fixture = await setup("FAILED");
    const requestId = "REQUEST-ASSESSMENT-FAILED";
    const response = await post(
      fixture,
      { ...lawHeaders, "x-request-id": requestId },
      { leftPersonId: fixture.leftPersonId }
    );
    expect(response.status).toBe(400);
    const audits = await globalThis.__buscaIaAppContainer!.repositories.auditRepository.findByRequestId(
      requestId
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe(AUDIT_OUTCOMES.FAILED);
  });

  it("enforces case scope, SEALED, and LAW_ENFORCEMENT_ONLY policies", async () => {
    const sealed = await setup("SEALED", PRIVACY_LEVELS.SEALED);
    expect((await post(sealed, lawHeaders)).status).toBe(403);

    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
    const lawOnly = await setup("LAW-ONLY", PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY);
    expect(
      (
        await post(lawOnly, {
          "x-actor-id": "ANALYST-ASSESSMENT-API",
          "x-actor-roles": "ANALYST",
          "x-actor-case-scopes": lawOnly.caseId,
          "x-request-id": "REQUEST-ASSESSMENT-LAW-ONLY-ANALYST",
        })
      ).status
    ).toBe(403);
    expect((await post(lawOnly, lawHeaders)).status).toBe(200);
  });
});
