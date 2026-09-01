import { SOURCE_TYPES, type Source, type SourceType } from "@/domain";
import {
  SOURCE_TRUST_CATEGORIES,
  type SourceTrustCategory,
} from "../model/evidence-assessment-model";

/** Explicit origin-context mapping. It never asserts whether information is true. */
export const SOURCE_TRUST_BY_TYPE: Readonly<Record<SourceType, SourceTrustCategory>> =
  Object.freeze({
    [SOURCE_TYPES.OFFICIAL_RECORD]: SOURCE_TRUST_CATEGORIES.OFFICIAL,
    [SOURCE_TYPES.LAW_ENFORCEMENT]: SOURCE_TRUST_CATEGORIES.INSTITUTIONAL,
    [SOURCE_TYPES.HEALTH_INSTITUTION]: SOURCE_TRUST_CATEGORIES.INSTITUTIONAL,
    [SOURCE_TYPES.SOCIAL_ASSISTANCE]: SOURCE_TRUST_CATEGORIES.INSTITUTIONAL,
    [SOURCE_TYPES.NGO]: SOURCE_TRUST_CATEGORIES.INSTITUTIONAL,
    [SOURCE_TYPES.FAMILY]: SOURCE_TRUST_CATEGORIES.FIRST_PARTY,
    // Authentication proves the source identity, not that the citizen directly witnessed the fact.
    [SOURCE_TYPES.AUTHENTICATED_CITIZEN]: SOURCE_TRUST_CATEGORIES.UNKNOWN,
    [SOURCE_TYPES.ANONYMOUS_REPORT]: SOURCE_TRUST_CATEGORIES.UNVERIFIED,
    [SOURCE_TYPES.SYSTEM_DERIVATION]: SOURCE_TRUST_CATEGORIES.SECONDARY,
    [SOURCE_TYPES.SYNTHETIC_TEST]: SOURCE_TRUST_CATEGORIES.SYNTHETIC,
  });

export function resolveSourceTrust(source: Source | undefined): SourceTrustCategory {
  return source ? SOURCE_TRUST_BY_TYPE[source.type] : SOURCE_TRUST_CATEGORIES.UNKNOWN;
}
