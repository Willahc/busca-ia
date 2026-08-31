import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
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

describe("SQLite Repositories Roundtrip and Epistemic Integrity", () => {
  let db: Database.Database;
  let sourceRepo: SqliteSourceRepository;
  let personRepo: SqlitePersonRepository;
  let eventRepo: SqliteMissingEventRepository;
  let caseRepo: SqliteCaseRepository;
  let factRepo: SqliteFactRepository;
  let tipRepo: SqliteTipRepository;
  let evidenceRepo: SqliteEvidenceRepository;
  let hypothesisRepo: SqliteHypothesisRepository;

  beforeEach(() => {
    db = createSqliteConnection({ dbPath: ":memory:" });
    sourceRepo = new SqliteSourceRepository(db);
    personRepo = new SqlitePersonRepository(db);
    eventRepo = new SqliteMissingEventRepository(db);
    caseRepo = new SqliteCaseRepository(db);
    factRepo = new SqliteFactRepository(db);
    tipRepo = new SqliteTipRepository(db);
    evidenceRepo = new SqliteEvidenceRepository(db);
    hypothesisRepo = new SqliteHypothesisRepository(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it("5. should persist and retrieve Source correctly", async () => {
    const source = new Source({
      id: createSourceId("SOURCE-SQLITE-001"),
      type: SOURCE_TYPES.OFFICIAL_RECORD,
      label: "Official Civil Bureau",
      externalReference: "DOC-REF-12345",
      isSynthetic: false,
    });

    await sourceRepo.save(source);
    const retrieved = await sourceRepo.findById(source.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(source.id);
    expect(retrieved?.type).toBe(SOURCE_TYPES.OFFICIAL_RECORD);
    expect(retrieved?.label).toBe("Official Civil Bureau");
    expect(retrieved?.externalReference).toBe("DOC-REF-12345");
    expect(retrieved?.isSynthetic).toBe(false);
  });

  it("6, 7, 18. should persist Person and MissingEvent with incomplete information (absent fields remain undefined)", async () => {
    const person = new Person({
      id: createPersonId("PERSON-SQLITE-001"),
    });
    await personRepo.save(person);

    const retrievedPerson = await personRepo.findById(person.id);
    expect(retrievedPerson).not.toBeNull();
    expect(retrievedPerson?.id).toBe(person.id);
    expect(retrievedPerson?.getAllFacts()).toHaveLength(0);
    expect(retrievedPerson?.getFact("cpf")).toBeUndefined(); // Missing remains undefined

    const missingEvent = new MissingEvent({
      id: createMissingEventId("EVENT-SQLITE-001"),
      personId: person.id,
    });
    await eventRepo.save(missingEvent);

    const retrievedEvent = await eventRepo.findById(missingEvent.id);
    expect(retrievedEvent).not.toBeNull();
    expect(retrievedEvent?.id).toBe(missingEvent.id);
    expect(retrievedEvent?.personId).toBe(person.id);
    expect(retrievedEvent?.getAllFacts()).toHaveLength(0);
  });

  it("8, 16, 17. should persist Case preserving workflowStatus and officialStatus separately", async () => {
    const personId = createPersonId("PERSON-SQLITE-002");
    const eventId = createMissingEventId("EVENT-SQLITE-002");
    const caseId = createCaseId("CASE-SQLITE-001");

    await personRepo.save(new Person({ id: personId }));
    await eventRepo.save(new MissingEvent({ id: eventId, personId }));

    const c = new Case({
      id: caseId,
      personId,
      missingEventId: eventId,
      workflowStatus: WORKFLOW_STATUS.ACTIVE,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });

    await caseRepo.save(c);

    const retrieved = await caseRepo.findById(caseId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(caseId);
    expect(retrieved?.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(retrieved?.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);
  });

  it("9, 10, 23. should persist Fact with complex JSON value, provenance, parentFactIds and confidence in atomic transaction", async () => {
    const sourceId = createSourceId("SOURCE-SQLITE-002");
    await sourceRepo.save(
      new Source({
        id: sourceId,
        type: SOURCE_TYPES.HEALTH_INSTITUTION,
        label: "General Hospital Unit",
      })
    );

    const parentFact = new Fact({
      id: createFactId("FACT-PARENT-001"),
      subjectId: "PERSON-SQLITE-001",
      attribute: "birthYear",
      value: 1990,
      epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T08:00:00Z"),
        recordedBy: "NURSE_DESK",
      }),
    });
    await factRepo.save(parentFact);

    const derivedFact = new Fact({
      id: createFactId("FACT-DERIVED-001"),
      subjectId: "PERSON-SQLITE-001",
      attribute: "calculatedAgeRange",
      value: { min: 35, max: 36 },
      epistemicStatus: EPISTEMIC_STATUS.DERIVED,
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T09:00:00Z"),
        observedAt: new Date("2026-08-30T15:00:00Z"),
        recordedBy: "SYSTEM_ALGO",
        parentFactIds: [parentFact.id],
        note: "Deterministic age derivation",
      }),
      confidence: 0.98,
    });

    await factRepo.save(derivedFact);

    const retrieved = await factRepo.findById(derivedFact.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(derivedFact.id);
    expect(retrieved?.attribute).toBe("calculatedAgeRange");
    expect(retrieved?.value).toEqual({ min: 35, max: 36 });
    expect(retrieved?.epistemicStatus).toBe(EPISTEMIC_STATUS.DERIVED);
    expect(retrieved?.confidence).toBe(0.98);
    expect(retrieved?.provenance.sourceId).toBe(sourceId);
    expect(retrieved?.provenance.note).toBe("Deterministic age derivation");
    expect(retrieved?.provenance.parentFactIds).toHaveLength(1);
    expect(retrieved?.provenance.parentFactIds?.[0]).toBe(parentFact.id);
  });

  it("11. should persist Tip preserving originalText verbatim with accentuation and newlines", async () => {
    const sourceId = createSourceId("SOURCE-SQLITE-003");
    const caseId = createCaseId("CASE-SQLITE-002");
    const personId = createPersonId("PERSON-SQLITE-003");
    const eventId = createMissingEventId("EVENT-SQLITE-003");

    await sourceRepo.save(new Source({ id: sourceId, type: SOURCE_TYPES.AUTHENTICATED_CITIZEN, label: "Citizen App" }));
    await personRepo.save(new Person({ id: personId }));
    await eventRepo.save(new MissingEvent({ id: eventId, personId }));
    await caseRepo.save(new Case({ id: caseId, personId, missingEventId: eventId }));

    const rawMultilineText = "Relato de teste com acentuação: José da Silva.\nLinha 2 — conteúdo preservado integralmente.\nLinha 3 com pontuação: !@#$%&*()";

    const tip = new Tip({
      id: createTipId("TIP-SQLITE-001"),
      caseId,
      sourceId,
      originalText: rawMultilineText,
      receivedAt: new Date("2026-08-31T09:15:00Z"),
      provenance: new Provenance({
        sourceId,
        recordedAt: new Date("2026-08-31T09:15:00Z"),
        recordedBy: "PUBLIC_PORTAL",
      }),
    });

    await tipRepo.save(tip);

    const retrieved = await tipRepo.findById(tip.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.originalText).toBe(rawMultilineText);
    expect(retrieved?.epistemicStatus).toBe(EPISTEMIC_STATUS.UNVERIFIED);
  });

  it("12, 13, 14, 15, 24. should persist Evidence and Hypothesis with supporting and contradicting relationships in atomic transaction", async () => {
    const sourceId = createSourceId("SOURCE-SQLITE-004");
    const caseId = createCaseId("CASE-SQLITE-003");
    const personId = createPersonId("PERSON-SQLITE-004");
    const eventId = createMissingEventId("EVENT-SQLITE-004");

    await sourceRepo.save(new Source({ id: sourceId, type: SOURCE_TYPES.NGO, label: "Shelter Organization" }));
    await personRepo.save(new Person({ id: personId }));
    await eventRepo.save(new MissingEvent({ id: eventId, personId }));
    await caseRepo.save(new Case({ id: caseId, personId, missingEventId: eventId }));

    const evSupporting = new Evidence({
      id: createEvidenceId("EV-SUP-001"),
      caseId,
      sourceId,
      description: "Registro de acolhimento em abrigo.",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance: new Provenance({ sourceId, recordedAt: new Date(), recordedBy: "NGO_WORKER" }),
    });
    await evidenceRepo.save(evSupporting);

    const evContradicting = new Evidence({
      id: createEvidenceId("EV-CON-001"),
      caseId,
      sourceId,
      description: "Registro de câmera de monitoramento em local incompatível.",
      epistemicStatus: EPISTEMIC_STATUS.CONFIRMED,
      provenance: new Provenance({ sourceId, recordedAt: new Date(), recordedBy: "ANALYST_001" }),
    });
    await evidenceRepo.save(evContradicting);

    const hypothesis = new Hypothesis({
      id: createHypothesisId("HYP-SQLITE-001"),
      caseId,
      statement: "Pessoa esteve no abrigo comunitário em 30/08.",
      status: HYPOTHESIS_STATUS.SUPPORTED,
      supportingEvidenceIds: [evSupporting.id],
      contradictingEvidenceIds: [evContradicting.id],
    });

    await hypothesisRepo.save(hypothesis);

    const retrievedHyp = await hypothesisRepo.findById(hypothesis.id);
    expect(retrievedHyp).not.toBeNull();
    expect(retrievedHyp?.id).toBe(hypothesis.id);
    expect(retrievedHyp?.statement).toBe("Pessoa esteve no abrigo comunitário em 30/08.");
    expect(retrievedHyp?.status).toBe(HYPOTHESIS_STATUS.SUPPORTED);
    expect(retrievedHyp?.supportingEvidenceIds).toContain(evSupporting.id);
    expect(retrievedHyp?.contradictingEvidenceIds).toContain(evContradicting.id);
  });
});