import { EntityValidationError } from "./domain-errors";

/**
 * Branded Type helper to enforce strongly-typed domain identifiers
 * without introducing runtime overhead or external dependencies.
 */
declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type CaseId = Brand<string, "CaseId">;
export type PersonId = Brand<string, "PersonId">;
export type MissingEventId = Brand<string, "MissingEventId">;
export type FactId = Brand<string, "FactId">;
export type SourceId = Brand<string, "SourceId">;
export type TipId = Brand<string, "TipId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type HypothesisId = Brand<string, "HypothesisId">;

export function createCaseId(id: string): CaseId {
  return validateId(id, "CaseId") as CaseId;
}

export function createPersonId(id: string): PersonId {
  return validateId(id, "PersonId") as PersonId;
}

export function createMissingEventId(id: string): MissingEventId {
  return validateId(id, "MissingEventId") as MissingEventId;
}

export function createFactId(id: string): FactId {
  return validateId(id, "FactId") as FactId;
}

export function createSourceId(id: string): SourceId {
  return validateId(id, "SourceId") as SourceId;
}

export function createTipId(id: string): TipId {
  return validateId(id, "TipId") as TipId;
}

export function createEvidenceId(id: string): EvidenceId {
  return validateId(id, "EvidenceId") as EvidenceId;
}

export function createHypothesisId(id: string): HypothesisId {
  return validateId(id, "HypothesisId") as HypothesisId;
}

function validateId(id: string, name: string): string {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new EntityValidationError(`Invalid ${name}: Identifier cannot be empty or whitespace.`);
  }
  return id.trim();
}