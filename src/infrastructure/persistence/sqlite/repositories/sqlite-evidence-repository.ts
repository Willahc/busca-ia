import type Database from "better-sqlite3";
import { CaseId, Evidence, EvidenceId } from "@/domain";
import { EvidenceRepository } from "@/application";
import { EvidenceMapper, EvidenceRow } from "../mappers/evidence-mapper";

export class SqliteEvidenceRepository implements EvidenceRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: EvidenceId): Promise<Evidence | null> {
    const stmt = this.db.prepare("SELECT * FROM evidence WHERE evidence_id = ?");
    const row = stmt.get(id) as EvidenceRow | undefined;
    if (!row) {
      return null;
    }
    return EvidenceMapper.toDomain(row);
  }

  async save(evidence: Evidence): Promise<void> {
    const row = EvidenceMapper.toRow(evidence);
    const stmt = this.db.prepare(`
      INSERT INTO evidence (
        evidence_id, case_id, source_id, description, epistemic_status,
        observed_at, recorded_at, recorded_by, note, created_at
      )
      VALUES (
        @evidence_id, @case_id, @source_id, @description, @epistemic_status,
        @observed_at, @recorded_at, @recorded_by, @note, @created_at
      )
      ON CONFLICT(evidence_id) DO UPDATE SET
        description = excluded.description,
        epistemic_status = excluded.epistemic_status,
        observed_at = excluded.observed_at,
        recorded_at = excluded.recorded_at,
        recorded_by = excluded.recorded_by,
        note = excluded.note
    `);
    stmt.run(row);
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Evidence[]> {
    const stmt = this.db.prepare("SELECT * FROM evidence WHERE case_id = ?");
    const rows = stmt.all(caseId) as EvidenceRow[];
    return rows.map((r) => EvidenceMapper.toDomain(r));
  }

  async exists(id: EvidenceId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM evidence WHERE evidence_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}