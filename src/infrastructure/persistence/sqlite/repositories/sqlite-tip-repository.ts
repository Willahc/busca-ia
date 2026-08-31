import type Database from "better-sqlite3";
import { CaseId, Tip, TipId } from "@/domain";
import { TipRepository } from "@/application";
import { TipMapper, TipRow } from "../mappers/tip-mapper";

export class SqliteTipRepository implements TipRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: TipId): Promise<Tip | null> {
    const stmt = this.db.prepare("SELECT * FROM tips WHERE tip_id = ?");
    const row = stmt.get(id) as TipRow | undefined;
    if (!row) {
      return null;
    }
    return TipMapper.toDomain(row);
  }

  async save(tip: Tip): Promise<void> {
    const row = TipMapper.toRow(tip);
    const stmt = this.db.prepare(`
      INSERT INTO tips (
        tip_id, case_id, source_id, original_text, received_at,
        epistemic_status, observed_at, recorded_at, recorded_by, note
      )
      VALUES (
        @tip_id, @case_id, @source_id, @original_text, @received_at,
        @epistemic_status, @observed_at, @recorded_at, @recorded_by, @note
      )
      ON CONFLICT(tip_id) DO UPDATE SET
        original_text = excluded.original_text,
        received_at = excluded.received_at,
        epistemic_status = excluded.epistemic_status,
        observed_at = excluded.observed_at,
        recorded_at = excluded.recorded_at,
        recorded_by = excluded.recorded_by,
        note = excluded.note
    `);
    stmt.run(row);
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Tip[]> {
    const stmt = this.db.prepare("SELECT * FROM tips WHERE case_id = ?");
    const rows = stmt.all(caseId) as TipRow[];
    return rows.map((r) => TipMapper.toDomain(r));
  }

  async exists(id: TipId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM tips WHERE tip_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}