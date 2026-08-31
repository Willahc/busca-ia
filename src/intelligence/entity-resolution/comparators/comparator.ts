import type {
  AttributeAssertion,
  AttributeComparison,
  EntityResolutionAttribute,
} from "../model/entity-resolution-model";

export interface AttributeComparator {
  readonly attribute: EntityResolutionAttribute;
  compare(
    left: AttributeAssertion | undefined,
    right: AttributeAssertion | undefined
  ): AttributeComparison;
}
