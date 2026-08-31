import { SourceId } from "../shared/entity-id";
import { SourceType, SOURCE_TYPES } from "./source-type";
import { EntityValidationError } from "../shared/domain-errors";

export interface SourceProps {
  readonly id: SourceId;
  readonly type: SourceType;
  readonly label: string;
  readonly externalReference?: string;
  readonly isSynthetic?: boolean;
}

/**
 * Immutable Entity representing the origin/channel of investigative information.
 */
export class Source {
  readonly id: SourceId;
  readonly type: SourceType;
  readonly label: string;
  readonly externalReference?: string;
  readonly isSynthetic: boolean;

  constructor(props: SourceProps) {
    if (!props.id) {
      throw new EntityValidationError("Source must have a valid SourceId.");
    }
    if (!props.type || !Object.values(SOURCE_TYPES).includes(props.type)) {
      throw new EntityValidationError(`Invalid SourceType: '${props.type}'.`);
    }
    if (!props.label || typeof props.label !== "string" || props.label.trim().length === 0) {
      throw new EntityValidationError("Source label cannot be empty.");
    }

    const isSyntheticExplicit = props.isSynthetic ?? false;
    const isSyntheticByType = props.type === SOURCE_TYPES.SYNTHETIC_TEST;

    if (isSyntheticByType && !isSyntheticExplicit && props.isSynthetic !== undefined && !props.isSynthetic) {
      throw new EntityValidationError("A Source with type SYNTHETIC_TEST cannot have isSynthetic set to false.");
    }

    this.id = props.id;
    this.type = props.type;
    this.label = props.label.trim();
    this.externalReference = props.externalReference?.trim();
    this.isSynthetic = isSyntheticExplicit || isSyntheticByType;

    Object.freeze(this);
  }
}