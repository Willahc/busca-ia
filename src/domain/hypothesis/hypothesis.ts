import { CaseId, EvidenceId, HypothesisId } from "../shared/entity-id";
import { HypothesisStatus, HYPOTHESIS_STATUS } from "./hypothesis-status";
import { EntityValidationError } from "../shared/domain-errors";

export interface HypothesisProps {
  readonly id: HypothesisId;
  readonly caseId: CaseId;
  readonly statement: string;
  readonly status?: HypothesisStatus;
  readonly supportingEvidenceIds?: readonly EvidenceId[];
  readonly contradictingEvidenceIds?: readonly EvidenceId[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Immutable Entity representing an investigative hypothesis.
 *
 * INVARIANT: A Hypothesis is NEVER a Confirmed Fact, even when status is 'SUPPORTED'.
 * No method exists to transform a Hypothesis directly into a Fact.
 */
export class Hypothesis {
  readonly id: HypothesisId;
  readonly caseId: CaseId;
  readonly statement: string;
  readonly status: HypothesisStatus;
  readonly supportingEvidenceIds: readonly EvidenceId[];
  readonly contradictingEvidenceIds: readonly EvidenceId[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: HypothesisProps) {
    if (!props.id) {
      throw new EntityValidationError("Hypothesis must have a valid HypothesisId.");
    }
    if (!props.caseId) {
      throw new EntityValidationError("Hypothesis must reference a CaseId.");
    }
    if (!props.statement || typeof props.statement !== "string" || props.statement.trim().length === 0) {
      throw new EntityValidationError("Hypothesis must contain a clear investigative statement.");
    }

    const status = props.status ?? HYPOTHESIS_STATUS.OPEN;
    if (!Object.values(HYPOTHESIS_STATUS).includes(status)) {
      throw new EntityValidationError(`Invalid HypothesisStatus: '${status}'.`);
    }

    this.id = props.id;
    this.caseId = props.caseId;
    this.statement = props.statement.trim();
    this.status = status;
    this.supportingEvidenceIds = Object.freeze(props.supportingEvidenceIds ? [...props.supportingEvidenceIds] : []);
    this.contradictingEvidenceIds = Object.freeze(props.contradictingEvidenceIds ? [...props.contradictingEvidenceIds] : []);
    this.createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt.getTime()) : new Date(this.createdAt.getTime());

    Object.freeze(this);
  }

  addSupportingEvidence(evidenceId: EvidenceId): Hypothesis {
    if (!evidenceId) {
      throw new EntityValidationError("Must provide a valid EvidenceId.");
    }
    if (this.supportingEvidenceIds.includes(evidenceId)) {
      return this;
    }

    const newSupporting = [...this.supportingEvidenceIds, evidenceId];
    return new Hypothesis({
      id: this.id,
      caseId: this.caseId,
      statement: this.statement,
      status: this.status === HYPOTHESIS_STATUS.OPEN ? HYPOTHESIS_STATUS.SUPPORTED : this.status,
      supportingEvidenceIds: newSupporting,
      contradictingEvidenceIds: this.contradictingEvidenceIds,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  addContradictingEvidence(evidenceId: EvidenceId): Hypothesis {
    if (!evidenceId) {
      throw new EntityValidationError("Must provide a valid EvidenceId.");
    }
    if (this.contradictingEvidenceIds.includes(evidenceId)) {
      return this;
    }

    const newContradicting = [...this.contradictingEvidenceIds, evidenceId];
    return new Hypothesis({
      id: this.id,
      caseId: this.caseId,
      statement: this.statement,
      status: this.status === HYPOTHESIS_STATUS.SUPPORTED ? HYPOTHESIS_STATUS.WEAKENED : this.status,
      supportingEvidenceIds: this.supportingEvidenceIds,
      contradictingEvidenceIds: newContradicting,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  updateStatus(newStatus: HypothesisStatus): Hypothesis {
    if (!Object.values(HYPOTHESIS_STATUS).includes(newStatus)) {
      throw new EntityValidationError(`Invalid HypothesisStatus: '${newStatus}'.`);
    }

    return new Hypothesis({
      id: this.id,
      caseId: this.caseId,
      statement: this.statement,
      status: newStatus,
      supportingEvidenceIds: this.supportingEvidenceIds,
      contradictingEvidenceIds: this.contradictingEvidenceIds,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}