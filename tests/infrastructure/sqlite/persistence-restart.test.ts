import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  Case,
  createCaseId,
  createEvidenceId,
  createFactId,
  createHypothesisId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  createTipId,
  EPISTEMIC_STATUS,
  Evidence,
  Fact,
  Hypothesis,
  HYPOTHESIS_STATUS,
  MissingEvent,
  OFFICIAL_STATUS,
  Person,
  Provenance,
  Source,
  SOURCE_TYPES,
  Tip,
  WORKFLOW_STATUS,
} from "@/domain";
import {
  createSqliteConnection,
  SqliteCaseRepository,
  SqliteEvidenceRepository,
  SqliteFactRepository,
  SqliteHypothesisRepository,
  SqliteMissingEventRepository,
  SqlitePersonRepository,
  SqliteSourceRepository,
  SqliteTipRepository,
} from "@/infrastructure";

describe("19. SQLite Persistence Restart Test (Real Disk File)", () => {
  let tempDbPath: string | null = null;

  afterEach(() => {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
        const walPath = `${tempDbPath}-wal`;
        const shmPath = `${tempDbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      } catch {
        // Ignored in teardown
      }
    }
  });

  it("should survive process/connection restart and reload complete state from physical file", async () => {
    tempDbPath = path.join(os.tmpdir(), `buscaia-restart-test-${Date.now()}.db`);

    const sourceId = createSourceId("SOURCE-RESTART-001");
    const personId = createPersonId("PERSON-RESTART-001");
    const eventId = createMissingEventId("EVENT-RESTART-001");
    const caseId = createCaseId("CASE-RESTART-001");
    const factId = createFactId("FACT-RESTART-001");
    const tipId = createTipId("TIP-RESTART-001");
    const evidenceId = createEvidenceId("EV-RESTART-001");
    const hypothesisId = createHypothesisId("HYP-RESTART-001");

    // PHASE 1: Open connection, insert complete graph, and close
    {
      const db1 = createSqliteConnection({ dbPath: tempDbPath });
      const sourceRepo = new SqliteSourceRepository(db1);
      const personRepo = new SqlitePersonRepository(db1);
      const eventRepo = new SqliteMissingEventRepository(db1);
      const caseRepo = new SqliteCaseRepository(db1);
      const factRepo = new SqliteFactRepository(db1);
      const tipRepo = new SqliteTipRepository(db1);
      const evidenceRepo = new SqliteEvidenceRepository(db1);
      const hypothesisRepo = new SqliteHypothesisRepository(db1);

      await sourceRepo.save(new Source({ id: sourceId, type: SOURCE_TYPES.OFFICIAL_RECORD, label: "Registry One" }));
      await personRepo.save(new Person({ id: personId }));
      await eventRepo.save(new MissingEvent({ id: eventId, personId }));
      await caseRepo.save(new Case({ id: caseId, personId, missingEventId: eventId, workflowStatus: WORKFLOW_STATUS.ACTIVE, officialStatus: OFFICIAL_STATUS.OFFICIALLY_MISSING }));

      const provenance = new Provenance({ sourceId, recordedAt: new Date("2026-08-31T10:00:00Z"), recordedBy: "OPERATOR_RESTART" });

      await factRepo.save(new Fact({ id: factId, subjectId: personId, attribute: "height", value: 175, epistemicStatus: EPISTEMIC_STATUS.CONFIRMED, provenance }));
      await tipRepo.save(new Tip({ id: tipId, caseId, sourceId, originalText: "Relato de persistência persistente.", receivedAt: new Date("2026-08-31T10:10:00Z"), provenance }));
      await evidenceRepo.save(new Evidence({ id: evidenceId, caseId, sourceId, description: "Evidência persistente", provenance }));
      await hypothesisRepo.save(new Hypothesis({ id: hypothesisId, caseId, statement: "Hipótese persistente", status: HYPOTHESIS_STATUS.SUPPORTED, supportingEvidenceIds: [evidenceId] }));

      db1.close();
    }

    // Confirm file exists on disk
    expect(fs.existsSync(tempDbPath)).toBe(true);

    // PHASE 2: Re-open brand new connection to the same file and verify all entities survived
    {
      const db2 = createSqliteConnection({ dbPath: tempDbPath });
      const sourceRepo = new SqliteSourceRepository(db2);
      const personRepo = new SqlitePersonRepository(db2);
      const eventRepo = new SqliteMissingEventRepository(db2);
      const caseRepo = new SqliteCaseRepository(db2);
      const factRepo = new SqliteFactRepository(db2);
      const tipRepo = new SqliteTipRepository(db2);
      const evidenceRepo = new SqliteEvidenceRepository(db2);
      const hypothesisRepo = new SqliteHypothesisRepository(db2);

      const loadedSource = await sourceRepo.findById(sourceId);
      expect(loadedSource).not.toBeNull();
      expect(loadedSource?.label).toBe("Registry One");

      const loadedPerson = await personRepo.findById(personId);
      expect(loadedPerson).not.toBeNull();

      const loadedEvent = await eventRepo.findById(eventId);
      expect(loadedEvent).not.toBeNull();
      expect(loadedEvent?.personId).toBe(personId);

      const loadedCase = await caseRepo.findById(caseId);
      expect(loadedCase).not.toBeNull();
      expect(loadedCase?.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
      expect(loadedCase?.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);

      const loadedFact = await factRepo.findById(factId);
      expect(loadedFact).not.toBeNull();
      expect(loadedFact?.attribute).toBe("height");
      expect(loadedFact?.value).toBe(175);
      expect(loadedFact?.epistemicStatus).toBe(EPISTEMIC_STATUS.CONFIRMED);

      const loadedTip = await tipRepo.findById(tipId);
      expect(loadedTip).not.toBeNull();
      expect(loadedTip?.originalText).toBe("Relato de persistência persistente.");

      const loadedEvidence = await evidenceRepo.findById(evidenceId);
      expect(loadedEvidence).not.toBeNull();
      expect(loadedEvidence?.description).toBe("Evidência persistente");

      const loadedHypothesis = await hypothesisRepo.findById(hypothesisId);
      expect(loadedHypothesis).not.toBeNull();
      expect(loadedHypothesis?.statement).toBe("Hipótese persistente");
      expect(loadedHypothesis?.status).toBe(HYPOTHESIS_STATUS.SUPPORTED);
      expect(loadedHypothesis?.supportingEvidenceIds).toContain(evidenceId);

      db2.close();
    }
  });
});