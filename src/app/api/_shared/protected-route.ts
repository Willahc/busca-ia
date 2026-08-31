import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AUDIT_OUTCOMES,
  AuditAction,
  AuditEvent,
  AuditResourceType,
  authorize,
  Permission,
  resolveActorContext,
  UnauthenticatedError,
  AuthorizationDeniedError,
} from "@/security";
import { AppContainer, getApplicationContainer } from "@/infrastructure";
import { handleHttpError } from "./http-error-mapper";

export interface ProtectedCommandOptions {
  readonly permission: Permission;
  readonly action: AuditAction;
  readonly resourceType: AuditResourceType;
  readonly caseId?: string;
  readonly resourceId?: string;
}

export interface ProtectedContext {
  readonly container: AppContainer;
}

export async function executeProtectedCommand(
  request: NextRequest,
  options: ProtectedCommandOptions,
  handler: (context: ProtectedContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const actor = resolveActorContext(request);
  const container = getApplicationContainer();
  const requestId = actor.requestId;
  let targetResourceId = options.resourceId ?? null;

  try {
    // 1. Authenticated Check
    if (!actor.authenticated) {
      // Record DENIED audit event
      await container.repositories.auditRepository.save(
        new AuditEvent({
          auditEventId: crypto.randomUUID(),
          actorId: null,
          requestId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: targetResourceId,
          occurredAt: new Date(),
          outcome: AUDIT_OUTCOMES.DENIED,
          reasonCode: "DENY_UNAUTHENTICATED",
        })
      );
      throw new UnauthenticatedError();
    }

    // 2. Authorization Decision
    const decision = authorize({
      actor,
      permission: options.permission,
      resource: options.caseId ? { caseId: options.caseId } : undefined,
    });

    if (!decision.allowed) {
      await container.repositories.auditRepository.save(
        new AuditEvent({
          auditEventId: crypto.randomUUID(),
          actorId: actor.actorId ?? null,
          requestId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: targetResourceId,
          occurredAt: new Date(),
          outcome: AUDIT_OUTCOMES.DENIED,
          reasonCode: decision.reasonCode,
        })
      );
      throw new AuthorizationDeniedError("Access denied", decision.reasonCode);
    }

    // 3. Execute Handler
    const response = await handler({ container });

    // Extract resourceId from success payload if available
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body?.data) {
        targetResourceId =
          body.data.evidenceId ||
          body.data.tipId ||
          body.data.factId ||
          body.data.hypothesisId ||
          body.data.caseId ||
          body.data.missingEventId ||
          body.data.personId ||
          body.data.sourceId ||
          targetResourceId;
      }
    } catch {
      // Response parsing ignored
    }

    // 4. Record SUCCEEDED audit event
    await container.repositories.auditRepository.save(
      new AuditEvent({
        auditEventId: crypto.randomUUID(),
        actorId: actor.actorId ?? null,
        requestId,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: targetResourceId,
        occurredAt: new Date(),
        outcome: AUDIT_OUTCOMES.SUCCEEDED,
      })
    );

    return response;
  } catch (error) {
    // If business/validation error occurs on an authenticated & authorized request, record FAILED audit
    if (
      !(error instanceof UnauthenticatedError) &&
      !(error instanceof AuthorizationDeniedError) &&
      actor.authenticated
    ) {
      try {
        await container.repositories.auditRepository.save(
          new AuditEvent({
            auditEventId: crypto.randomUUID(),
            actorId: actor.actorId ?? null,
            requestId,
            action: options.action,
            resourceType: options.resourceType,
            resourceId: targetResourceId,
            occurredAt: new Date(),
            outcome: AUDIT_OUTCOMES.FAILED,
            reasonCode: error instanceof Error ? error.name : "FAILED",
          })
        );
      } catch {
        // Fail-closed rule: Audit recording errors on protected commands should not fail silently
      }
    }

    return handleHttpError(error);
  }
}