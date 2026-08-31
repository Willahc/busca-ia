import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Case,
  createCaseId,
  createFactId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  EpistemicStatus,
  Fact,
  MissingEvent,
  Person,
  Provenance,
  Source,
} from "@/domain";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

describe("Application Use Case: AnalyzeCaseTimeline", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  it("1. should throw EntityNotFoundError when case does not exist", async () => {
    const container = globalThis.__buscaIaAppContainer!;
    await expect(
      container.useCases.analyzeCaseTimeline.execute({
        caseId: createCaseId("CASE-NON-EXISTENT"),
      })
    ).rejects.toThrow("CASE-NON-EXISTENT");
  });

  it("2. should orchestrate full temporal analysis across case entities", async () => {
    const container = globalThis.__buscaIaAppContainer!;

    const sourceId = createSourceId("SRC-APP-001");
    const personId = createPersonId("PER-APP-001");
    const missingEventId = createMissingEventId("ME-APP-001");
    const caseId = createCaseId("CASE-APP-001");

    await container.repositories.sourceRepository.save(
      new Source({ id: sourceId, type: "OFFICIAL_RECORD", label: "Registry" })
    );
    await container.repositories.personRepository.save(new Person({ id: personId }));
    await container.repositories.missingEventRepository.save(
      new MissingEvent({ id: missingEventId, personId, createdAt: new Date("2026-08-30T10:00:00Z") })
    );
    await container.repositories.caseRepository.save(
      new Case({ id: caseId, personId, missingEventId })
    );

    // Save a temporal fact
    await container.repositories.factRepository.save(
      new Fact({
        id: createFactId("FACT-APP-01"),
        subjectId: personId,
        attribute: "last_seen.at",
        value: "2026-08-29T14:00:00Z",
        epistemicStatus: "CONFIRMED",
        provenance: new Provenance({
          sourceId,
          recordedAt: new Date("2026-08-29T14:00:00Z"),
          recordedBy: "OFFICER",
        }),
      })
    );

    const result = await container.useCases.analyzeCaseTimeline.execute({ caseId });
    expect(result.status).toBe("ANALYZED");
    expect(result.events.length).toBeGreaterThanOrEqual(2);
    expect(result.relations.length).toBeGreaterThanOrEqual(1);
  });
});