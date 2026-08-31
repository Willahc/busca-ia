import { ApplicationError } from "./application-error";

/**
 * Thrown when an operation would create an identity or referential duplicate.
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(`Conflict error: ${message}`);
  }
}