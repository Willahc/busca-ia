import { TemporalPoint } from "../model/temporal-point";
import { TemporalInterval } from "../model/temporal-interval";

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export class TemporalParser {
  /**
   * Parses a raw date, string, or object into a deterministic TemporalPoint or TemporalInterval.
   * Returns null if unparseable or empty.
   */
  static parse(
    input: unknown
  ): TemporalPoint | TemporalInterval | null {
    if (input === null || input === undefined) {
      return null;
    }

    if (input instanceof Date) {
      if (isNaN(input.getTime())) {
        return null;
      }
      return new TemporalPoint({
        year: input.getUTCFullYear(),
        month: input.getUTCMonth() + 1,
        day: input.getUTCDate(),
        timeIso: input.toISOString().substring(11, 19) + "Z",
        timestampMs: input.getTime(),
        precision: "EXACT",
        rawExpression: input.toISOString(),
      });
    }

    if (typeof input !== "string") {
      return null;
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return null;
    }

    // 1. Check for explicit Interval formats: "start / end", "start..end", "start - end"
    if (trimmed.includes("/") || trimmed.includes("..")) {
      const parts = trimmed.includes("/") ? trimmed.split("/") : trimmed.split("..");
      if (parts.length === 2) {
        const startPoint = TemporalParser.parse(parts[0].trim());
        const endPoint = TemporalParser.parse(parts[1].trim());
        if (
          (startPoint instanceof TemporalPoint || startPoint === null) &&
          (endPoint instanceof TemporalPoint || endPoint === null) &&
          (startPoint !== null || endPoint !== null)
        ) {
          return new TemporalInterval({
            start: startPoint instanceof TemporalPoint ? startPoint : undefined,
            end: endPoint instanceof TemporalPoint ? endPoint : undefined,
            precision: "INTERVAL",
            rawExpression: trimmed,
          });
        }
      }
    }

    // 2. Format: YYYY (Year only)
    const yearMatch = /^(\d{4})$/.exec(trimmed);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return new TemporalPoint({
        year,
        precision: "YEAR",
        rawExpression: trimmed,
      });
    }

    // 3. Format: YYYY-MM (Month only)
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (monthMatch) {
      const year = parseInt(monthMatch[1], 10);
      const month = parseInt(monthMatch[2], 10);
      if (month >= 1 && month <= 12) {
        return new TemporalPoint({
          year,
          month,
          precision: "MONTH",
          rawExpression: trimmed,
        });
      }
      return null;
    }

    // 4. Format: YYYY-MM-DD (Day only)
    const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dayMatch) {
      const year = parseInt(dayMatch[1], 10);
      const month = parseInt(dayMatch[2], 10);
      const day = parseInt(dayMatch[3], 10);
      if (month >= 1 && month <= 12) {
        const maxDays = getDaysInMonth(year, month);
        if (day >= 1 && day <= maxDays) {
          return new TemporalPoint({
            year,
            month,
            day,
            precision: "DAY",
            rawExpression: trimmed,
          });
        }
      }
      return null;
    }

    // 5. Format: ISO 8601 with explicit Timezone (Z or +/-HH:mm)
    const isoWithTzMatch =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(
        trimmed
      );
    if (isoWithTzMatch) {
      const year = parseInt(isoWithTzMatch[1], 10);
      const month = parseInt(isoWithTzMatch[2], 10);
      const day = parseInt(isoWithTzMatch[3], 10);
      const hour = parseInt(isoWithTzMatch[4], 10);
      const min = parseInt(isoWithTzMatch[5], 10);
      const sec = parseInt(isoWithTzMatch[6], 10);

      if (
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= getDaysInMonth(year, month) &&
        hour >= 0 &&
        hour <= 23 &&
        min >= 0 &&
        min <= 59 &&
        sec >= 0 &&
        sec <= 59
      ) {
        const parsedMs = Date.parse(trimmed);
        if (!isNaN(parsedMs)) {
          return new TemporalPoint({
            year,
            month,
            day,
            timeIso: `${isoWithTzMatch[4]}:${isoWithTzMatch[5]}:${isoWithTzMatch[6]}${isoWithTzMatch[8]}`,
            timestampMs: parsedMs,
            precision: "EXACT",
            rawExpression: trimmed,
          });
        }
      }
      return null;
    }

    // 6. Datetime without explicit timezone offset (e.g. 2026-08-31T15:30:00)
    // CRITICAL: Do NOT invent a local timezone offset like America/Sao_Paulo or UTC
    const dtNoTzMatch =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
    if (dtNoTzMatch) {
      const year = parseInt(dtNoTzMatch[1], 10);
      const month = parseInt(dtNoTzMatch[2], 10);
      const day = parseInt(dtNoTzMatch[3], 10);
      if (
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= getDaysInMonth(year, month)
      ) {
        return new TemporalPoint({
          year,
          month,
          day,
          timeIso: `${dtNoTzMatch[4]}:${dtNoTzMatch[5]}:${dtNoTzMatch[6]}`,
          precision: "DAY",
          isApproximate: true, // Marked approximate because timezone is missing
          rawExpression: trimmed,
        });
      }
      return null;
    }

    return null;
  }
}