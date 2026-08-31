import { describe, it, expect } from "vitest";
import {
  CONTRADICTION_SEVERITY,
  createCaseId,
  createEvidenceId,
  createHypothesisId,
  evaluateAttributeComparison,
  Hypothesis,
  HYPOTHESIS_STATUS,
} from "@/domain";

describe("Hypothesis and Contradiction Semantics", () => {
  const dummyCaseId = createCaseId("CASE-TEST-001");
  const dummyHypothesisId = createHypothesisId("HYPOTHESIS-TEST-001");
  const dummyEvidence1 = createEvidenceId("EVIDENCE-TEST-001");
  const dummyEvidence2 = createEvidenceId("EVIDENCE-TEST-002");

  it("7. should treat missing information as neutral and NOT as a contradiction", () => {
    // Scenario: Person record has no blood type registered (undefined), candidate has 'O+'
    const evalResult = evaluateAttributeComparison("bloodType", undefined, "O+");

    expect(evalResult.hasContradiction).toBe(false);
    expect(evalResult.isMissingInformation).toBe(true);
    expect(evalResult.severity).toBeUndefined();
  });

  it("8. should distinguish between soft divergence, hard contradiction, and missing information", () => {
    // 1. Missing information
    const missingEval = evaluateAttributeComparison("birthYear", 1995, undefined);
    expect(missingEval.hasContradiction).toBe(false);
    expect(missingEval.isMissingInformation).toBe(true);

    // 2. Soft divergence (e.g. estimated age range slight variation)
    const softEval = evaluateAttributeComparison("estimatedAge", "25", "27");
    expect(softEval.hasContradiction).toBe(true);
    expect(softEval.isMissingInformation).toBe(false);
    expect(softEval.severity).toBe(CONTRADICTION_SEVERITY.SOFT);

    // 3. Hard contradiction (e.g. biological incompatibility: observed birth 1995 vs candidate birth 1950)
    const hardEval = evaluateAttributeComparison(
      "birthYear",
      1995,
      1950,
      (a, b) => Math.abs(a - b) > 10 // predicate for hard contradiction
    );
    expect(hardEval.hasContradiction).toBe(true);
    expect(hardEval.isMissingInformation).toBe(false);
    expect(hardEval.severity).toBe(CONTRADICTION_SEVERITY.HARD);
  });

  it("11. should keep Hypothesis as a Hypothesis even when status becomes SUPPORTED (never converting to Fact)", () => {
    const hypothesis = new Hypothesis({
      id: dummyHypothesisId,
      caseId: dummyCaseId,
      statement: "Candidate registered at Shelter Alpha corresponds to Missing Person.",
      status: HYPOTHESIS_STATUS.OPEN,
    });

    const supportedHypothesis = hypothesis.addSupportingEvidence(dummyEvidence1);

    expect(supportedHypothesis.status).toBe(HYPOTHESIS_STATUS.SUPPORTED);
    expect(supportedHypothesis.supportingEvidenceIds).toContain(dummyEvidence1);

    // Verify Hypothesis is an instance of Hypothesis, not Fact, and does not expose fact confirmation methods
    expect(supportedHypothesis).toBeInstanceOf(Hypothesis);
    // @ts-expect-error Hypothesis must NOT have confirmAsFact method
    expect(supportedHypothesis.confirmAsFact).toBeUndefined();
  });

  it("should update hypothesis to WEAKENED when contradicting evidence is added", () => {
    const supportedHypothesis = new Hypothesis({
      id: dummyHypothesisId,
      caseId: dummyCaseId,
      statement: "Person was seen at Station Beta on 30/08.",
      status: HYPOTHESIS_STATUS.SUPPORTED,
      supportingEvidenceIds: [dummyEvidence1],
    });

    const weakenedHypothesis = supportedHypothesis.addContradictingEvidence(dummyEvidence2);

    expect(weakenedHypothesis.status).toBe(HYPOTHESIS_STATUS.WEAKENED);
    expect(weakenedHypothesis.contradictingEvidenceIds).toContain(dummyEvidence2);
  });
});