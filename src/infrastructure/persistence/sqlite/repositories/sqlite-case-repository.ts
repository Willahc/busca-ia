import type Database from "better-sqlite3";
import { Case, CaseId } from "@/domain";
import { CaseRepository } from "@/application";
import { CaseMapper, CaseRow } from "../mappers/case-mapper";

export class SqliteCaseRepository implements CaseRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: CaseId): Promise<Case | null> {
    const stmt = this.db.prepare("SELECT * FROM cases WHERE case_id = ?");
    const row = stmt.get(id) as CaseRow | undefined;
    if (!row) {
      return null;
    }
    return CaseMapper.toDomain(row);
  }

  async save(c: Case): Promise<void> {
    const row = CaseMapper.toRow(c);
    const stmt = this.db.prepare(`
      INSERT INTO cases (
        case_id, person_id, missing_event_id, workflow_status, official_status, privacy_level, created_at, updated_at
      )
      VALUES (
        @case_id, @person_id, @missing_event_id, @workflow_status, @official_status, @privacy_level, @created_at, @updated_at
      )
      ON CONFLICT(case_id) DO UPDATE SET
        workflow_status = excluded.workflow_status,
        official_status = excluded.official_status,
        privacy_level = excluded.privacy_level,
        updated_at = excluded.updated_at
    `);
    stmt.run(row);
  }

  async exists(id: CaseId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM cases WHERE case_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}