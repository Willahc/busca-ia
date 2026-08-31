import type Database from "better-sqlite3";
import { Source, SourceId } from "@/domain";
import { SourceRepository } from "@/application";
import { SourceMapper, SourceRow } from "../mappers/source-mapper";

export class SqliteSourceRepository implements SourceRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: SourceId): Promise<Source | null> {
    const stmt = this.db.prepare("SELECT * FROM sources WHERE source_id = ?");
    const row = stmt.get(id) as SourceRow | undefined;
    if (!row) {
      return null;
    }
    return SourceMapper.toDomain(row);
  }

  async save(source: Source): Promise<void> {
    const row = SourceMapper.toRow(source);
    const stmt = this.db.prepare(`
      INSERT INTO sources (source_id, type, label, external_reference, is_synthetic, created_at)
      VALUES (@source_id, @type, @label, @external_reference, @is_synthetic, @created_at)
      ON CONFLICT(source_id) DO UPDATE SET
        type = excluded.type,
        label = excluded.label,
        external_reference = excluded.external_reference,
        is_synthetic = excluded.is_synthetic
    `);
    stmt.run(row);
  }

  async exists(id: SourceId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM sources WHERE source_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}