import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  DomainInvariantError,
  InvalidEpistemicTransitionError,
  MissingProvenanceError,
} from "@/domain";
import {
  ConflictError,
  EntityNotFoundError,
  InvalidOperationError,
} from "@/application";
import {
  AuthorizationDeniedError,
  UnauthenticatedError,
} from "@/security";
import { ApiErrorDetail, ApiErrorEnvelope, jsonError } from "./http-response";

export function handleHttpError(error: unknown): NextResponse<ApiErrorEnvelope> {
  if (error instanceof UnauthenticatedError) {
    return jsonError("UNAUTHENTICATED", "Authentication required", 401);
  }

  if (error instanceof AuthorizationDeniedError) {
    // Sanitized: never leak internal privacy/sealed states to unauthorized clients
    return jsonError("FORBIDDEN", "Access denied", 403);
  }

  if (error instanceof ZodError) {
    const details: ApiErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return jsonError("VALIDATION_ERROR", "Invalid request payload", 400, details);
  }

  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    return jsonError("MALFORMED_JSON", "Malformed JSON body", 400);
  }

  if (error instanceof EntityNotFoundError) {
    return jsonError("NOT_FOUND", error.message, 404);
  }

  if (error instanceof ConflictError) {
    return jsonError("CONFLICT", error.message, 409);
  }

  if (error instanceof InvalidOperationError) {
    return jsonError("UNPROCESSABLE_ENTITY", error.message, 422);
  }

  if (error instanceof DomainInvariantError) {
    return jsonError("DOMAIN_INVARIANT_VIOLATION", error.message, 422);
  }

  if (error instanceof InvalidEpistemicTransitionError) {
    return jsonError("INVALID_EPISTEMIC_TRANSITION", error.message, 422);
  }

  if (error instanceof MissingProvenanceError) {
    return jsonError("MISSING_PROVENANCE", error.message, 422);
  }

  // Sanitized fallback for unexpected errors (no stack trace, no SQL, no filesystem path leakage)
  return jsonError("INTERNAL_ERROR", "Internal server error", 500);
}