export const TEMPORAL_FACT_ATTRIBUTES = {
  MISSING_AT: "missing.at",
  LAST_SEEN_AT: "last_seen.at",
  OBSERVED_AT: "observed.at",
  EVENT_START: "event.start",
  EVENT_END: "event.end",
  DATE_OF_BIRTH: "date_of_birth",
} as const;

export type TemporalFactAttribute =
  (typeof TEMPORAL_FACT_ATTRIBUTES)[keyof typeof TEMPORAL_FACT_ATTRIBUTES];

const KNOWN_TEMPORAL_ALIASES: Record<string, TemporalFactAttribute> = {
  "missing.at": "missing.at",
  "missing_at": "missing.at",
  "missing.date": "missing.at",
  "last_seen.at": "last_seen.at",
  "last_seen_at": "last_seen.at",
  "last_seen": "last_seen.at",
  "observed.at": "observed.at",
  "observed_at": "observed.at",
  "sighting_at": "observed.at",
  "sighting.date": "observed.at",
  "event.start": "event.start",
  "event_start": "event.start",
  "event.end": "event.end",
  "event_end": "event.end",
  "date_of_birth": "date_of_birth",
  "birth_date": "date_of_birth",
};

export function normalizeTemporalFactAttribute(
  attribute: string
): TemporalFactAttribute | null {
  const normalized = attribute.trim().toLowerCase();
  return KNOWN_TEMPORAL_ALIASES[normalized] ?? null;
}