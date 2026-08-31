import { describe, it, expect } from "vitest";
import {
  TemporalInterval,
  TemporalParser,
  TemporalPoint,
} from "@/intelligence";

describe("Temporal Intelligence: Parser", () => {
  it("1. should parse YYYY as YEAR precision", () => {
    const pt = TemporalParser.parse("2026") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.year).toBe(2026);
    expect(pt.month).toBeUndefined();
    expect(pt.day).toBeUndefined();
    expect(pt.precision).toBe("YEAR");
    expect(pt.isApproximate).toBe(false);
  });

  it("2. should parse YYYY-MM as MONTH precision", () => {
    const pt = TemporalParser.parse("2026-08") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.year).toBe(2026);
    expect(pt.month).toBe(8);
    expect(pt.day).toBeUndefined();
    expect(pt.precision).toBe("MONTH");
  });

  it("3. should parse YYYY-MM-DD as DAY precision", () => {
    const pt = TemporalParser.parse("2026-08-31") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.year).toBe(2026);
    expect(pt.month).toBe(8);
    expect(pt.day).toBe(31);
    expect(pt.precision).toBe("DAY");
  });

  it("4. should parse ISO datetime with UTC Z as EXACT precision", () => {
    const pt = TemporalParser.parse("2026-08-31T15:30:00Z") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.year).toBe(2026);
    expect(pt.month).toBe(8);
    expect(pt.day).toBe(31);
    expect(pt.precision).toBe("EXACT");
    expect(pt.timestampMs).toBe(Date.parse("2026-08-31T15:30:00Z"));
  });

  it("5. should parse ISO datetime with timezone offset as EXACT precision", () => {
    const pt = TemporalParser.parse("2026-08-31T12:30:00-03:00") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.precision).toBe("EXACT");
    expect(pt.timestampMs).toBe(Date.parse("2026-08-31T12:30:00-03:00"));
  });

  it("6. should parse datetime without timezone as DAY/APPROXIMATE without inventing a timezone", () => {
    const pt = TemporalParser.parse("2026-08-31T15:30:00") as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.precision).toBe("DAY");
    expect(pt.isApproximate).toBe(true);
    expect(pt.timeIso).toBe("15:30:00");
  });

  it("7. should parse interval string as TemporalInterval", () => {
    const interval = TemporalParser.parse("2026-06/2026-08") as TemporalInterval;
    expect(interval).toBeInstanceOf(TemporalInterval);
    expect(interval.start?.precision).toBe("MONTH");
    expect(interval.start?.month).toBe(6);
    expect(interval.end?.precision).toBe("MONTH");
    expect(interval.end?.month).toBe(8);
    expect(interval.precision).toBe("INTERVAL");
  });

  it("8. should parse JavaScript Date object as EXACT precision", () => {
    const d = new Date("2026-08-31T12:00:00.000Z");
    const pt = TemporalParser.parse(d) as TemporalPoint;
    expect(pt).toBeInstanceOf(TemporalPoint);
    expect(pt.precision).toBe("EXACT");
    expect(pt.timestampMs).toBe(d.getTime());
  });

  it("9. should return null for invalid calendar dates and unsupported strings", () => {
    expect(TemporalParser.parse("2026-13")).toBeNull(); // invalid month
    expect(TemporalParser.parse("2026-02-30")).toBeNull(); // invalid day
    expect(TemporalParser.parse("ontem")).toBeNull();
    expect(TemporalParser.parse("semana passada")).toBeNull();
    expect(TemporalParser.parse("")).toBeNull();
    expect(TemporalParser.parse(null)).toBeNull();
    expect(TemporalParser.parse(undefined)).toBeNull();
  });
});