import { describe, it, expect } from "vitest";
import {
  createFactId,
  createSourceId,
  EPISTEMIC_STATUS,
  Fact,
  InvalidEpistemicTransitionError,
  Provenance,
} from "@/domain";

describe("Epistemic Invariants and Transitions", () => {
  const dummySourceId = createSourceId("SOURCE-TEST-002");
  const testProvenance = new Provenance({
    sourceId: dummySourceId,
    recordedAt: new Date("2026-08-31T10:00:00Z"),
    recordedBy: "OPERATOR-TEST-002",
  });

  const verificationProvenance = new Provenance({
    sourceId: createSourceId("SOURCE-OFFICIAL-001"),
    recordedAt: new Date("2026-08-31T11:00:00Z"),
    recordedBy: "OFFICIAL-AGENT-001",
    note: "Verified via official registry",
  });

  it("4. should strictly block promoting a SYNTHETIC fact to CONFIRMED", () => {
    const syntheticFact = new Fact({
      id: createFactId("FACT-SYNTH-001"),
      subjectId: "SUBJECT-SIM-001",
      attribute: "simulatedLocation",
      value: "Station X",
      epistemicStatus: EPISTEMIC_STATUS.SYNTHETIC,
      provenance: testProvenance,
    });

    expect(() => {
      syntheticFact.confirm(verificationProvenance);
    }).toThrow(InvalidEpistemicTransitionError);
  });

  it("5. should strictly block promoting a HYPOTHESIS fact directly to CONFIRMED", () => {
    const hypothesisFact = new Fact({
      id: createFactId("FACT-HYP-001"),
      subjectId: "SUBJECT-TEST-001",
      attribute: "possibleDestination",
      value: "Hospital Y",
      epistemicStatus: EPISTEMIC_STATUS.HYPOTHESIS,
      provenance: testProvenance,
    });

    expect(() => {
      hypothesisFact.confirm(verificationProvenance);
    }).toThrow(InvalidEpistemicTransitionError);
  });

  it("should permit promoting an UNVERIFIED fact to CONFIRMED with official verification provenance", () => {
    const unverifiedFact = new Fact({
      id: createFactId("FACT-UNVER-001"),
      subjectId: "SUBJECT-TEST-001",
      attribute: "clothingDescription",
      value: "blue jacket",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: testProvenance,
    });

    const confirmedFact = unverifiedFact.confirm(verificationProvenance);

    expect(confirmedFact.epistemicStatus).toBe(EPISTEMIC_STATUS.CONFIRMED);
    expect(confirmedFact.provenance.sourceId).toBe(createSourceId("SOURCE-OFFICIAL-001"));
    expect(unverifiedFact.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED); // Immutability check
  });

  it("16. should prevent direct property mutation on immutable domain objects", () => {
    const fact = new Fact({
      id: createFactId("FACT-TEST-IMMUTABLE"),
      subjectId: "SUBJECT-TEST-001",
      attribute: "eyeColor",
      value: "brown",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: testProvenance,
    });

    expect(() => {
      // @ts-expect-error Attempting runtime mutation of readonly property
      fact.epistemicStatus = EPISTEMIC_STATUS.CONFIRMED;
    }).toThrow();

    expect(() => {
      // @ts-expect-error Attempting runtime mutation of readonly property
      fact.value = "green";
    }).toThrow();
  });
});