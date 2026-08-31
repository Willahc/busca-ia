import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Database from "better-sqlite3";
import { applyMigrations } from "@/infrastructure";

describe("Backward Compatibility: Migration 001 -> 002 + 003", () => {
  let tempDbPath: string | null = null;

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

  it("should upgrade an existing Gate 4/5 database without data loss and apply new schema", () => {
    tempDbPath = path.join(os.tmpdir(), `buscaia-migration-compat-${Date.now()}.db`);
    const db = new Database(tempDbPath);

    // 1. Simulate Gate 4/5 schema by applying only migration 1
    db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // Insert schema 001 manually
    db.exec(`
      CREATE TABLE sources (
        source_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        external_reference TEXT,
        is_synthetic INTEGER NOT NULL CHECK(is_synthetic IN (0, 1)),
        created_at TEXT NOT NULL
      );

      CREATE TABLE persons (
        person_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE missing_events (
        missing_event_id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(person_id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE cases (
        case_id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(person_id),
        missing_event_id TEXT NOT NULL REFERENCES missing_events(missing_event_id),
        workflow_status TEXT NOT NULL,
        official_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO schema_migrations VALUES (1, '001-initial-schema', '2026-08-31T00:00:00Z')").run();

    // Insert legacy case data without privacy_level column
    db.prepare(`
      INSERT INTO persons VALUES ('PERSON-LEGACY-001', '2026-08-31T00:00:00Z');
    `).run();
    db.prepare(`
      INSERT INTO missing_events VALUES ('EVENT-LEGACY-001', 'PERSON-LEGACY-001', '2026-08-31T00:00:00Z');
    `).run();
    db.prepare(`
      INSERT INTO cases VALUES ('CASE-LEGACY-001', 'PERSON-LEGACY-001', 'EVENT-LEGACY-001', 'ACTIVE', 'STATUS_TO_VERIFY', '2026-08-31T00:00:00Z', '2026-08-31T00:00:00Z');
    `).run();

    // 2. Run applyMigrations(db) to execute migration 2 and 3
    applyMigrations(db);

    // 3. Verify schema_migrations now contains all 3 migrations
    const migrations = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version ASC").all() as { version: number; name: string }[];
    expect(migrations).toHaveLength(3);
    expect(migrations.map((m) => m.version)).toEqual([1, 2, 3]);

    // 4. Verify existing case record was upgraded with default privacy_level 'RESTRICTED'
    const upgradedCase = db.prepare("SELECT * FROM cases WHERE case_id = 'CASE-LEGACY-001'").get() as { case_id: string; privacy_level: string };
    expect(upgradedCase).not.toBeNull();
    expect(upgradedCase.case_id).toBe("CASE-LEGACY-001");
    expect(upgradedCase.privacy_level).toBe("RESTRICTED");

    // 5. Verify audit_events table exists and is operational
    const auditCount = db.prepare("SELECT count(*) as count FROM audit_events").get() as { count: number };
    expect(auditCount.count).toBe(0);

    db.close();
  });
});