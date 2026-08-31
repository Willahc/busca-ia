import { CaseId, MissingEventId, PersonId } from "../shared/entity-id";
import {
  OfficialStatus,
  OFFICIAL_STATUS,
  WorkflowStatus,
  WORKFLOW_STATUS,
} from "./case-status";
import { PrivacyLevel, PRIVACY_LEVELS } from "./privacy-level";
import { Provenance } from "../shared/provenance";
import { EntityValidationError, MissingProvenanceError } from "../shared/domain-errors";

export interface CaseProps {
  readonly id: CaseId;
  readonly personId: PersonId;
  readonly missingEventId: MissingEventId;
  readonly workflowStatus?: WorkflowStatus;
  readonly officialStatus?: OfficialStatus;
  readonly privacyLevel?: PrivacyLevel;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Immutable Root Aggregate representing an investigative case.
 *
 * Enforces clear separation between internal analytical workflow status,
 * external official administrative status, and privacy access level.
 */
export class Case {
  readonly id: CaseId;
  readonly personId: PersonId;
  readonly missingEventId: MissingEventId;
  readonly workflowStatus: WorkflowStatus;
  readonly officialStatus: OfficialStatus;
  readonly privacyLevel: PrivacyLevel;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: CaseProps) {
    if (!props.id) {
      throw new EntityValidationError("Case must have a valid CaseId.");
    }
    if (!props.personId) {
      throw new EntityValidationError("Case must reference a PersonId.");
    }
    if (!props.missingEventId) {
      throw new EntityValidationError("Case must reference a MissingEventId.");
    }

    const workflowStatus = props.workflowStatus ?? WORKFLOW_STATUS.DRAFT;
    if (!Object.values(WORKFLOW_STATUS).includes(workflowStatus)) {
      throw new EntityValidationError(`Invalid WorkflowStatus: '${workflowStatus}'.`);
    }

    const officialStatus = props.officialStatus ?? OFFICIAL_STATUS.STATUS_TO_VERIFY;
    if (!Object.values(OFFICIAL_STATUS).includes(officialStatus)) {
      throw new EntityValidationError(`Invalid OfficialStatus: '${officialStatus}'.`);
    }

    const privacyLevel = props.privacyLevel ?? PRIVACY_LEVELS.RESTRICTED;
    if (!Object.values(PRIVACY_LEVELS).includes(privacyLevel)) {
      throw new EntityValidationError(`Invalid PrivacyLevel: '${privacyLevel}'.`);
    }

    this.id = props.id;
    this.personId = props.personId;
    this.missingEventId = props.missingEventId;
    this.workflowStatus = workflowStatus;
    this.officialStatus = officialStatus;
    this.privacyLevel = privacyLevel;
    this.createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt.getTime()) : new Date(this.createdAt.getTime());

    Object.freeze(this);
  }

  updateWorkflowStatus(newStatus: WorkflowStatus): Case {
    if (!Object.values(WORKFLOW_STATUS).includes(newStatus)) {
      throw new EntityValidationError(`Invalid WorkflowStatus: '${newStatus}'.`);
    }

    return new Case({
      id: this.id,
      personId: this.personId,
      missingEventId: this.missingEventId,
      workflowStatus: newStatus,
      officialStatus: this.officialStatus,
      privacyLevel: this.privacyLevel,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  updateOfficialStatus(newStatus: OfficialStatus, provenance: Provenance): Case {
    if (!Object.values(OFFICIAL_STATUS).includes(newStatus)) {
      throw new EntityValidationError(`Invalid OfficialStatus: '${newStatus}'.`);
    }
    if (!provenance) {
      throw new MissingProvenanceError("Updating official case status requires verification provenance.");
    }

    return new Case({
      id: this.id,
      personId: this.personId,
      missingEventId: this.missingEventId,
      workflowStatus: this.workflowStatus,
      officialStatus: newStatus,
      privacyLevel: this.privacyLevel,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  updatePrivacyLevel(newLevel: PrivacyLevel): Case {
    if (!Object.values(PRIVACY_LEVELS).includes(newLevel)) {
      throw new EntityValidationError(`Invalid PrivacyLevel: '${newLevel}'.`);
    }

    return new Case({
      id: this.id,
      personId: this.personId,
      missingEventId: this.missingEventId,
      workflowStatus: this.workflowStatus,
      officialStatus: this.officialStatus,
      privacyLevel: newLevel,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}