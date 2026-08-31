import {
  createCaseId,
  createHypothesisId,
  EvidenceId,
  Hypothesis,
  HypothesisStatus,
} from "@/domain";

export interface HypothesisRow {
  hypothesis_id: string;
  case_id: string;
  statement: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class HypothesisMapper {
  static toRow(hypothesis: Hypothesis): HypothesisRow {
    return {
      hypothesis_id: hypothesis.id,
      case_id: hypothesis.caseId,
      statement: hypothesis.statement,
      status: hypothesis.status,
      created_at: hypothesis.createdAt.toISOString(),
      updated_at: hypothesis.updatedAt.toISOString(),
    };
  }

  static toDomain(
    row: HypothesisRow,
    supportingEvidenceIds: readonly EvidenceId[] = [],
    contradictingEvidenceIds: readonly EvidenceId[] = []
  ): Hypothesis {
    return new Hypothesis({
      id: createHypothesisId(row.hypothesis_id),
      caseId: createCaseId(row.case_id),
      statement: row.statement,
      status: row.status as HypothesisStatus,
      supportingEvidenceIds,
      contradictingEvidenceIds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}