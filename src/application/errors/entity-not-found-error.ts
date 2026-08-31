import { ApplicationError } from "./application-error";

/**
 * Thrown when an entity required by a use case does not exist in repository ports.
 */
export class EntityNotFoundError extends ApplicationError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' was not found.`);
  }
}