import { describe, it, expect } from "vitest";
import {
  TemporalInterval,
  TemporalParser,
  TemporalPoint,
  TemporalRelationEvaluator,
} from "@/intelligence";

describe("Temporal Intelligence: Relations", () => {
  it("1. should evaluate exact A < exact B as BEFORE", () => {
    const a = TemporalParser.parse("2026-08-31T10:00:00Z");
    const b = TemporalParser.parse("2026-08-31T14:00:00Z");

    const rel = TemporalRelationEvaluator.evaluate(a!, b!, "EV-A", "EV-B");
    expect(rel.relation).toBe("BEFORE");
  });

  it("2. should evaluate exact A > exact B as AFTER", () => {
    const a = TemporalParser.parse("2026-08-31T16:00:00Z");
    const b = TemporalParser.parse("2026-08-31T14:00:00Z");

    const rel = TemporalRelationEvaluator.evaluate(a!, b!, "EV-A", "EV-B");
    expect(rel.relation).toBe("AFTER");
  });

  it("3. should evaluate identical exact timestamps as EQUAL", () => {
    const a = TemporalParser.parse("2026-08-31T14:00:00Z");
    const b = TemporalParser.parse("2026-08-31T14:00:00Z");

    const rel = TemporalRelationEvaluator.evaluate(a!, b!, "EV-A", "EV-B");
    expect(rel.relation).toBe("EQUAL");
  });

  it("4. should evaluate month containing day as CONTAINS and day inside month as CONTAINED_BY", () => {
    const month = TemporalParser.parse("2026-08");
    const day = TemporalParser.parse("2026-08-15");

    const rel1 = TemporalRelationEvaluator.evaluate(month!, day!, "MONTH-EV", "DAY-EV");
    expect(rel1.relation).toBe("CONTAINS");

    const rel2 = TemporalRelationEvaluator.evaluate(day!, month!, "DAY-EV", "MONTH-EV");
    expect(rel2.relation).toBe("CONTAINED_BY");
  });

  it("5. should evaluate overlapping intervals as OVERLAPS", () => {
    const intA = TemporalParser.parse("2026-06/2026-08") as TemporalInterval;
    const intB = TemporalParser.parse("2026-07/2026-09") as TemporalInterval;

    const rel = TemporalRelationEvaluator.evaluate(intA, intB, "INT-A", "INT-B");
    expect(rel.relation).toBe("OVERLAPS");
  });

  it("6. should evaluate year containing month within the year", () => {
    const year = TemporalParser.parse("2026");
    const month = TemporalParser.parse("2026-05");

    const rel = TemporalRelationEvaluator.evaluate(year!, month!, "YEAR-EV", "MONTH-EV");
    expect(rel.relation).toBe("CONTAINS");
  });

  it("7. should evaluate missing or unknown expression as INDETERMINATE", () => {
    const exact = TemporalParser.parse("2026-08-31T14:00:00Z");
    const unknownPt = new TemporalPoint({ year: 0, precision: "UNKNOWN" });

    const rel1 = TemporalRelationEvaluator.evaluate(exact!, unknownPt, "EXACT-EV", "UNK-EV");
    expect(rel1.relation).toBe("INDETERMINATE");

    const rel2 = TemporalRelationEvaluator.evaluate(undefined, exact!, "UNDEF-EV", "EXACT-EV");
    expect(rel2.relation).toBe("INDETERMINATE");
  });
});