import { CaseId, EvidenceId, SourceId } from "../shared/entity-id";
import { EpistemicStatus, EPISTEMIC_STATUS } from "../shared/epistemic-status";
import { Provenance } from "../shared/provenance";
import { EntityValidationError, MissingProvenanceError } from "../shared/domain-errors";

export interface EvidenceProps {
  readonly id: EvidenceId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly description: string;
  readonly epistemicStatus?: EpistemicStatus;
  readonly provenance: Provenance;
  readonly createdAt?: Date;
}

/**
 * Immutable Entity representing an investigative piece of evidence or finding.
 *
 * Distinct from hypothesis: An evidence item documents an acquired artifact/observation,
 * regardless of which hypothesis it ultimately supports or refutes.
 */
export class Evidence {
  readonly id: EvidenceId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly description: string;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenance: Provenance;
  readonly createdAt: Date;

  constructor(props: EvidenceProps) {
    if (!props.id) {
      throw new EntityValidationError("Evidence must have a valid EvidenceId.");
    }
    if (!props.caseId) {
      throw new EntityValidationError("Evidence must reference a CaseId.");
    }
    if (!props.sourceId) {
      throw new EntityValidationError("Evidence must reference a SourceId.");
    }
    if (!props.description || typeof props.description !== "string" || props.description.trim().length === 0) {
      throw new EntityValidationError("Evidence must have a non-empty description.");
    }
    if (!props.provenance) {
      throw new MissingProvenanceError("Evidence must have associated provenance.");
    }

    const epistemicStatus = props.epistemicStatus ?? EPISTEMIC_STATUS.UNVERIFIED;
    if (!Object.values(EPISTEMIC_STATUS).includes(epistemicStatus)) {
      throw new EntityValidationError(`Invalid EpistemicStatus: '${epistemicStatus}'.`);
    }

    this.id = props.id;
    this.caseId = props.caseId;
    this.sourceId = props.sourceId;
    this.description = props.description.trim();
    this.epistemicStatus = epistemicStatus;
    this.provenance = props.provenance;
    this.createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();

    Object.freeze(this);
  }
}