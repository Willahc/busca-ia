import type Database from "better-sqlite3";

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "001-initial-schema",
    sql: `
      CREATE TABLE IF NOT EXISTS sources (
        source_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        external_reference TEXT,
        is_synthetic INTEGER NOT NULL CHECK(is_synthetic IN (0, 1)),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS persons (
        person_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS missing_events (
        missing_event_id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(person_id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cases (
        case_id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(person_id),
        missing_event_id TEXT NOT NULL REFERENCES missing_events(missing_event_id),
        workflow_status TEXT NOT NULL,
        official_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS facts (
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

      CREATE TABLE IF NOT EXISTS fact_parents (
        fact_id TEXT NOT NULL REFERENCES facts(fact_id) ON DELETE CASCADE,
        parent_fact_id TEXT NOT NULL,
        PRIMARY KEY (fact_id, parent_fact_id)
      );

      CREATE TABLE IF NOT EXISTS tips (
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

      CREATE TABLE IF NOT EXISTS evidence (
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

      CREATE TABLE IF NOT EXISTS hypotheses (
        hypothesis_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(case_id),
        statement TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hypothesis_supporting_evidence (
        hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
        PRIMARY KEY (hypothesis_id, evidence_id)
      );

      CREATE TABLE IF NOT EXISTS hypothesis_contradicting_evidence (
        hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
        PRIMARY KEY (hypothesis_id, evidence_id)
      );
    `,
  },
  {
    version: 2,
    name: "002-security-audit",
    sql: `
      CREATE TABLE IF NOT EXISTS audit_events (
        audit_event_id TEXT PRIMARY KEY,
        actor_id TEXT,
        request_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        occurred_at TEXT NOT NULL,
        outcome TEXT NOT NULL,
        reason_code TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_events (actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit_events (request_id);
      CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events (resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_events (occurred_at);
    `,
  },
  {
    version: 3,
    name: "003-case-privacy-level",
    sql: `
      ALTER TABLE cases ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'RESTRICTED';
    `,
  },
  {
    version: 4,
    name: "004-temporal-query-indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_facts_subject_id ON facts (subject_id);
      CREATE INDEX IF NOT EXISTS idx_tips_case_id ON tips (case_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence (case_id);
      CREATE INDEX IF NOT EXISTS idx_hypotheses_case_id ON hypotheses (case_id);
    `,
  },
];

export function applyMigrations(db: Database.Database): void {
  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare("SELECT version FROM schema_migrations ORDER BY version ASC").all() as { version: number }[];
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      const applyTx = db.transaction(() => {
        db.exec(migration.sql);
        db.prepare(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)"
        ).run(migration.version, migration.name, new Date().toISOString());
      });
      applyTx();
    }
  }
}