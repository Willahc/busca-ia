import { ApplicationError } from "./application-error";

/**
 * Thrown when an application-level precondition or cross-entity coherence check fails.
 */
export class InvalidOperationError extends ApplicationError {
  constructor(message: string) {
    super(`Invalid operation: ${message}`);
  }
}