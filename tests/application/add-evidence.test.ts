import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createEvidenceId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  EPISTEMIC_STATUS,
  Provenance,
  Source,
  SOURCE_TYPES,
} from "@/domain";
import { AddEvidence, ConflictError, EntityNotFoundError } from "@/application";
import {
  InMemoryCaseRepository,
  InMemoryEvidenceRepository,
  InMemorySourceRepository,
} from "./in-memory";

describe("AddEvidence Use Case", () => {
  let evidenceRepo: InMemoryEvidenceRepository;
  let caseRepo: InMemoryCaseRepository;
  let sourceRepo: InMemorySourceRepository;
  let useCase: AddEvidence;

  const validCaseId = createCaseId("CASE-TEST-001");
  const validSourceId = createSourceId("SOURCE-HEALTH-001");
  const provenance = new Provenance({
    sourceId: validSourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "HOSPITAL_SYS_AGENT",
  });

  beforeEach(async () => {
    evidenceRepo = new InMemoryEvidenceRepository();
    caseRepo = new InMemoryCaseRepository();
    sourceRepo = new InMemorySourceRepository();
    useCase = new AddEvidence(evidenceRepo, caseRepo, sourceRepo);

    await caseRepo.save(
      new Case({
        id: validCaseId,
        personId: createPersonId("PERSON-001"),
        missingEventId: createMissingEventId("EVENT-001"),
      })
    );

    await sourceRepo.save(
      new Source({
        id: validSourceId,
        type: SOURCE_TYPES.HEALTH_INSTITUTION,
        label: "Hospital Emergency Record",
      })
    );
  });

  it("20. should require an existing Case", async () => {
    await expect(
      useCase.execute({
        id: createEvidenceId("EV-001"),
        caseId: createCaseId("CASE-UNKNOWN"),
        sourceId: validSourceId,
        description: "Medical triage log",
        provenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("21. should require an existing Source", async () => {
    const nonExistentSourceId = createSourceId("SOURCE-UNKNOWN");
    const unkProvenance = new Provenance({
      sourceId: nonExistentSourceId,
      recordedAt: new Date(),
      recordedBy: "TEST",
    });

    await expect(
      useCase.execute({
        id: createEvidenceId("EV-002"),
        caseId: validCaseId,
        sourceId: nonExistentSourceId,
        description: "Medical triage log",
        provenance: unkProvenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("22. should add Evidence as an acquired finding without auto-modifying any hypothesis", async () => {
    const evidenceId = createEvidenceId("EV-VALID-001");
    const evidence = await useCase.execute({
      id: evidenceId,
      caseId: validCaseId,
      sourceId: validSourceId,
      description: "Emergency room admission registry on 30/08/2026.",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });

    expect(evidence.id).toBe(evidenceId);
    expect(evidence.description).toBe("Emergency room admission registry on 30/08/2026.");

    const saved = await evidenceRepo.findById(evidenceId);
    expect(saved).not.toBeNull();
  });
});