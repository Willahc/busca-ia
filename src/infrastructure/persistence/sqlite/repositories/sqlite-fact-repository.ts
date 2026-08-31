import type Database from "better-sqlite3";
import { createFactId, Fact, FactId } from "@/domain";
import { FactRepository } from "@/application";
import { FactMapper, FactRow } from "../mappers/fact-mapper";

export class SqliteFactRepository implements FactRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: FactId): Promise<Fact | null> {
    const factStmt = this.db.prepare("SELECT * FROM facts WHERE fact_id = ?");
    const factRow = factStmt.get(id) as FactRow | undefined;
    if (!factRow) {
      return null;
    }

    const parentsStmt = this.db.prepare("SELECT parent_fact_id FROM fact_parents WHERE fact_id = ?");
    const parentRows = parentsStmt.all(id) as { parent_fact_id: string }[];
    const parentFactIds = parentRows.map((p) => createFactId(p.parent_fact_id));

    return FactMapper.toDomain(factRow, parentFactIds);
  }

  async save(fact: Fact): Promise<void> {
    const row = FactMapper.toRow(fact);

    const saveTx = this.db.transaction(() => {
      const factStmt = this.db.prepare(`
        INSERT INTO facts (
          fact_id, subject_id, attribute, value_json, epistemic_status,
          source_id, observed_at, recorded_at, recorded_by, confidence, note
        )
        VALUES (
          @fact_id, @subject_id, @attribute, @value_json, @epistemic_status,
          @source_id, @observed_at, @recorded_at, @recorded_by, @confidence, @note
        )
        ON CONFLICT(fact_id) DO UPDATE SET
          attribute = excluded.attribute,
          value_json = excluded.value_json,
          epistemic_status = excluded.epistemic_status,
          source_id = excluded.source_id,
          observed_at = excluded.observed_at,
          recorded_at = excluded.recorded_at,
          recorded_by = excluded.recorded_by,
          confidence = excluded.confidence,
          note = excluded.note
      `);
      factStmt.run(row);

      const deleteParentsStmt = this.db.prepare("DELETE FROM fact_parents WHERE fact_id = ?");
      deleteParentsStmt.run(fact.id);

      if (fact.provenance.parentFactIds && fact.provenance.parentFactIds.length > 0) {
        const insertParentStmt = this.db.prepare("INSERT INTO fact_parents (fact_id, parent_fact_id) VALUES (?, ?)");
        for (const parentId of fact.provenance.parentFactIds) {
          insertParentStmt.run(fact.id, parentId);
        }
      }
    });

    saveTx();
  }

  async findBySubjectId(subjectId: string): Promise<readonly Fact[]> {
    const factStmt = this.db.prepare("SELECT * FROM facts WHERE subject_id = ?");
    const factRows = factStmt.all(subjectId) as FactRow[];

    const parentsStmt = this.db.prepare("SELECT parent_fact_id FROM fact_parents WHERE fact_id = ?");

    return factRows.map((fRow) => {
      const parentRows = parentsStmt.all(fRow.fact_id) as { parent_fact_id: string }[];
      const parentFactIds = parentRows.map((p) => createFactId(p.parent_fact_id));
      return FactMapper.toDomain(fRow, parentFactIds);
    });
  }

  async exists(id: FactId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM facts WHERE fact_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}