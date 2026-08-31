import {
  AuditAction,
  AuditEvent,
  AuditOutcome,
  AuditResourceType,
} from "@/security";

export interface AuditEventRow {
  audit_event_id: string;
  actor_id: string | null;
  request_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  occurred_at: string;
  outcome: string;
  reason_code: string | null;
}

export class AuditMapper {
  static toRow(event: AuditEvent): AuditEventRow {
    return {
      audit_event_id: event.auditEventId,
      actor_id: event.actorId,
      request_id: event.requestId,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      occurred_at: event.occurredAt.toISOString(),
      outcome: event.outcome,
      reason_code: event.reasonCode,
    };
  }

  static toDomain(row: AuditEventRow): AuditEvent {
    return new AuditEvent({
      auditEventId: row.audit_event_id,
      actorId: row.actor_id,
      requestId: row.request_id,
      action: row.action as AuditAction,
      resourceType: row.resource_type as AuditResourceType,
      resourceId: row.resource_id,
      occurredAt: new Date(row.occurred_at),
      outcome: row.outcome as AuditOutcome,
      reasonCode: row.reason_code,
    });
  }
}