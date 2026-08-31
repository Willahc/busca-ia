import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  createTipId,
  DomainInvariantError,
  EPISTEMIC_STATUS,
  Provenance,
  Source,
  SOURCE_TYPES,
} from "@/domain";
import { RegisterTip, ConflictError, EntityNotFoundError } from "@/application";
import {
  InMemoryCaseRepository,
  InMemorySourceRepository,
  InMemoryTipRepository,
} from "./in-memory";

describe("RegisterTip Use Case", () => {
  let tipRepo: InMemoryTipRepository;
  let caseRepo: InMemoryCaseRepository;
  let sourceRepo: InMemorySourceRepository;
  let useCase: RegisterTip;

  const validCaseId = createCaseId("CASE-TEST-001");
  const validSourceId = createSourceId("SOURCE-CITIZEN-001");
  const provenance = new Provenance({
    sourceId: validSourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "PUBLIC_PORTAL",
  });

  beforeEach(async () => {
    tipRepo = new InMemoryTipRepository();
    caseRepo = new InMemoryCaseRepository();
    sourceRepo = new InMemorySourceRepository();
    useCase = new RegisterTip(tipRepo, caseRepo, sourceRepo);

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
        type: SOURCE_TYPES.AUTHENTICATED_CITIZEN,
        label: "Citizen Portal User",
      })
    );
  });

  it("16. should require an existing Case", async () => {
    const nonExistentCaseId = createCaseId("CASE-UNKNOWN");
    await expect(
      useCase.execute({
        id: createTipId("TIP-001"),
        caseId: nonExistentCaseId,
        sourceId: validSourceId,
        originalText: "Relato de teste",
        receivedAt: new Date(),
        provenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("17. should require an existing Source", async () => {
    const nonExistentSourceId = createSourceId("SOURCE-UNKNOWN");
    const unkProvenance = new Provenance({
      sourceId: nonExistentSourceId,
      recordedAt: new Date(),
      recordedBy: "TEST",
    });

    await expect(
      useCase.execute({
        id: createTipId("TIP-002"),
        caseId: validCaseId,
        sourceId: nonExistentSourceId,
        originalText: "Relato de teste",
        receivedAt: new Date(),
        provenance: unkProvenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("18 & 19. should register tip preserving originalText string-for-string and defaulting citizen tip to UNVERIFIED", async () => {
    const tipId = createTipId("TIP-VALID-001");
    const rawText = "Vi uma pessoa parecida na praca central por volta das 14h usando boné azul.";

    const tip = await useCase.execute({
      id: tipId,
      caseId: validCaseId,
      sourceId: validSourceId,
      originalText: rawText,
      receivedAt: new Date("2026-08-31T09:30:00Z"),
      provenance,
    });

    expect(tip.originalText).toBe(rawText);
    expect(tip.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);

    const saved = await tipRepo.findById(tipId);
    expect(saved).not.toBeNull();
    expect(saved?.originalText).toBe(rawText);
  });
});