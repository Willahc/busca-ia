import {
  createCaseId,
  createEvidenceId,
  createSourceId,
  EpistemicStatus,
  Evidence,
  Provenance,
} from "@/domain";

export interface EvidenceRow {
  evidence_id: string;
  case_id: string;
  source_id: string;
  description: string;
  epistemic_status: string;
  observed_at: string | null;
  recorded_at: string;
  recorded_by: string;
  note: string | null;
  created_at: string;
}

export class EvidenceMapper {
  static toRow(evidence: Evidence): EvidenceRow {
    return {
      evidence_id: evidence.id,
      case_id: evidence.caseId,
      source_id: evidence.sourceId,
      description: evidence.description,
      epistemic_status: evidence.epistemicStatus,
      observed_at: evidence.provenance.observedAt ? evidence.provenance.observedAt.toISOString() : null,
      recorded_at: evidence.provenance.recordedAt.toISOString(),
      recorded_by: evidence.provenance.recordedBy,
      note: evidence.provenance.note ?? null,
      created_at: evidence.createdAt.toISOString(),
    };
  }

  static toDomain(row: EvidenceRow): Evidence {
    const provenance = new Provenance({
      sourceId: createSourceId(row.source_id),
      recordedAt: new Date(row.recorded_at),
      observedAt: row.observed_at ? new Date(row.observed_at) : undefined,
      recordedBy: row.recorded_by,
      note: row.note ?? undefined,
    });

    return new Evidence({
      id: createEvidenceId(row.evidence_id),
      caseId: createCaseId(row.case_id),
      sourceId: createSourceId(row.source_id),
      description: row.description,
      epistemicStatus: row.epistemic_status as EpistemicStatus,
      provenance,
      createdAt: new Date(row.created_at),
    });
  }
}