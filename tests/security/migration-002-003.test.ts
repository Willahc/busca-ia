import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Database from "better-sqlite3";
import { createCaseId } from "@/domain";
import { applyMigrations, SqliteCaseRepository } from "@/infrastructure";

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

  it("should upgrade an existing Gate 4/5 database without data loss and apply new schema", async () => {
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

      CREATE TABLE facts (
        fact_id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        attribute TEXT NOT NULL,
        value_json TEXT NOT NULL,
        epistemic_status TEXT NOT NULL,
        source_id TEXT NOT NULL REFERENCES sources(source_id),
        observed_at TEXT,
        recorded_at TEXT NOT NULL,
        recorded_by TEXT NOT NULL,
        confidence REAL,
        note TEXT
      );

      CREATE TABLE fact_parents (
        fact_id TEXT NOT NULL REFERENCES facts(fact_id) ON DELETE CASCADE,
        parent_fact_id TEXT NOT NULL,
        PRIMARY KEY (fact_id, parent_fact_id)
      );

      CREATE TABLE tips (
        tip_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(case_id),
        source_id TEXT NOT NULL REFERENCES sources(source_id),
        original_text TEXT NOT NULL,
        received_at TEXT NOT NULL,
        epistemic_status TEXT NOT NULL,
        observed_at TEXT,
        recorded_at TEXT NOT NULL,
        recorded_by TEXT NOT NULL,
        note TEXT
      );

      CREATE TABLE evidence (
        evidence_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(case_id),
        source_id TEXT NOT NULL REFERENCES sources(source_id),
        description TEXT NOT NULL,
        epistemic_status TEXT NOT NULL,
        observed_at TEXT,
        recorded_at TEXT NOT NULL,
        recorded_by TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE hypotheses (
        hypothesis_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(case_id),
        statement TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE hypothesis_supporting_evidence (
        hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
        PRIMARY KEY (hypothesis_id, evidence_id)
      );

      CREATE TABLE hypothesis_contradicting_evidence (
        hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
        PRIMARY KEY (hypothesis_id, evidence_id)
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

    // 2. Run applyMigrations(db) to execute subsequent migrations
    applyMigrations(db);

    // 3. Verify schema_migrations now contains all 4 migrations
    const migrations = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version ASC").all() as { version: number; name: string }[];
    expect(migrations).toHaveLength(4);
    expect(migrations.map((m) => m.version)).toEqual([1, 2, 3, 4]);

    // 4. Verify existing case record was upgraded with default privacy_level 'RESTRICTED' and all fields preserved
    const caseRepo = new SqliteCaseRepository(db);
    const loadedLegacyCase = await caseRepo.findById(createCaseId("CASE-LEGACY-001"));
    expect(loadedLegacyCase).not.toBeNull();
    expect(loadedLegacyCase?.id).toBe("CASE-LEGACY-001");
    expect(loadedLegacyCase?.personId).toBe("PERSON-LEGACY-001");
    expect(loadedLegacyCase?.missingEventId).toBe("EVENT-LEGACY-001");
    expect(loadedLegacyCase?.workflowStatus).toBe("ACTIVE");
    expect(loadedLegacyCase?.officialStatus).toBe("STATUS_TO_VERIFY");
    expect(loadedLegacyCase?.privacyLevel).toBe("RESTRICTED");
    expect(loadedLegacyCase?.createdAt).toEqual(new Date("2026-08-31T00:00:00Z"));

    // 5. Verify audit_events table exists and is operational
    const auditCount = db.prepare("SELECT count(*) as count FROM audit_events").get() as { count: number };
    expect(auditCount.count).toBe(0);

    db.close();
  });
});