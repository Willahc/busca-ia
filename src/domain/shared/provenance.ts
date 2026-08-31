import { FactId, SourceId } from "./entity-id";
import { MissingProvenanceError } from "./domain-errors";

export interface ProvenanceProps {
  readonly sourceId: SourceId;
  readonly recordedAt: Date;
  readonly observedAt?: Date;
  readonly recordedBy: string;
  readonly parentFactIds?: readonly FactId[];
  readonly note?: string;
}

/**
 * Immutable Value Object representing the origin and audit metadata of a piece of knowledge.
 */
export class Provenance {
  readonly sourceId: SourceId;
  readonly recordedAt: Date;
  readonly observedAt?: Date;
  readonly recordedBy: string;
  readonly parentFactIds?: readonly FactId[];
  readonly note?: string;

  constructor(props: ProvenanceProps) {
    if (!props.sourceId) {
      throw new MissingProvenanceError("sourceId is required for provenance.");
    }
    if (!props.recordedAt || !(props.recordedAt instanceof Date) || isNaN(props.recordedAt.getTime())) {
      throw new MissingProvenanceError("recordedAt must be a valid Date representing when the data entered the system.");
    }
    if (!props.recordedBy || typeof props.recordedBy !== "string" || props.recordedBy.trim().length === 0) {
      throw new MissingProvenanceError("recordedBy identifier is required for auditability.");
    }
    if (props.observedAt && (!(props.observedAt instanceof Date) || isNaN(props.observedAt.getTime()))) {
      throw new MissingProvenanceError("observedAt must be a valid Date when provided.");
    }

    this.sourceId = props.sourceId;
    this.recordedAt = new Date(props.recordedAt.getTime());
    this.observedAt = props.observedAt ? new Date(props.observedAt.getTime()) : undefined;
    this.recordedBy = props.recordedBy.trim();
    this.parentFactIds = props.parentFactIds ? Object.freeze([...props.parentFactIds]) : undefined;
    this.note = props.note?.trim();

    Object.freeze(this);
  }

  hasParentFacts(): boolean {
    return !!(this.parentFactIds && this.parentFactIds.length > 0);
  }
}