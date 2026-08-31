import { describe, it, expect } from "vitest";
import {
  createCaseId,
  createEvidenceId,
  createSourceId,
  createTipId,
  DomainInvariantError,
  EPISTEMIC_STATUS,
  Evidence,
  Provenance,
  Tip,
} from "@/domain";

describe("Tip and Evidence Domain Models", () => {
  const dummyCaseId = createCaseId("CASE-TEST-001");
  const dummySourceId = createSourceId("SOURCE-CITIZEN-001");
  const dummyTipId = createTipId("TIP-TEST-001");
  const dummyEvidenceId = createEvidenceId("EVIDENCE-TEST-001");

  const provenance = new Provenance({
    sourceId: dummySourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    observedAt: new Date("2026-08-30T18:30:00Z"),
    recordedBy: "PUBLIC_PORTAL",
  });

  it("9. should preserve the original raw text of a Tip verbatim and immutably", () => {
    const rawReport = "Vi um rapaz parecido ontem perto da estacao de metro usando jaqueta escura.";

    const tip = new Tip({
      id: dummyTipId,
      caseId: dummyCaseId,
      sourceId: dummySourceId,
      originalText: rawReport,
      receivedAt: new Date("2026-08-31T09:00:00Z"),
      provenance,
    });

    expect(tip.originalText).toBe(rawReport);
    expect(tip.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
  });

  it("10. should block creating an incoming citizen Tip directly with epistemic status CONFIRMED", () => {
    expect(() => {
      new Tip({
        id: dummyTipId,
        caseId: dummyCaseId,
        sourceId: dummySourceId,
        originalText: "Achei a pessoa em tal endereco.",
        receivedAt: new Date(),
        epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
        provenance,
      });
    }).toThrow(DomainInvariantError);
  });

  it("12. should represent Evidence as an independent acquired entity", () => {
    const evidence = new Evidence({
      id: dummyEvidenceId,
      caseId: dummyCaseId,
      sourceId: dummySourceId,
      description: "Registro de atendimento na UPA Norte registrado em 30/08/2026.",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });

    expect(evidence.id).toBe(dummyEvidenceId);
    expect(evidence.caseId).toBe(dummyCaseId);
    expect(evidence.description).toBe("Registro de atendimento na UPA Norte registrado em 30/08/2026.");
    expect(evidence.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
  });
});