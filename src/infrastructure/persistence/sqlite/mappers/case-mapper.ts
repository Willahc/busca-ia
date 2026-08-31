import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  OfficialStatus,
  PrivacyLevel,
  WorkflowStatus,
} from "@/domain";

export interface CaseRow {
  case_id: string;
  person_id: string;
  missing_event_id: string;
  workflow_status: string;
  official_status: string;
  privacy_level?: string;
  created_at: string;
  updated_at: string;
}

export class CaseMapper {
  static toRow(c: Case): CaseRow {
    return {
      case_id: c.id,
      person_id: c.personId,
      missing_event_id: c.missingEventId,
      workflow_status: c.workflowStatus,
      official_status: c.officialStatus,
      privacy_level: c.privacyLevel,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    };
  }

  static toDomain(row: CaseRow): Case {
    return new Case({
      id: createCaseId(row.case_id),
      personId: createPersonId(row.person_id),
      missingEventId: createMissingEventId(row.missing_event_id),
      workflowStatus: row.workflow_status as WorkflowStatus,
      officialStatus: row.official_status as OfficialStatus,
      privacyLevel: (row.privacy_level as PrivacyLevel) || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}