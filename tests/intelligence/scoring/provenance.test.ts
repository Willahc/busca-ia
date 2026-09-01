import { describe, expect, it } from "vitest";
import { createFactId, createPersonId, createSourceId, Fact, Provenance } from "@/domain";
import { areIndependentSources, rootFactIdsFor } from "@/intelligence/scoring";

function makeFact(id: string, source: string, parents?: readonly string[]) {
  return new Fact({
    id: createFactId(id),
    subjectId: createPersonId("PERSON-PROVENANCE-SYNTHETIC"),
    attribute: "person.full_name",
    value: "Pessoa Sintetica",
    epistemicStatus: parents ? "DERIVED" : "CONFIRMED",
    provenance: new Provenance({
      sourceId: createSourceId(source),
      recordedAt: new Date("2026-09-01T00:00:00Z"),
      recordedBy: "SYNTHETIC-TEST",
      parentFactIds: parents?.map(createFactId),
    }),
  });
}

describe("Scoring provenance rules", () => {
  it("proves direct distinct sources independent", () => {
    const left = makeFact("FACT-DIRECT-A", "SOURCE-DIRECT-A");
    const right = makeFact("FACT-DIRECT-B", "SOURCE-DIRECT-B");
    expect(areIndependentSources([left.id], [right.id], [left, right])).toBe(true);
  });

  it("rejects same source and shared derived root", () => {
    const sameA = makeFact("FACT-SAME-A", "SOURCE-SAME");
    const sameB = makeFact("FACT-SAME-B", "SOURCE-SAME");
    expect(areIndependentSources([sameA.id], [sameB.id], [sameA, sameB])).toBe(false);

    const root = makeFact("FACT-ROOT", "SOURCE-ROOT");
    const derivedA = makeFact("FACT-DERIVED-A", "SOURCE-SYSTEM-A", [root.id]);
    const derivedB = makeFact("FACT-DERIVED-B", "SOURCE-SYSTEM-B", [root.id]);
    expect(areIndependentSources([derivedA.id], [derivedB.id], [root, derivedA, derivedB])).toBe(false);
    expect(rootFactIdsFor([derivedA.id, derivedB.id], [root, derivedA, derivedB])).toEqual([root.id]);
  });

  it("fails conservatively when a parent is unresolved", () => {
    const derived = makeFact("FACT-UNRESOLVED", "SOURCE-SYSTEM", ["FACT-NOT-LOADED"]);
    const direct = makeFact("FACT-OTHER", "SOURCE-OTHER");
    expect(areIndependentSources([derived.id], [direct.id], [derived, direct])).toBe(false);
  });
});
