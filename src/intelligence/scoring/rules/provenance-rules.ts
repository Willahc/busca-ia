import type { Fact, FactId } from "@/domain";

interface RootResolution {
  readonly rootFactIds: ReadonlySet<FactId>;
  readonly rootSourceIds: ReadonlySet<string>;
  readonly complete: boolean;
}
function resolveRoots(
  factId: FactId,
  factById: ReadonlyMap<FactId, Fact>,
  visiting = new Set<FactId>()
): RootResolution {
  const fact = factById.get(factId);
  if (!fact || visiting.has(factId)) {
    return { rootFactIds: new Set([factId]), rootSourceIds: new Set(), complete: false };
  }
  const parents = fact.provenance.parentFactIds ?? [];
  if (parents.length === 0) {
    return {
      rootFactIds: new Set([fact.id]),
      rootSourceIds: new Set([fact.provenance.sourceId]),
      complete: true,
    };
  }

  const nextVisiting = new Set(visiting).add(factId);
  const resolved = parents.map((parentId) => resolveRoots(parentId, factById, nextVisiting));
  return {
    rootFactIds: new Set(resolved.flatMap((item) => [...item.rootFactIds])),
    rootSourceIds: new Set(resolved.flatMap((item) => [...item.rootSourceIds])),
    complete: resolved.every((item) => item.complete),
  };
}

export function rootFactIdsFor(
  factIds: readonly FactId[],
  facts: readonly Fact[]
): readonly FactId[] {
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  return [
    ...new Set(factIds.flatMap((factId) => [...resolveRoots(factId, factById).rootFactIds])),
  ].sort();
}

/**
 * Conservative independence proof. Different IDs alone are not enough when derived
 * facts share a root; unresolved parent provenance also prevents independence.
 */
export function areIndependentSources(
  leftFactIds: readonly FactId[],
  rightFactIds: readonly FactId[],
  facts: readonly Fact[]
): boolean {
  if (leftFactIds.length === 0 || rightFactIds.length === 0) return false;
  const factById = new Map(facts.map((fact) => [fact.id, fact]));

  return leftFactIds.some((leftId) => {
    const left = resolveRoots(leftId, factById);
    if (!left.complete || left.rootSourceIds.size === 0) return false;
    return rightFactIds.some((rightId) => {
      const right = resolveRoots(rightId, factById);
      if (!right.complete || right.rootSourceIds.size === 0) return false;
      const sourcesOverlap = [...left.rootSourceIds].some((id) => right.rootSourceIds.has(id));
      const factsOverlap = [...left.rootFactIds].some((id) => right.rootFactIds.has(id));
      return !sourcesOverlap && !factsOverlap;
    });
  });
}
