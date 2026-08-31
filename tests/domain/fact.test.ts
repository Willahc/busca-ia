import { describe, it, expect } from "vitest";
import {
  createFactId,
  createSourceId,
  EPISTEMIC_STATUS,
  Fact,
  MissingProvenanceError,
  Provenance,
  DomainInvariantError,
} from "@/domain";

describe("Fact Domain Entity", () => {
  const dummySourceId = createSourceId("SOURCE-TEST-001");
  const dummyFactId = createFactId("FACT-TEST-001");
  const validProvenance = new Provenance({
    sourceId: dummySourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "OPERATOR-TEST-001",
  });

  it("1. should successfully create a valid UNVERIFIED Fact", () => {
    const fact = new Fact({
      id: dummyFactId,
      subjectId: "SUBJECT-TEST-001",
      attribute: "hairColor",
      value: "dark brown",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: validProvenance,
    });

    expect(fact.id).toBe(dummyFactId);
    expect(fact.attribute).toBe("hairColor");
    expect(fact.value).toBe("dark brown");
    expect(fact.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
    expect(fact.provenance.sourceId).toBe(dummySourceId);
  });

  it("2. should require valid Provenance with recordedBy and recordedAt", () => {
    expect(() => {
      new Fact({
        id: dummyFactId,
        subjectId: "SUBJECT-TEST-001",
        attribute: "heightEstimate",
        value: 175,
        epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
        // @ts-expect-error Testing missing provenance
        provenance: null,
      });
    }).toThrow(MissingProvenanceError);
  });

  it("3. should enforce that a DERIVED fact requires parentFactIds in its provenance", () => {
    const provenanceWithoutParents = new Provenance({
      sourceId: dummySourceId,
      recordedAt: new Date(),
      recordedBy: "SYSTEM-TEST",
    });

    expect(() => {
      new Fact({
        id: dummyFactId,
        subjectId: "SUBJECT-TEST-001",
        attribute: "calculatedAge",
        value: 30,
        epistemicStatus: EPISTEMIC_STATUS.DERIVED,
        provenance: provenanceWithoutParents,
      });
    }).toThrow(MissingProvenanceError);

    const provenanceWithParents = new Provenance({
      sourceId: dummySourceId,
      recordedAt: new Date(),
      recordedBy: "SYSTEM-TEST",
      parentFactIds: [createFactId("FACT-TEST-PARENT-001")],
    });

    const derivedFact = new Fact({
      id: dummyFactId,
      subjectId: "SUBJECT-TEST-001",
      attribute: "calculatedAge",
      value: 30,
      epistemicStatus: EPISTEMIC_STATUS.DERIVED,
      provenance: provenanceWithParents,
    });

    expect(derivedFact.epistemicStatus).toBe(EPISTEMIC_STATUS.DERIVED);
    expect(derivedFact.provenance.parentFactIds).toHaveLength(1);
  });

  it("6. should update technical confidence without altering epistemicStatus", () => {
    const unverifiedFact = new Fact({
      id: dummyFactId,
      subjectId: "SUBJECT-TEST-001",
      attribute: "approximateHeight",
      value: 180,
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: validProvenance,
      confidence: 0.4,
    });

    const updatedFact = unverifiedFact.withUpdatedConfidence(0.95);

    expect(updatedFact.confidence).toBe(0.95);
    expect(updatedFact.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
    expect(updatedFact.epistemicStatus).not.toBe(EPISTEMIC_STATUS.CONFIRMED);
  });

  it("should reject confidence values outside [0.0, 1.0]", () => {
    expect(() => {
      new Fact({
        id: dummyFactId,
        subjectId: "SUBJECT-TEST-001",
        attribute: "height",
        value: 180,
        epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
        provenance: validProvenance,
        confidence: 1.5,
      });
    }).toThrow(DomainInvariantError);
  });
});