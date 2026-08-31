/**
 * Conservative, deterministic text normalization.
 *
 * Accents and Unicode composition are folded, case and whitespace are normalized,
 * while semantically meaningful punctuation is retained. Only typographic variants
 * of apostrophes and dashes are canonicalized.
 */
export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .toLocaleUpperCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*'\s*/g, "'");

  return normalized.length > 0 ? normalized : null;
}

/** Structured code normalization. Free text is deliberately rejected. */
export function normalizeControlledCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]+(?:[_.:-][A-Z0-9]+)*$/.test(normalized) ? normalized : null;
}
