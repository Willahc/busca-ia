import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  createCaseId,
  createEvidenceId,
  createFactId,
  createHypothesisId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  createTipId,
  EPISTEMIC_STATUS,
  HYPOTHESIS_STATUS,
  OFFICIAL_STATUS,
  Provenance,
  SOURCE_TYPES,
  WORKFLOW_STATUS,
} from "@/domain";
import {
  AddEvidence,
  AddFact,
  ChangeCaseWorkflowStatus,
  CreateCase,
  CreateHypothesis,
  RegisterMissingEvent,
  RegisterPerson,
  RegisterSource,
  RegisterTip,
  UpdateOfficialStatus,
} from "@/application";
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

describe("20. Full Application Lifecycle on Real SQLite Infrastructure", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createSqliteConnection({ dbPath: ":memory:" });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it("should execute all 10 application use cases end-to-end using SQLite repositories", async () => {
    // 1. Instantiate SQLite Repositories
    const sourceRepo = new SqliteSourceRepository(db);
    const personRepo = new SqlitePersonRepository(db);
    const eventRepo = new SqliteMissingEventRepository(db);
    const caseRepo = new SqliteCaseRepository(db);
    const factRepo = new SqliteFactRepository(db);
    const tipRepo = new SqliteTipRepository(db);
    const evidenceRepo = new SqliteEvidenceRepository(db);
    const hypothesisRepo = new SqliteHypothesisRepository(db);

    // 2. Instantiate Application Use Cases
    const registerSource = new RegisterSource(sourceRepo);
    const registerPerson = new RegisterPerson(personRepo);
    const registerMissingEvent = new RegisterMissingEvent(eventRepo, personRepo);
    const createCase = new CreateCase(caseRepo, personRepo, eventRepo);
    const addFact = new AddFact(factRepo, sourceRepo);
    const registerTip = new RegisterTip(tipRepo, caseRepo, sourceRepo);
    const addEvidence = new AddEvidence(evidenceRepo, caseRepo, sourceRepo);
    const createHypothesis = new CreateHypothesis(hypothesisRepo, caseRepo, evidenceRepo);
    const changeWorkflow = new ChangeCaseWorkflowStatus(caseRepo);
    const updateOfficial = new UpdateOfficialStatus(caseRepo, sourceRepo);

    // 1. Register Source
    const sourceId = createSourceId("SOURCE-SQLITE-LIFECYCLE-001");
    const source = await registerSource.execute({
      id: sourceId,
      type: SOURCE_TYPES.OFFICIAL_RECORD,
      label: "Official State Missing Persons Registry",
    });
    expect(source.id).toBe(sourceId);

    const provenance = new Provenance({
      sourceId,
      recordedAt: new Date("2026-08-31T10:00:00Z"),
      recordedBy: "OPERATOR_SQLITE_01",
    });

    // 2. Register Person
    const personId = createPersonId("PERSON-SQLITE-LIFECYCLE-001");
    const person = await registerPerson.execute({ id: personId });
    expect(person.id).toBe(personId);

    // 3. Register Missing Event
    const eventId = createMissingEventId("EVENT-SQLITE-LIFECYCLE-001");
    const missingEvent = await registerMissingEvent.execute({ id: eventId, personId });
    expect(missingEvent.id).toBe(eventId);

    // 4. Create Case
    const caseId = createCaseId("CASE-SQLITE-LIFECYCLE-001");
    const createdCase = await createCase.execute({
      id: caseId,
      personId,
      missingEventId: eventId,
      workflowStatus: WORKFLOW_STATUS.DRAFT,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });
    expect(createdCase.workflowStatus).toBe(WORKFLOW_STATUS.DRAFT);

    // 5. Add Fact
    const factId = createFactId("FACT-SQLITE-LIFECYCLE-001");
    const fact = await addFact.execute({
      id: factId,
      subjectId: personId,
      attribute: "approximateHeight",
      value: 182,
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });
    expect(fact.attribute).toBe("approximateHeight");

    // 6. Register Tip
    const tipId = createTipId("TIP-SQLITE-LIFECYCLE-001");
    const tip = await registerTip.execute({
      id: tipId,
      caseId,
      sourceId,
      originalText: "Relato recebido informando avistamento perto do centro comercial.",
      receivedAt: new Date("2026-08-31T10:30:00Z"),
      provenance,
    });
    expect(tip.originalText).toContain("avistamento");

    // 7. Add Evidence
    const evidenceId = createEvidenceId("EV-SQLITE-LIFECYCLE-001");
    const evidence = await addEvidence.execute({
      id: evidenceId,
      caseId,
      sourceId,
      description: "Registro de acolhimento social confirmado.",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });
    expect(evidence.id).toBe(evidenceId);

    // 8. Create Hypothesis
    const hypothesisId = createHypothesisId("HYP-SQLITE-LIFECYCLE-001");
    const hypothesis = await createHypothesis.execute({
      id: hypothesisId,
      caseId,
      statement: "Pessoa buscou atendimento na unidade social central.",
      supportingEvidenceIds: [evidenceId],
    });
    expect(hypothesis.supportingEvidenceIds).toContain(evidenceId);

    // 9. Change Case Workflow Status
    const activeCase = await changeWorkflow.execute({
      caseId,
      newWorkflowStatus: WORKFLOW_STATUS.ACTIVE,
    });
    expect(activeCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(activeCase.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);

    // 10. Update Official Status
    const officiallyMissingCase = await updateOfficial.execute({
      caseId,
      newOfficialStatus: OFFICIAL_STATUS.OFFICIALLY_MISSING,
      provenance,
    });
    expect(officiallyMissingCase.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
    expect(officiallyMissingCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
  });
});