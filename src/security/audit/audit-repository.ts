import { AuditEvent } from "./audit-event";

export interface AuditRepository {
  save(event: AuditEvent): Promise<void>;
  findById(id: string): Promise<AuditEvent | null>;
  findByRequestId(requestId: string): Promise<readonly AuditEvent[]>;
}