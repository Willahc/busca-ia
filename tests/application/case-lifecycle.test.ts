import { describe, it, expect } from "vitest";
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
  InMemoryCaseRepository,
  InMemoryEvidenceRepository,
  InMemoryFactRepository,
  InMemoryHypothesisRepository,
  InMemoryMissingEventRepository,
  InMemoryPersonRepository,
  InMemorySourceRepository,
  InMemoryTipRepository,
} from "./in-memory";

describe("32. Complete Case Lifecycle Integration (InMemory)", () => {
  it("should execute the full 10-step lifecycle smoothly without framework/database dependencies", async () => {
    // 1. Initialize In-Memory Repositories
    const sourceRepo = new InMemorySourceRepository();
    const personRepo = new InMemoryPersonRepository();
    const eventRepo = new InMemoryMissingEventRepository();
    const caseRepo = new InMemoryCaseRepository();
    const factRepo = new InMemoryFactRepository();
    const tipRepo = new InMemoryTipRepository();
    const evidenceRepo = new InMemoryEvidenceRepository();
    const hypothesisRepo = new InMemoryHypothesisRepository();

    // 2. Initialize Use Cases
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

    // Step 1: Register Source
    const sourceId = createSourceId("SOURCE-INTEGRATION-001");
    const source = await registerSource.execute({
      id: sourceId,
      type: SOURCE_TYPES.OFFICIAL_RECORD,
      label: "Official State Registry",
    });
    expect(source.id).toBe(sourceId);

    const provenance = new Provenance({
      sourceId,
      recordedAt: new Date("2026-08-31T10:00:00Z"),
      recordedBy: "TEST_OPERATOR_001",
    });

    // Step 2: Register Person (incomplete identity allowed)
    const personId = createPersonId("PERSON-INTEGRATION-001");
    const person = await registerPerson.execute({
      id: personId,
    });
    expect(person.id).toBe(personId);

    // Step 3: Register Missing Event
    const eventId = createMissingEventId("EVENT-INTEGRATION-001");
    const missingEvent = await registerMissingEvent.execute({
      id: eventId,
      personId,
    });
    expect(missingEvent.id).toBe(eventId);

    // Step 4: Create Case
    const caseId = createCaseId("CASE-INTEGRATION-001");
    const createdCase = await createCase.execute({
      id: caseId,
      personId,
      missingEventId: eventId,
      workflowStatus: WORKFLOW_STATUS.DRAFT,
      officialStatus: OFFICIAL_STATUS.STATUS_TO_VERIFY,
    });
    expect(createdCase.id).toBe(caseId);
    expect(createdCase.workflowStatus).toBe(WORKFLOW_STATUS.DRAFT);

    // Step 5: Add Fact
    const factId = createFactId("FACT-INTEGRATION-001");
    const fact = await addFact.execute({
      id: factId,
      subjectId: personId,
      attribute: "approximateHeight",
      value: 178,
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });
    expect(fact.id).toBe(factId);

    // Step 6: Register Tip
    const tipId = createTipId("TIP-INTEGRATION-001");
    const tip = await registerTip.execute({
      id: tipId,
      caseId,
      sourceId,
      originalText: "Relato espontaneo recebido informando avistamento próximo ao terminal.",
      receivedAt: new Date("2026-08-31T10:15:00Z"),
      provenance,
    });
    expect(tip.originalText).toContain("terminal");

    // Step 7: Add Evidence
    const evidenceId = createEvidenceId("EV-INTEGRATION-001");
    const evidence = await addEvidence.execute({
      id: evidenceId,
      caseId,
      sourceId,
      description: "Registro de transporte coletivo verificado.",
      epistemicStatus: EPISTEMIC_STATUS.UNVERIFIED,
      provenance,
    });
    expect(evidence.id).toBe(evidenceId);

    // Step 8: Create Hypothesis
    const hypothesisId = createHypothesisId("HYP-INTEGRATION-001");
    const hypothesis = await createHypothesis.execute({
      id: hypothesisId,
      caseId,
      statement: "Pessoa utilizou linha de transporte norte no horário X.",
      supportingEvidenceIds: [evidenceId],
    });
    expect(hypothesis.status).toBe(HYPOTHESIS_STATUS.OPEN);
    expect(hypothesis.supportingEvidenceIds).toContain(evidenceId);

    // Step 9: Change Case Workflow Status
    const activeCase = await changeWorkflow.execute({
      caseId,
      newWorkflowStatus: WORKFLOW_STATUS.ACTIVE,
    });
    expect(activeCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
    expect(activeCase.officialStatus).toBe(OFFICIAL_STATUS.STATUS_TO_VERIFY);

    // Step 10: Update Official Status
    const officiallyMissingCase = await updateOfficial.execute({
      caseId,
      newOfficialStatus: OFFICIAL_STATUS.OFFICIALLY_MISSING,
      provenance,
    });
    expect(officiallyMissingCase.officialStatus).toBe(OFFICIAL_STATUS.OFFICIALLY_MISSING);
    expect(officiallyMissingCase.workflowStatus).toBe(WORKFLOW_STATUS.ACTIVE);
  });
});