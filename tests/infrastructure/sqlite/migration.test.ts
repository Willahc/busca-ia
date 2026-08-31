import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { applyMigrations, createSqliteConnection } from "@/infrastructure";

describe("SQLite Migrations and Schema", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createSqliteConnection({ dbPath: ":memory:" });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it("1. should apply initial migrations to a blank database", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("schema_migrations");
    expect(tableNames).toContain("sources");
    expect(tableNames).toContain("persons");
    expect(tableNames).toContain("missing_events");
    expect(tableNames).toContain("cases");
    expect(tableNames).toContain("facts");
    expect(tableNames).toContain("fact_parents");
    expect(tableNames).toContain("tips");
    expect(tableNames).toContain("evidence");
    expect(tableNames).toContain("hypotheses");
    expect(tableNames).toContain("hypothesis_supporting_evidence");
    expect(tableNames).toContain("hypothesis_contradicting_evidence");
    expect(tableNames).toContain("audit_events");
  });

  it("2. should be idempotent (applying migrations multiple times causes no errors)", () => {
    expect(() => {
      applyMigrations(db);
      applyMigrations(db);
    }).not.toThrow();

    const count = db.prepare("SELECT count(*) as count FROM schema_migrations").get() as { count: number };
    expect(count.count).toBe(4);
  });

  it("3. should register applied migrations in schema_migrations table", () => {
    const row = db.prepare("SELECT * FROM schema_migrations WHERE version = 1").get() as {
      version: number;
      name: string;
      applied_at: string;
    };

    expect(row).toBeDefined();
    expect(row.version).toBe(1);
    expect(row.name).toBe("001-initial-schema");
    expect(row.applied_at).toBeTruthy();
  });

  it("4. should verify foreign keys are enabled (PRAGMA foreign_keys = ON)", () => {
    const fkPragma = db.pragma("foreign_keys", { simple: true });
    expect(fkPragma).toBe(1);
  });

  it("22. should enforce foreign key constraints on missing_events and cases", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO missing_events (missing_event_id, person_id, created_at) VALUES (?, ?, ?)"
      ).run("EVENT-ORPHAN-001", "PERSON-NON-EXISTENT", new Date().toISOString());
    }).toThrow();
  });
});