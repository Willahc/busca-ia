import {
  createFactId,
  createSourceId,
  EpistemicStatus,
  Fact,
  FactId,
  Provenance,
} from "@/domain";

export interface FactRow {
  fact_id: string;
  subject_id: string;
  attribute: string;
  value_json: string;
  epistemic_status: string;
  source_id: string;
  observed_at: string | null;
  recorded_at: string;
  recorded_by: string;
  confidence: number | null;
  note: string | null;
}

export class FactMapper {
  static toRow(fact: Fact): FactRow {
    return {
      fact_id: fact.id,
      subject_id: fact.subjectId,
      attribute: fact.attribute,
      value_json: JSON.stringify(fact.value),
      epistemic_status: fact.epistemicStatus,
      source_id: fact.provenance.sourceId,
      observed_at: fact.provenance.observedAt ? fact.provenance.observedAt.toISOString() : null,
      recorded_at: fact.provenance.recordedAt.toISOString(),
      recorded_by: fact.provenance.recordedBy,
      confidence: fact.confidence ?? null,
      note: fact.provenance.note ?? null,
    };
  }

  static toDomain(row: FactRow, parentFactIds: readonly FactId[] = []): Fact {
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(row.value_json);
    } catch {
      parsedValue = row.value_json;
    }

    const provenance = new Provenance({
      sourceId: createSourceId(row.source_id),
      recordedAt: new Date(row.recorded_at),
      observedAt: row.observed_at ? new Date(row.observed_at) : undefined,
      recordedBy: row.recorded_by,
      parentFactIds: parentFactIds.length > 0 ? parentFactIds : undefined,
      note: row.note ?? undefined,
    });

    return new Fact({
      id: createFactId(row.fact_id),
      subjectId: row.subject_id,
      attribute: row.attribute,
      value: parsedValue,
      epistemicStatus: row.epistemic_status as EpistemicStatus,
      provenance,
      confidence: row.confidence !== null ? row.confidence : undefined,
    });
  }
}