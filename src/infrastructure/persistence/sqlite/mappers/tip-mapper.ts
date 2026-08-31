import {
  createCaseId,
  createSourceId,
  createTipId,
  EpistemicStatus,
  Provenance,
  Tip,
} from "@/domain";

export interface TipRow {
  tip_id: string;
  case_id: string;
  source_id: string;
  original_text: string;
  received_at: string;
  epistemic_status: string;
  observed_at: string | null;
  recorded_at: string;
  recorded_by: string;
  note: string | null;
}

export class TipMapper {
  static toRow(tip: Tip): TipRow {
    return {
      tip_id: tip.id,
      case_id: tip.caseId,
      source_id: tip.sourceId,
      original_text: tip.originalText,
      received_at: tip.receivedAt.toISOString(),
      epistemic_status: tip.epistemicStatus,
      observed_at: tip.provenance.observedAt ? tip.provenance.observedAt.toISOString() : null,
      recorded_at: tip.provenance.recordedAt.toISOString(),
      recorded_by: tip.provenance.recordedBy,
      note: tip.provenance.note ?? null,
    };
  }

  static toDomain(row: TipRow): Tip {
    const provenance = new Provenance({
      sourceId: createSourceId(row.source_id),
      recordedAt: new Date(row.recorded_at),
      observedAt: row.observed_at ? new Date(row.observed_at) : undefined,
      recordedBy: row.recorded_by,
      note: row.note ?? undefined,
    });

    return new Tip({
      id: createTipId(row.tip_id),
      caseId: createCaseId(row.case_id),
      sourceId: createSourceId(row.source_id),
      originalText: row.original_text,
      receivedAt: new Date(row.received_at),
      epistemicStatus: row.epistemic_status as EpistemicStatus,
      provenance,
    });
  }
}