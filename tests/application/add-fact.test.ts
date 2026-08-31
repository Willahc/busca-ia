import { describe, it, expect, beforeEach } from "vitest";
import {
  createFactId,
  createSourceId,
  EPISTEMIC_STATUS,
  InvalidEpistemicTransitionError,
  MissingProvenanceError,
  Provenance,
  Source,
  SOURCE_TYPES,
} from "@/domain";
import { AddFact, ConflictError, EntityNotFoundError } from "@/application";
import { InMemoryFactRepository, InMemorySourceRepository } from "./in-memory";

describe("AddFact Use Case", () => {
  let factRepo: InMemoryFactRepository;
  let sourceRepo: InMemorySourceRepository;
  let useCase: AddFact;

  const validSourceId = createSourceId("SOURCE-OFFICIAL-001");
  const validProvenance = new Provenance({
    sourceId: validSourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "OPERATOR-APP-001",
  });

  beforeEach(async () => {
    factRepo = new InMemoryFactRepository();
    sourceRepo = new InMemorySourceRepository();
    useCase = new AddFact(factRepo, sourceRepo);

    await sourceRepo.save(
      new Source({
        id: validSourceId,
        type: SOURCE_TYPES.OFFICIAL_RECORD,
        label: "Official Civil Registry",
      })
    );
  });

  it("11. should register a valid UNVERIFIED Fact", async () => {
    const factId = createFactId("FACT-TEST-001");
    const fact = await useCase.execute({
      id: factId,
      subjectId: "SUBJECT-001",
      attribute: "hairColor",
      value: "black",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: validProvenance,
    });

    expect(fact.id).toBe(factId);
    expect(fact.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);

    const saved = await factRepo.findById(factId);
    expect(saved).not.toBeNull();
  });

  it("12. should reject AddFact when the referenced Source does not exist", async () => {
    const nonExistentSourceId = createSourceId("SOURCE-NON-EXISTENT");
    const invalidProvenance = new Provenance({
      sourceId: nonExistentSourceId,
      recordedAt: new Date(),
      recordedBy: "OPERATOR",
    });

    await expect(
      useCase.execute({
        id: createFactId("FACT-ERR-001"),
        subjectId: "SUBJECT-001",
        attribute: "eyeColor",
        value: "brown",
        epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
        provenance: invalidProvenance,
      })
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it("13. should fail when DERIVED fact is missing parent facts", async () => {
    const provenanceWithoutParents = new Provenance({
      sourceId: validSourceId,
      recordedAt: new Date(),
      recordedBy: "OPERATOR",
    });

    // Fails in domain constructor due to missing parentFactIds
    await expect(
      useCase.execute({
        id: createFactId("FACT-DERIVED-001"),
        subjectId: "SUBJECT-001",
        attribute: "age",
        value: 35,
        epistemicStatus: EPISTEMIC_STATUS.DERIVED,
        provenance: provenanceWithoutParents,
      })
    ).rejects.toBeInstanceOf(MissingProvenanceError);
  });

  it("14. should block promoting a SYNTHETIC fact to CONFIRMED via Domain invariants", async () => {
    const syntheticFact = await useCase.execute({
      id: createFactId("FACT-SYNTH-001"),
      subjectId: "SUBJECT-SIM-001",
      attribute: "simulatedLocation",
      value: "Zone Alpha",
      epistemicStatus: EPISTEMIC_STATUS.SYNTHETIC,
      provenance: validProvenance,
    });

    expect(() => {
      syntheticFact.confirm(validProvenance);
    }).toThrow(InvalidEpistemicTransitionError);
  });

  it("15. should allow updating technical confidence without altering epistemicStatus", async () => {
    const fact = await useCase.execute({
      id: createFactId("FACT-CONF-001"),
      subjectId: "SUBJECT-001",
      attribute: "heightEstimate",
      value: 175,
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: validProvenance,
      confidence: 0.3,
    });

    const updatedFact = fact.withUpdatedConfidence(0.99);

    expect(updatedFact.confidence).toBe(0.99);
    expect(updatedFact.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
  });
});