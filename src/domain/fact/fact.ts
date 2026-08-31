import { FactId } from "../shared/entity-id";
import { EpistemicStatus, EPISTEMIC_STATUS } from "../shared/epistemic-status";
import { Provenance } from "../shared/provenance";
import {
  DomainInvariantError,
  EntityValidationError,
  InvalidEpistemicTransitionError,
  MissingProvenanceError,
} from "../shared/domain-errors";

export interface FactProps<T = unknown> {
  readonly id: FactId;
  readonly subjectId: string;
  readonly attribute: string;
  readonly value: T;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenance: Provenance;
  readonly confidence?: number;
}

/**
 * Immutable Unit of Knowledge regarding a subject entity.
 *
 * Enforces epistemic invariants:
 * - DERIVED facts must reference parent facts.
 * - SYNTHETIC facts can never be promoted to CONFIRMED.
 * - HYPOTHESIS cannot be transformed into CONFIRMED directly.
 * - Confidence is a technical quality indicator [0.0 - 1.0], NOT an automatic status promoter.
 */
export class Fact<T = unknown> {
  readonly id: FactId;
  readonly subjectId: string;
  readonly attribute: string;
  readonly value: T;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenance: Provenance;
  readonly confidence?: number;

  constructor(props: FactProps<T>) {
    if (!props.id) {
      throw new EntityValidationError("Fact must have a valid FactId.");
    }
    if (!props.subjectId || typeof props.subjectId !== "string" || props.subjectId.trim().length === 0) {
      throw new EntityValidationError("Fact subjectId cannot be empty.");
    }
    if (!props.attribute || typeof props.attribute !== "string" || props.attribute.trim().length === 0) {
      throw new EntityValidationError("Fact attribute cannot be empty.");
    }
    if (!props.epistemicStatus || !Object.values(EPISTEMIC_STATUS).includes(props.epistemicStatus)) {
      throw new EntityValidationError(`Invalid EpistemicStatus: '${props.epistemicStatus}'.`);
    }
    if (!props.provenance) {
      throw new MissingProvenanceError("Fact must have an associated Provenance.");
    }

    if (props.confidence !== undefined) {
      if (typeof props.confidence !== "number" || isNaN(props.confidence) || props.confidence < 0 || props.confidence > 1) {
        throw new DomainInvariantError(`Confidence score must be a number between 0.0 and 1.0 (got ${props.confidence}).`);
      }
    }

    // Invariant: DERIVED facts must reference at least one parent fact ID
    if (props.epistemicStatus === EPISTEMIC_STATUS.DERIVED) {
      if (!props.provenance.hasParentFacts()) {
        throw new MissingProvenanceError(
          `Fact with status '${EPISTEMIC_STATUS.DERIVED}' must reference at least one parent fact in its provenance.`
        );
      }
    }

    this.id = props.id;
    this.subjectId = props.subjectId.trim();
    this.attribute = props.attribute.trim();
    this.value = props.value;
    this.epistemicStatus = props.epistemicStatus;
    this.provenance = props.provenance;
    this.confidence = props.confidence;

    Object.freeze(this);
  }

  /**
   * Promotes an UNVERIFIED fact to CONFIRMED upon receipt of official verification provenance.
   * Throws if current status is SYNTHETIC or HYPOTHESIS.
   */
  confirm(verificationProvenance: Provenance): Fact<T> {
    if (this.epistemicStatus === EPISTEMIC_STATUS.SYNTHETIC) {
      throw new InvalidEpistemicTransitionError(
        EPISTEMIC_STATUS.SYNTHETIC,
        EPISTEMIC_STATUS.CONFIRMED,
        "Synthetic simulation data can never be promoted to CONFIRMED."
      );
    }
    if (this.epistemicStatus === EPISTEMIC_STATUS.HYPOTHESIS) {
      throw new InvalidEpistemicTransitionError(
        EPISTEMIC_STATUS.HYPOTHESIS,
        EPISTEMIC_STATUS.CONFIRMED,
        "Hypotheses cannot be directly promoted to confirmed facts; they require factual derivation/evidence."
      );
    }
    if (!verificationProvenance) {
      throw new MissingProvenanceError("Verification provenance is required to confirm a fact.");
    }

    return new Fact<T>({
      id: this.id,
      subjectId: this.subjectId,
      attribute: this.attribute,
      value: this.value,
      epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
      provenance: verificationProvenance,
      confidence: this.confidence,
    });
  }

  /**
   * Updates the technical confidence metric without mutating or promoting epistemic status.
   */
  withUpdatedConfidence(newConfidence: number): Fact<T> {
    return new Fact<T>({
      id: this.id,
      subjectId: this.subjectId,
      attribute: this.attribute,
      value: this.value,
      epistemicStatus: this.epistemicStatus,
      provenance: this.provenance,
      confidence: newConfidence,
    });
  }
}