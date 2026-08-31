/**
 * Base class for all domain-specific errors.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a fundamental domain invariant is violated.
 */
export class DomainInvariantError extends DomainError {
  constructor(message: string) {
    super(`Domain invariant violation: ${message}`);
  }
}

/**
 * Thrown when an illegal epistemic status transition is attempted
 * (e.g. promoting SYNTHETIC to CONFIRMED or HYPOTHESIS to CONFIRMED directly).
 */
export class InvalidEpistemicTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(
      `Illegal epistemic status transition from '${fromStatus}' to '${toStatus}'${
        reason ? `: ${reason}` : "."
      }`
    );
  }
}

/**
 * Thrown when required provenance metadata or parent references are missing.
 */
export class MissingProvenanceError extends DomainError {
  constructor(message: string) {
    super(`Missing provenance requirement: ${message}`);
  }
}

/**
 * Thrown when entity data fails validation.
 */
export class EntityValidationError extends DomainError {
  constructor(message: string) {
    super(`Entity validation error: ${message}`);
  }
}