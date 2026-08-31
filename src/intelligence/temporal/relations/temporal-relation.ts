export type TemporalRelationType =
  | "BEFORE"
  | "AFTER"
  | "EQUAL"
  | "OVERLAPS"
  | "CONTAINS"
  | "CONTAINED_BY"
  | "INDETERMINATE";

export interface TemporalRelationProps {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly relation: TemporalRelationType;
  readonly explanation: string;
}

export class TemporalRelation {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly relation: TemporalRelationType;
  readonly explanation: string;

  constructor(props: TemporalRelationProps) {
    this.leftEventId = props.leftEventId;
    this.rightEventId = props.rightEventId;
    this.relation = props.relation;
    this.explanation = props.explanation;
  }
}