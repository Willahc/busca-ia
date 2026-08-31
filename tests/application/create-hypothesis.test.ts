import { describe, it, expect, beforeEach } from "vitest";
import {
  Case,
  createCaseId,
  createEvidenceId,
  createHypothesisId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  Evidence,
  Hypothesis,
  HYPOTHESIS_STATUS,
  Provenance,
} from "@/domain";
import { CreateHypothesis, ConflictError, EntityNotFoundError } from "@/application";
import {
  InMemoryCaseRepository,
  InMemoryEvidenceRepository,
  InMemoryHypothesisRepository,
} from "./in-memory";

describe("CreateHypothesis Use Case", () => {
  let hypothesisRepo: InMemoryHypothesisRepository;
  let caseRepo: InMemoryCaseRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let useCase: CreateHypothesis;

  const validCaseId = createCaseId("CASE-TEST-001");
  const validEvidenceId1 = createEvidenceId("EV-001");
  const validEvidenceId2 = createEvidenceId("EV-002");

  beforeEach(async () => {
    hypothesisRepo = new InMemoryHypothesisRepository();
    caseRepo = new InMemoryCaseRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    useCase = new CreateHypothesis(hypothesisRepo, caseRepo, evidenceRepo);

    await caseRepo.save(
      new Case({
        id: validCaseId,
        personId: createPersonId("PERSON-001"),
        missingEventId: createMissingEventId("EVENT-001"),
      })
    );

    const provenance = new Provenance({
      sourceId: createSourceId("SOURCE-001"),
      recordedAt: new Date(),
      recordedBy: "TEST_USER",
    });

    await evidenceRepo.save(
      new Evidence({
        id: validEvidenceId1,
        caseId: validCaseId,
        sourceId: createSourceId("SOURCE-001"),
        description: "Evidence 1",
        provenance,
      })
    );

    await evidenceRepo.save(
      new Evidence({
        id: validEvidenceId2,
        caseId: validCaseId,
        sourceId: createSourceId("SOURCE-001"),
        description: "Evidence 2",
        provenance,
      })
    );
  });

  it("23. should create a hypothesis with zero initial evidence (open hypothesis)", async () => {
    const hypId = createHypothesisId("HYP-001");
    const hypothesis = await useCase.execute({
      id: hypId,
      caseId: validCaseId,
      statement: "Possible transit route via northern bus terminal.",
    });

    expect(hypothesis.id).toBe(hypId);
    expect(hypothesis.status).toBe(HYPOTHESIS_STATUS.OPEN);
    expect(hypothesis.supportingEvidenceIds).toHaveLength(0);
    expect(hypothesis.contradictingEvidenceIds).toHaveLength(0);

    const saved = await hypothesisRepo.findById(hypId);
    expect(saved).not.toBeNull();
  });

  it("24. should reject hypothesis creation if referenced evidence does not exist", async () => {
    const nonExistentEvidence = createEvidenceId("EV-NON-EXISTENT");

    await expect(
      useCase.execute({
        id: createHypothesisId("HYP-ERR-001"),
        caseId: validCaseId,
        statement: "Hypothesis with invalid evidence",
        supportingEvidenceIds: [nonExistentEvidence],
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("25 & 26 & 27. should preserve supporting and contradicting evidence IDs and maintain Hypothesis type", async () => {
    const hypId = createHypothesisId("HYP-MULTI-001");
    const hypothesis = await useCase.execute({
      id: hypId,
      caseId: validCaseId,
      statement: "Candidate seen in Shelter Alpha matches Person X.",
      supportingEvidenceIds: [validEvidenceId1],
      contradictingEvidenceIds: [validEvidenceId2],
    });

    expect(hypothesis.supportingEvidenceIds).toContain(validEvidenceId1);
    expect(hypothesis.contradictingEvidenceIds).toContain(validEvidenceId2);
    expect(hypothesis).toBeInstanceOf(Hypothesis);
  });
});