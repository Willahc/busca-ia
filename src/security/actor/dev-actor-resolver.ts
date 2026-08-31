import crypto from "node:crypto";
import { createCaseId, CaseId } from "@/domain";
import { ActorId, createActorId } from "./actor-id";
import { ActorContext, createUnauthenticatedActorContext } from "./actor-context";
import { Role, ROLES } from "../rbac/role";

/**
 * Resolves ActorContext from incoming HTTP requests.
 *
 * SECURITY INVARIANT:
 * Header-based dev identity injection is STRICTLY DISABLED in production (NODE_ENV === 'production').
 * In production, it always falls back to an unauthenticated context until real authentication is introduced.
 */
export function resolveActorContext(request: Request): ActorContext {
  const headers = request.headers;

  // Resolve or generate RequestId safely
  const rawRequestId = headers.get("x-request-id")?.trim();
  const requestId =
    rawRequestId && rawRequestId.length > 0 && rawRequestId.length <= 128
      ? rawRequestId
      : crypto.randomUUID();

  // PRODUCTION SAFETY CHECK: Never allow dev identity headers in production
  if (process.env.NODE_ENV === "production") {
    return createUnauthenticatedActorContext(requestId);
  }

  // DEVELOPMENT / TEST ONLY: Parse dev actor headers
  const rawActorId = headers.get("x-actor-id")?.trim();
  const rawRoles = headers.get("x-actor-roles")?.trim();
  const rawCaseScopes = headers.get("x-actor-case-scopes")?.trim();
  const organizationId = headers.get("x-actor-organization-id")?.trim() || undefined;

  if (!rawActorId || !rawRoles) {
    return createUnauthenticatedActorContext(requestId);
  }

  let actorId: ActorId;
  try {
    actorId = createActorId(rawActorId);
  } catch {
    return createUnauthenticatedActorContext(requestId);
  }

  const validRoleValues = new Set<string>(Object.values(ROLES));
  const parsedRoles: Role[] = rawRoles
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is Role => validRoleValues.has(r));

  if (parsedRoles.length === 0) {
    return createUnauthenticatedActorContext(requestId);
  }

  const caseScopes: CaseId[] | undefined = rawCaseScopes
    ? rawCaseScopes
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => createCaseId(s))
    : undefined;

  return {
    actorId,
    roles: parsedRoles,
    organizationId,
    caseScopes,
    requestId,
    authenticated: true,
  };
}