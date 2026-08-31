import type Database from "better-sqlite3";
import { CaseId, createEvidenceId, Hypothesis, HypothesisId } from "@/domain";
import { HypothesisRepository } from "@/application";
import { HypothesisMapper, HypothesisRow } from "../mappers/hypothesis-mapper";

export class SqliteHypothesisRepository implements HypothesisRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: HypothesisId): Promise<Hypothesis | null> {
    const hypStmt = this.db.prepare("SELECT * FROM hypotheses WHERE hypothesis_id = ?");
    const hypRow = hypStmt.get(id) as HypothesisRow | undefined;
    if (!hypRow) {
      return null;
    }

    const supStmt = this.db.prepare("SELECT evidence_id FROM hypothesis_supporting_evidence WHERE hypothesis_id = ?");
    const supRows = supStmt.all(id) as { evidence_id: string }[];
    const supportingEvidenceIds = supRows.map((r) => createEvidenceId(r.evidence_id));

    const conStmt = this.db.prepare("SELECT evidence_id FROM hypothesis_contradicting_evidence WHERE hypothesis_id = ?");
    const conRows = conStmt.all(id) as { evidence_id: string }[];
    const contradictingEvidenceIds = conRows.map((r) => createEvidenceId(r.evidence_id));

    return HypothesisMapper.toDomain(hypRow, supportingEvidenceIds, contradictingEvidenceIds);
  }

  async save(hypothesis: Hypothesis): Promise<void> {
    const row = HypothesisMapper.toRow(hypothesis);

    const saveTx = this.db.transaction(() => {
      const hypStmt = this.db.prepare(`
        INSERT INTO hypotheses (hypothesis_id, case_id, statement, status, created_at, updated_at)
        VALUES (@hypothesis_id, @case_id, @statement, @status, @created_at, @updated_at)
        ON CONFLICT(hypothesis_id) DO UPDATE SET
          statement = excluded.statement,
          status = excluded.status,
          updated_at = excluded.updated_at
      `);
      hypStmt.run(row);

      const deleteSupStmt = this.db.prepare("DELETE FROM hypothesis_supporting_evidence WHERE hypothesis_id = ?");
      deleteSupStmt.run(hypothesis.id);

      const insertSupStmt = this.db.prepare("INSERT INTO hypothesis_supporting_evidence (hypothesis_id, evidence_id) VALUES (?, ?)");
      for (const evId of hypothesis.supportingEvidenceIds) {
        insertSupStmt.run(hypothesis.id, evId);
      }

      const deleteConStmt = this.db.prepare("DELETE FROM hypothesis_contradicting_evidence WHERE hypothesis_id = ?");
      deleteConStmt.run(hypothesis.id);

      const insertConStmt = this.db.prepare("INSERT INTO hypothesis_contradicting_evidence (hypothesis_id, evidence_id) VALUES (?, ?)");
      for (const evId of hypothesis.contradictingEvidenceIds) {
        insertConStmt.run(hypothesis.id, evId);
      }
    });

    saveTx();
  }

  async findByCaseId(caseId: CaseId): Promise<readonly Hypothesis[]> {
    const hypStmt = this.db.prepare("SELECT * FROM hypotheses WHERE case_id = ?");
    const hypRows = hypStmt.all(caseId) as HypothesisRow[];

    const supStmt = this.db.prepare("SELECT evidence_id FROM hypothesis_supporting_evidence WHERE hypothesis_id = ?");
    const conStmt = this.db.prepare("SELECT evidence_id FROM hypothesis_contradicting_evidence WHERE hypothesis_id = ?");

    return hypRows.map((hRow) => {
      const supRows = supStmt.all(hRow.hypothesis_id) as { evidence_id: string }[];
      const supportingEvidenceIds = supRows.map((r) => createEvidenceId(r.evidence_id));

      const conRows = conStmt.all(hRow.hypothesis_id) as { evidence_id: string }[];
      const contradictingEvidenceIds = conRows.map((r) => createEvidenceId(r.evidence_id));

      return HypothesisMapper.toDomain(hRow, supportingEvidenceIds, contradictingEvidenceIds);
    });
  }

  async exists(id: HypothesisId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM hypotheses WHERE hypothesis_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}