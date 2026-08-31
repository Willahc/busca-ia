import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { applyMigrations } from "./sqlite-schema";

export interface SqliteConnectionOptions {
  readonly dbPath?: string;
  readonly readonly?: boolean;
  readonly runMigrations?: boolean;
}

export function createSqliteConnection(options: SqliteConnectionOptions = {}): Database.Database {
  const defaultPath = process.env.BUSCAIA_DB_PATH || path.resolve(process.cwd(), "data", "busca-ia.db");
  const targetPath = options.dbPath ?? defaultPath;

  if (targetPath !== ":memory:") {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath, {
    readonly: options.readonly ?? false,
  });

  // Enable SQLite Foreign Key constraints
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  if (options.runMigrations !== false && !options.readonly) {
    applyMigrations(db);
  }

  return db;
}