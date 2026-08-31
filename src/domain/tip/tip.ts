import { CaseId, SourceId, TipId } from "../shared/entity-id";
import { EpistemicStatus, EPISTEMIC_STATUS } from "../shared/epistemic-status";
import { Provenance } from "../shared/provenance";
import {
  DomainInvariantError,
  EntityValidationError,
  MissingProvenanceError,
} from "../shared/domain-errors";

export interface TipProps {
  readonly id: TipId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly originalText: string;
  readonly receivedAt: Date;
  readonly epistemicStatus?: EpistemicStatus;
  readonly provenance: Provenance;
}

/**
 * Immutable Entity representing an incoming citizen report or analytical tip.
 *
 * Invariant: Tips start as UNVERIFIED (or SYNTHETIC) and preserve original verbatim text.
 */
export class Tip {
  readonly id: TipId;
  readonly caseId: CaseId;
  readonly sourceId: SourceId;
  readonly originalText: string;
  readonly receivedAt: Date;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenance: Provenance;

  constructor(props: TipProps) {
    if (!props.id) {
      throw new EntityValidationError("Tip must have a valid TipId.");
    }
    if (!props.caseId) {
      throw new EntityValidationError("Tip must reference a CaseId.");
    }
    if (!props.sourceId) {
      throw new EntityValidationError("Tip must reference a SourceId.");
    }
    if (!props.originalText || typeof props.originalText !== "string" || props.originalText.trim().length === 0) {
      throw new EntityValidationError("Tip must contain original verbatim text.");
    }
    if (!props.receivedAt || !(props.receivedAt instanceof Date) || isNaN(props.receivedAt.getTime())) {
      throw new EntityValidationError("Tip must have a valid receivedAt Date.");
    }
    if (!props.provenance) {
      throw new MissingProvenanceError("Tip must have associated provenance.");
    }

    const epistemicStatus = props.epistemicStatus ?? EPISTEMIC_STATUS.UNVERIFIED;
    if (epistemicStatus === EPISTEMIC_STATUS.CONFIRMED) {
      throw new DomainInvariantError(
        "Incoming tips cannot be created directly with epistemic status 'CONFIRMED'. They must enter as UNVERIFIED."
      );
    }

    this.id = props.id;
    this.caseId = props.caseId;
    this.sourceId = props.sourceId;
    this.originalText = props.originalText; // Raw text preserved as-is
    this.receivedAt = new Date(props.receivedAt.getTime());
    this.epistemicStatus = epistemicStatus;
    this.provenance = props.provenance;

    Object.freeze(this);
  }
}