import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_RESOURCE_TYPES,
  AuditEvent,
} from "@/security";
import {
  createSqliteConnection,
  SqliteAuditRepository,
} from "@/infrastructure";

describe("Security Core: Audit Model & Persistent Storage", () => {
  let tempDbPath: string | null = null;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `buscaia-audit-test-${Date.now()}.db`);
  });

  afterEach(() => {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
        const wal = `${tempDbPath}-wal`;
        const shm = `${tempDbPath}-shm`;
        if (fs.existsSync(wal)) fs.unlinkSync(wal);
        if (fs.existsSync(shm)) fs.unlinkSync(shm);
      } catch {
        // Ignored
      }
    }
  });

  it("1. should create valid AuditEvent and enforce data minimization", () => {
    const event = new AuditEvent({
      auditEventId: "AUDIT-001",
      actorId: "ACTOR-001",
      requestId: "REQ-001",
      action: AUDIT_ACTIONS.CASE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      resourceId: "CASE-001",
      occurredAt: new Date("2026-08-31T12:00:00Z"),
      outcome: AUDIT_OUTCOMES.SUCCEEDED,
    });

    expect(event.auditEventId).toBe("AUDIT-001");
    expect(event.action).toBe("CASE_CREATE");
    expect(event.outcome).toBe("SUCCEEDED");

    // Verify properties do not have sensitive payload properties
    const keys = Object.keys(event);
    expect(keys).not.toContain("originalText");
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("statement");
    expect(keys).not.toContain("value");
  });

  it("2. should persist AuditEvents across outcomes and survive database connection restart", async () => {
    const db1 = createSqliteConnection({ dbPath: tempDbPath! });
    const repo1 = new SqliteAuditRepository(db1);

    const event1 = new AuditEvent({
      auditEventId: "AUDIT-001",
      actorId: "ACTOR-001",
      requestId: "REQ-001",
      action: AUDIT_ACTIONS.SOURCE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.SOURCE,
      resourceId: "SOURCE-001",
      occurredAt: new Date("2026-08-31T12:00:00Z"),
      outcome: AUDIT_OUTCOMES.SUCCEEDED,
    });

    const event2 = new AuditEvent({
      auditEventId: "AUDIT-002",
      actorId: "ACTOR-002",
      requestId: "REQ-001",
      action: AUDIT_ACTIONS.EVIDENCE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.EVIDENCE,
      resourceId: null,
      occurredAt: new Date("2026-08-31T12:01:00Z"),
      outcome: AUDIT_OUTCOMES.DENIED,
      reasonCode: "DENY_NO_PERMISSION",
    });

    const event3 = new AuditEvent({
      auditEventId: "AUDIT-003",
      actorId: "ACTOR-001",
      requestId: "REQ-002",
      action: AUDIT_ACTIONS.FACT_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.FACT,
      resourceId: null,
      occurredAt: new Date("2026-08-31T12:02:00Z"),
      outcome: AUDIT_OUTCOMES.FAILED,
      reasonCode: "InvalidOperationError",
    });

    await repo1.save(event1);
    await repo1.save(event2);
    await repo1.save(event3);

    db1.close();

    // RESTART: Reopen database and verify persisted records
    const db2 = createSqliteConnection({ dbPath: tempDbPath! });
    const repo2 = new SqliteAuditRepository(db2);

    const loaded1 = await repo2.findById("AUDIT-001");
    expect(loaded1).not.toBeNull();
    expect(loaded1?.outcome).toBe(AUDIT_OUTCOMES.SUCCEEDED);
    expect(loaded1?.actorId).toBe("ACTOR-001");

    const loadedByReq = await repo2.findByRequestId("REQ-001");
    expect(loadedByReq).toHaveLength(2);
    expect(loadedByReq[1].outcome).toBe(AUDIT_OUTCOMES.DENIED);
    expect(loadedByReq[1].reasonCode).toBe("DENY_NO_PERMISSION");

    const loaded3 = await repo2.findById("AUDIT-003");
    expect(loaded3?.outcome).toBe(AUDIT_OUTCOMES.FAILED);
    expect(loaded3?.reasonCode).toBe("InvalidOperationError");

    db2.close();
  });
});