import { AuditAction, AUDIT_ACTIONS } from "./audit-action";
import { AuditOutcome, AUDIT_OUTCOMES } from "./audit-outcome";
import { AuditResourceType, AUDIT_RESOURCE_TYPES } from "./audit-resource-type";

export interface AuditEventProps {
  readonly auditEventId: string;
  readonly actorId?: string | null;
  readonly requestId: string;
  readonly action: AuditAction;
  readonly resourceType: AuditResourceType;
  readonly resourceId?: string | null;
  readonly occurredAt?: Date;
  readonly outcome: AuditOutcome;
  readonly reasonCode?: string | null;
}

/**
 * Structured, minimized security audit event.
 *
 * CRITICAL DATA MINIMIZATION:
 * Audit events strictly record operational metadata (who, what, when, outcome).
 * They NEVER store investigative content, raw statements, descriptions, or personal data.
 */
export class AuditEvent {
  readonly auditEventId: string;
  readonly actorId: string | null;
  readonly requestId: string;
  readonly action: AuditAction;
  readonly resourceType: AuditResourceType;
  readonly resourceId: string | null;
  readonly occurredAt: Date;
  readonly outcome: AuditOutcome;
  readonly reasonCode: string | null;

  constructor(props: AuditEventProps) {
    if (!props.auditEventId || props.auditEventId.trim().length === 0) {
      throw new Error("AuditEvent requires a valid auditEventId.");
    }
    if (!props.requestId || props.requestId.trim().length === 0) {
      throw new Error("AuditEvent requires a valid requestId.");
    }
    if (!Object.values(AUDIT_ACTIONS).includes(props.action)) {
      throw new Error(`Invalid AuditAction: '${props.action}'.`);
    }
    if (!Object.values(AUDIT_RESOURCE_TYPES).includes(props.resourceType)) {
      throw new Error(`Invalid AuditResourceType: '${props.resourceType}'.`);
    }
    if (!Object.values(AUDIT_OUTCOMES).includes(props.outcome)) {
      throw new Error(`Invalid AuditOutcome: '${props.outcome}'.`);
    }

    this.auditEventId = props.auditEventId.trim();
    this.actorId = props.actorId ? props.actorId.trim() : null;
    this.requestId = props.requestId.trim();
    this.action = props.action;
    this.resourceType = props.resourceType;
    this.resourceId = props.resourceId ? props.resourceId.trim() : null;
    this.occurredAt = props.occurredAt ? new Date(props.occurredAt.getTime()) : new Date();
    this.outcome = props.outcome;
    this.reasonCode = props.reasonCode ? props.reasonCode.trim() : null;

    Object.freeze(this);
  }
}