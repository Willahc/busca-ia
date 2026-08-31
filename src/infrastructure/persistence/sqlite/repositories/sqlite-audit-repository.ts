import type Database from "better-sqlite3";
import { AuditEvent, AuditRepository } from "@/security";
import { AuditMapper, AuditEventRow } from "../mappers/audit-mapper";

export class SqliteAuditRepository implements AuditRepository {
  constructor(private readonly db: Database.Database) {}

  async save(event: AuditEvent): Promise<void> {
    const row = AuditMapper.toRow(event);
    const stmt = this.db.prepare(`
      INSERT INTO audit_events (
        audit_event_id, actor_id, request_id, action, resource_type, resource_id, occurred_at, outcome, reason_code
      )
      VALUES (
        @audit_event_id, @actor_id, @request_id, @action, @resource_type, @resource_id, @occurred_at, @outcome, @reason_code
      )
    `);
    stmt.run(row);
  }

  async findById(id: string): Promise<AuditEvent | null> {
    const stmt = this.db.prepare("SELECT * FROM audit_events WHERE audit_event_id = ?");
    const row = stmt.get(id) as AuditEventRow | undefined;
    if (!row) {
      return null;
    }
    return AuditMapper.toDomain(row);
  }

  async findByRequestId(requestId: string): Promise<readonly AuditEvent[]> {
    const stmt = this.db.prepare("SELECT * FROM audit_events WHERE request_id = ? ORDER BY occurred_at ASC");
    const rows = stmt.all(requestId) as AuditEventRow[];
    return rows.map((r) => AuditMapper.toDomain(r));
  }
}