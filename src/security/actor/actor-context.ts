import { CaseId } from "@/domain";
import { ActorId } from "./actor-id";
import { Role } from "../rbac/role";

/**
 * Standard security context carried across requests and operations.
 * Minimizes personal information and isolates authorization keys.
 */
export interface ActorContext {
  readonly actorId?: ActorId;
  readonly roles: readonly Role[];
  readonly organizationId?: string;
  readonly caseScopes?: readonly CaseId[];
  readonly requestId: string;
  readonly authenticated: boolean;
}

/**
 * Represents an anonymous / unauthenticated actor context.
 */
export function createUnauthenticatedActorContext(requestId: string): ActorContext {
  return {
    roles: [],
    requestId,
    authenticated: false,
  };
}