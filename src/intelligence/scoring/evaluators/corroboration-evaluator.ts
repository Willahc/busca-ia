import type { Fact, FactId, SourceId } from "@/domain";
import {
  CORROBORATION_CATEGORIES,
  type CorroborationCategory,
} from "../model/evidence-assessment-model";
import { areIndependentSources } from "../rules/provenance-rules";

export function evaluateCorroboration(
  leftFactIds: readonly FactId[],
  rightFactIds: readonly FactId[],
  sourceIds: readonly SourceId[],
  facts: readonly Fact[],
  conflicting = false
): CorroborationCategory {
  if (conflicting && sourceIds.length > 1) return CORROBORATION_CATEGORIES.CONFLICTING_SOURCES;
  if (sourceIds.length === 0) return CORROBORATION_CATEGORIES.NONE;
  if (sourceIds.length === 1) return CORROBORATION_CATEGORIES.SINGLE_SOURCE;
  if (areIndependentSources(leftFactIds, rightFactIds, facts)) {
    return CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE;
  }
  return CORROBORATION_CATEGORIES.MULTI_SOURCE;
}
