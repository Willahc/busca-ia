import type Database from "better-sqlite3";
import { createFactId, Fact, Person, PersonId } from "@/domain";
import { PersonRepository } from "@/application";
import { PersonMapper, PersonRow } from "../mappers/person-mapper";
import { FactMapper, FactRow } from "../mappers/fact-mapper";

export class SqlitePersonRepository implements PersonRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: PersonId): Promise<Person | null> {
    const personStmt = this.db.prepare("SELECT * FROM persons WHERE person_id = ?");
    const personRow = personStmt.get(id) as PersonRow | undefined;
    if (!personRow) {
      return null;
    }

    const factsStmt = this.db.prepare("SELECT * FROM facts WHERE subject_id = ?");
    const factRows = factsStmt.all(id) as FactRow[];

    const parentsStmt = this.db.prepare("SELECT parent_fact_id FROM fact_parents WHERE fact_id = ?");

    const facts: Fact[] = factRows.map((fRow) => {
      const parentRows = parentsStmt.all(fRow.fact_id) as { parent_fact_id: string }[];
      const parentFactIds = parentRows.map((p) => createFactId(p.parent_fact_id));
      return FactMapper.toDomain(fRow, parentFactIds);
    });

    return PersonMapper.toDomain(personRow, facts);
  }

  async save(person: Person): Promise<void> {
    const personRow = PersonMapper.toRow(person);

    const saveTx = this.db.transaction(() => {
      const personStmt = this.db.prepare(`
        INSERT INTO persons (person_id, created_at)
        VALUES (@person_id, @created_at)
        ON CONFLICT(person_id) DO NOTHING
      `);
      personStmt.run(personRow);

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

      const deleteParentsStmt = this.db.prepare("DELETE FROM fact_parents WHERE fact_id = ?");
      const insertParentStmt = this.db.prepare("INSERT INTO fact_parents (fact_id, parent_fact_id) VALUES (?, ?)");

      for (const fact of person.getAllFacts()) {
        const fRow = FactMapper.toRow(fact);
        factStmt.run(fRow);

        deleteParentsStmt.run(fact.id);
        if (fact.provenance.parentFactIds) {
          for (const pId of fact.provenance.parentFactIds) {
            insertParentStmt.run(fact.id, pId);
          }
        }
      }
    });

    saveTx();
  }

  async exists(id: PersonId): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM persons WHERE person_id = ? LIMIT 1");
    const result = stmt.get(id);
    return !!result;
  }
}