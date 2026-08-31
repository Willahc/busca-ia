import {
  DISCRIMINATIVE_POWERS,
  EntityResolutionAttribute,
  ENTITY_RESOLUTION_ATTRIBUTES,
} from "../model/entity-resolution-model";
import { AttributeComparator } from "./comparator";
import { BirthDateComparator } from "./birth-date-comparator";
import { ExactValueComparator } from "./exact-value-comparator";
import { NameComparator } from "./name-comparator";

export const COMPARATOR_REGISTRY: Readonly<Record<EntityResolutionAttribute, AttributeComparator>> =
  Object.freeze({
    [ENTITY_RESOLUTION_ATTRIBUTES.FULL_NAME]: new NameComparator(),
    [ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE]: new BirthDateComparator(),
    [ENTITY_RESOLUTION_ATTRIBUTES.SEX]: new ExactValueComparator(
      ENTITY_RESOLUTION_ATTRIBUTES.SEX,
      DISCRIMINATIVE_POWERS.LOW
    ),
    [ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME]: new NameComparator(
      ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
      DISCRIMINATIVE_POWERS.HIGH
    ),
    [ENTITY_RESOLUTION_ATTRIBUTES.FATHER_NAME]: new NameComparator(
      ENTITY_RESOLUTION_ATTRIBUTES.FATHER_NAME,
      DISCRIMINATIVE_POWERS.HIGH
    ),
    [ENTITY_RESOLUTION_ATTRIBUTES.NATIONALITY]: new ExactValueComparator(
      ENTITY_RESOLUTION_ATTRIBUTES.NATIONALITY,
      DISCRIMINATIVE_POWERS.LOW
    ),
    [ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK]: new ExactValueComparator(
      ENTITY_RESOLUTION_ATTRIBUTES.DISTINCTIVE_MARK,
      DISCRIMINATIVE_POWERS.VERY_HIGH,
      true
    ),
  });
