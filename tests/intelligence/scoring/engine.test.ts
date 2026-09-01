import { describe, expect, it } from "vitest";
import {
  createCaseId,
  createEvidenceId,
  createFactId,
  createPersonId,
  createSourceId,
  EPISTEMIC_STATUS,
  Fact,
  Person,
  Provenance,
  Source,
  type EpistemicStatus,
  type FactId,
  type SourceId,
} from "@/domain";
import {
  buildEntityResolutionCandidate,
  COMPARISON_OUTCOMES,
  CORROBORATION_CATEGORIES,
  DATA_SUFFICIENCY_LEVELS,
  EvidenceAssessmentEngine,
  EVIDENCE_SIGNAL_NOTE_CODES,
  EVIDENCE_SIGNAL_TYPES,
  EntityResolutionEngine,
  ENTITY_RESOLUTION_ATTRIBUTES,
  INFORMATION_GAIN_CATEGORIES,
  INVESTIGATIVE_CONCLUSIONS,
  SOURCE_TRUST_CATEGORIES,
  STRENGTH_CATEGORIES,
  TemporalAnalysisResult,
  TemporalContradiction,
  TemporalRelation,
  TimelineEvent,
} from "@/intelligence";

const caseId = createCaseId("CASE-SCORING-SYNTHETIC");
const leftPerson = new Person({ id: createPersonId("PERSON-SCORING-LEFT") });
const rightPerson = new Person({ id: createPersonId("PERSON-SCORING-RIGHT") });

interface FactDefinition {
  readonly id: string;
  readonly person: Person;
  readonly attribute: string;
  readonly value: unknown;
  readonly sourceId: SourceId;
  readonly status?: EpistemicStatus;
  readonly parentFactIds?: readonly FactId[];
}

function fact(definition: FactDefinition): Fact {
  return new Fact({
    id: createFactId(definition.id),
    subjectId: definition.person.id,
    attribute: definition.attribute,
    value: definition.value,
    epistemicStatus: definition.status ?? EPISTEMIC_STATUS.CONFIRMED,
    provenance: new Provenance({
      sourceId: definition.sourceId,
      recordedAt: new Date("2026-09-01T12:00:00Z"),
      recordedBy: "SYNTHETIC-SCORING-TEST",
      parentFactIds: definition.parentFactIds,
    }),
  });
}

function source(id: string, type: ConstructorParameters<typeof Source>[0]["type"]): Source {
  return new Source({ id: createSourceId(id), type, label: `Synthetic ${id}` });
}

function assess(facts: readonly Fact[], sources: readonly Source[]) {
  const result = EntityResolutionEngine.compare(
    buildEntityResolutionCandidate(
      leftPerson,
      facts.filter((item) => item.subjectId === leftPerson.id)
    ),
    buildEntityResolutionCandidate(
      rightPerson,
      facts.filter((item) => item.subjectId === rightPerson.id)
    )
  );
  return EvidenceAssessmentEngine.assess({
    caseId,
    entityResolutionResult: result,
    facts,
    sources,
  });
}

function matchedPair(
  suffix: string,
  attribute: string,
  value: unknown,
  leftSource: SourceId,
  rightSource = leftSource,
  status: EpistemicStatus = EPISTEMIC_STATUS.CONFIRMED
): readonly Fact[] {
  return [
    fact({ id: `FACT-${suffix}-LEFT`, person: leftPerson, attribute, value, sourceId: leftSource, status }),
    fact({ id: `FACT-${suffix}-RIGHT`, person: rightPerson, attribute, value, sourceId: rightSource, status }),
  ];
}

describe("EvidenceAssessmentEngine", () => {
  it("keeps a sex-only match insufficient and generic pairs non-meaningful", () => {
    const registry = source("SOURCE-GENERIC", "OFFICIAL_RECORD");
    const sexOnly = assess(
      matchedPair("SEX", "person.sex", "FEMALE", registry.id),
      [registry]
    );
    expect(sexOnly.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INSUFFICIENT_DATA);
    expect(sexOnly.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.INSUFFICIENT);

    const genericPair = assess(
      [
        ...matchedPair("SEX-2", "person.sex", "FEMALE", registry.id),
        ...matchedPair("NATIONALITY", "person.nationality", "BR", registry.id),
      ],
      [registry]
    );
    expect(genericPair.conclusion).toBe(
      INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_LOW_EVIDENCE
    );
    expect(genericPair.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.MINIMAL);
    expect(genericPair.highValueSignals).toHaveLength(0);
  });

  it("recognizes meaningful categorical evidence without claiming identity", () => {
    const registry = source("SOURCE-HIGH", "OFFICIAL_RECORD");
    const assessment = assess(
      [
        ...matchedPair("NAME", "person.full_name", "Pessoa Sintetica", registry.id),
        ...matchedPair("DOB", "person.birth_date", "1992-12-15", registry.id),
        ...matchedPair("MOTHER", "person.mother_name", "Parente Sintetico", registry.id),
      ],
      [registry]
    );
    expect(assessment.conclusion).toBe(
      INVESTIGATIVE_CONCLUSIONS.COMPATIBLE_MEANINGFUL_EVIDENCE
    );
    expect(assessment.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.ADEQUATE);
    expect(assessment.highValueSignals.map((signal) => signal.attribute)).toEqual(
      expect.arrayContaining([
        ENTITY_RESOLUTION_ATTRIBUTES.BIRTH_DATE,
        ENTITY_RESOLUTION_ATTRIBUTES.MOTHER_NAME,
      ])
    );
    expect(assessment).not.toHaveProperty("samePerson");
    expect(assessment).not.toHaveProperty("identityConfirmed");
    expect(assessment).not.toHaveProperty("score");
    expect(assessment.explanations[0].message).toContain("does not confirm identity");
  });

  it("lets one confirmed exact DOB hard contradiction dominate many generic matches", () => {
    const registry = source("SOURCE-DOMINANCE", "OFFICIAL_RECORD");
    const genericFacts = Array.from({ length: 20 }, (_, index) =>
      matchedPair(`LOW-${index}`, "person.sex", "FEMALE", registry.id)
    ).flat();
    const assessment = assess(
      [
        ...genericFacts,
        fact({
          id: "FACT-DOB-CONFLICT-LEFT",
          person: leftPerson,
          attribute: "person.birth_date",
          value: "1992-12-15",
          sourceId: registry.id,
        }),
        fact({
          id: "FACT-DOB-CONFLICT-RIGHT",
          person: rightPerson,
          attribute: "person.birth_date",
          value: "1993-12-15",
          sourceId: registry.id,
        }),
      ],
      [registry]
    );
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INCOMPATIBLE);
    expect(assessment.hardContradictions).toHaveLength(1);
    expect(assessment.hardContradictions[0].strengthCategory).toBe(
      STRENGTH_CATEGORIES.VERY_STRONG
    );
  });

  it("keeps UNKNOWN attributes neutral", () => {
    const assessment = assess([], []);
    expect(assessment.signals.every((signal) => signal.outcome === COMPARISON_OUTCOMES.UNKNOWN)).toBe(true);
    expect(assessment.signals.every((signal) => signal.type === EVIDENCE_SIGNAL_TYPES.INSUFFICIENT_DATA)).toBe(true);
    expect(assessment.highValueSignals).toHaveLength(0);
    expect(assessment.hardContradictions).toHaveLength(0);
    expect(assessment.softContradictions).toHaveLength(0);
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INSUFFICIENT_DATA);
  });

  it("distinguishes same-source, independent, and shared-root corroboration", () => {
    const official = source("SOURCE-CORR-OFFICIAL", "OFFICIAL_RECORD");
    const hospital = source("SOURCE-CORR-HOSPITAL", "HEALTH_INSTITUTION");
    const systemA = source("SOURCE-CORR-SYSTEM-A", "SYSTEM_DERIVATION");
    const systemB = source("SOURCE-CORR-SYSTEM-B", "SYSTEM_DERIVATION");

    const same = assess(
      matchedPair("SAME-SOURCE", "person.birth_date", "1992-12-15", official.id),
      [official]
    );
    expect(same.highValueSignals[0].corroboration).toBe(
      CORROBORATION_CATEGORIES.SINGLE_SOURCE
    );

    const independent = assess(
      matchedPair(
        "INDEPENDENT",
        "person.birth_date",
        "1992-12-15",
        official.id,
        hospital.id
      ),
      [official, hospital]
    );
    expect(independent.highValueSignals[0].corroboration).toBe(
      CORROBORATION_CATEGORIES.INDEPENDENT_MULTI_SOURCE
    );

    const rootId = createFactId("FACT-SHARED-ROOT");
    const root = fact({
      id: rootId,
      person: leftPerson,
      attribute: "person.birth_date",
      value: "1992-12-15",
      sourceId: official.id,
    });
    const derived = [
      fact({
        id: "FACT-DERIVED-LEFT",
        person: leftPerson,
        attribute: "person.birth_date",
        value: "1992-12-15",
        sourceId: systemA.id,
        status: EPISTEMIC_STATUS.DERIVED,
        parentFactIds: [rootId],
      }),
      fact({
        id: "FACT-DERIVED-RIGHT",
        person: rightPerson,
        attribute: "person.birth_date",
        value: "1992-12-15",
        sourceId: systemB.id,
        status: EPISTEMIC_STATUS.DERIVED,
        parentFactIds: [rootId],
      }),
    ];
    const sharedRoot = assess([root, ...derived], [official, systemA, systemB]);
    expect(sharedRoot.highValueSignals[0].corroboration).toBe(
      CORROBORATION_CATEGORIES.MULTI_SOURCE
    );
    expect(sharedRoot.highValueSignals[0].notes).toContain(
      EVIDENCE_SIGNAL_NOTE_CODES.DERIVED_FROM_SHARED_PROVENANCE
    );
  });

  it("preserves source trust as context, not an outcome override", () => {
    const official = source("SOURCE-TRUST-OFFICIAL", "OFFICIAL_RECORD");
    const anonymous = source("SOURCE-TRUST-ANON", "ANONYMOUS_REPORT");
    const officialConflict = assess(
      [
        fact({ id: "FACT-OFFICIAL-L", person: leftPerson, attribute: "person.birth_date", value: "1992-01-01", sourceId: official.id }),
        fact({ id: "FACT-OFFICIAL-R", person: rightPerson, attribute: "person.birth_date", value: "1993-01-01", sourceId: official.id }),
      ],
      [official]
    );
    expect(officialConflict.hardContradictions[0].sourceTrust[0].category).toBe(
      SOURCE_TRUST_CATEGORIES.OFFICIAL
    );
    expect(officialConflict.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INCOMPATIBLE);

    const unverifiedMatch = assess(
      matchedPair(
        "ANON-MATCH",
        "person.birth_date",
        "1992-01-01",
        anonymous.id,
        anonymous.id,
        EPISTEMIC_STATUS.UNVERIFIED
      ),
      [anonymous]
    );
    expect(unverifiedMatch.highValueSignals[0].sourceTrust[0].category).toBe(
      SOURCE_TRUST_CATEGORIES.UNVERIFIED
    );
    expect(unverifiedMatch.highValueSignals[0].outcome).toBe(COMPARISON_OUTCOMES.MATCH);
  });

  it("uses quality rather than low-signal volume for data sufficiency", () => {
    const official = source("SOURCE-COVERAGE-A", "OFFICIAL_RECORD");
    const hospital = source("SOURCE-COVERAGE-B", "HEALTH_INSTITUTION");
    const lowOnly = assess(
      Array.from({ length: 10 }, (_, index) =>
        matchedPair(`COVERAGE-LOW-${index}`, "person.sex", "FEMALE", official.id)
      ).flat(),
      [official]
    );
    expect(lowOnly.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.INSUFFICIENT);

    const adequate = assess(
      [
        ...matchedPair("COVERAGE-NAME", "person.full_name", "Pessoa Sintetica", official.id),
        ...matchedPair("COVERAGE-DOB", "person.birth_date", "1992-12-15", official.id),
      ],
      [official]
    );
    expect(adequate.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.ADEQUATE);

    const strong = assess(
      [
        ...matchedPair("COVERAGE-DOB-2", "person.birth_date", "1992-12-15", official.id, hospital.id),
        ...matchedPair("COVERAGE-MOTHER", "person.mother_name", "Parente", official.id, hospital.id),
      ],
      [official, hospital]
    );
    expect(strong.dataSufficiency).toBe(DATA_SUFFICIENCY_LEVELS.STRONG_COVERAGE);
  });

  it("requires human review for an Entity Resolution internal conflict", () => {
    const official = source("SOURCE-INTERNAL", "OFFICIAL_RECORD");
    const assessment = assess(
      [
        fact({ id: "FACT-INTERNAL-L1", person: leftPerson, attribute: "person.birth_date", value: "1992-01-01", sourceId: official.id }),
        fact({ id: "FACT-INTERNAL-L2", person: leftPerson, attribute: "person.birth_date", value: "1993-01-01", sourceId: official.id }),
        fact({ id: "FACT-INTERNAL-R", person: rightPerson, attribute: "person.birth_date", value: "1992-01-01", sourceId: official.id }),
      ],
      [official]
    );
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.REQUIRES_HUMAN_REVIEW);
    expect(assessment.issues[0].code).toBe("INTERNAL_ATTRIBUTE_CONFLICT");
  });

  it.each([
    EPISTEMIC_STATUS.DERIVED,
    EPISTEMIC_STATUS.SYNTHETIC,
    EPISTEMIC_STATUS.UNVERIFIED,
  ] as const)("does not promote %s evidence", (status) => {
    const origin = source(`SOURCE-EPISTEMIC-${status}`, status === "SYNTHETIC" ? "SYNTHETIC_TEST" : "SYSTEM_DERIVATION");
    const parentId = createFactId(`FACT-EPISTEMIC-PARENT-${status}`);
    const provenanceSubject = new Person({ id: createPersonId(`PERSON-PARENT-${status}`) });
    const parent = fact({
      id: parentId,
      person: provenanceSubject,
      attribute: "person.birth_date",
      value: "1992-12-15",
      sourceId: origin.id,
    });
    const definitions = [leftPerson, rightPerson].map((person, index) =>
      fact({
        id: `FACT-EPISTEMIC-${status}-${index}`,
        person,
        attribute: "person.birth_date",
        value: "1992-12-15",
        sourceId: origin.id,
        status,
        parentFactIds: status === EPISTEMIC_STATUS.DERIVED ? [parentId] : undefined,
      })
    );
    const assessment = assess([parent, ...definitions], [origin]);
    expect(assessment.highValueSignals[0].epistemicStatus).toBe(status);
  });

  it("deduplicates a repeated Entity Resolution Fact pair", () => {
    const official = source("SOURCE-DEDUPE", "OFFICIAL_RECORD");
    const facts = matchedPair("DEDUPE", "person.birth_date", "1992-12-15", official.id);
    const entityResult = EntityResolutionEngine.compare(
      buildEntityResolutionCandidate(leftPerson, [facts[0]]),
      buildEntityResolutionCandidate(rightPerson, [facts[1]])
    );
    const baseline = EvidenceAssessmentEngine.assess({ caseId, entityResolutionResult: entityResult, facts, sources: [official] });
    const repeated = EvidenceAssessmentEngine.assess({
      caseId,
      entityResolutionResult: {
        ...entityResult,
        comparisons: [...entityResult.comparisons, ...entityResult.comparisons],
      },
      facts,
      sources: [official],
    });
    expect(repeated.signals).toHaveLength(baseline.signals.length);
  });

  it("keeps pair-linked temporal compatibility conservative", () => {
    const official = source("SOURCE-TEMPORAL", "OFFICIAL_RECORD");
    const hospital = source("SOURCE-TEMPORAL-EVIDENCE", "HEALTH_INSTITUTION");
    const evidenceId = createEvidenceId("EVIDENCE-TEMPORAL-METADATA");
    const facts = [
      fact({ id: "FACT-TEMPORAL-L", person: leftPerson, attribute: "person.observed_at", value: "2026-01-01", sourceId: official.id }),
      fact({ id: "FACT-TEMPORAL-R", person: rightPerson, attribute: "person.observed_at", value: "2026-01-02", sourceId: official.id }),
    ];
    const entityResolutionResult = EntityResolutionEngine.compare(
      buildEntityResolutionCandidate(leftPerson, facts),
      buildEntityResolutionCandidate(rightPerson, facts)
    );
    const events = [
      new TimelineEvent({ eventId: "EVENT-TEMPORAL-L", caseId, eventType: "FACT_OBSERVATION", label: "Synthetic left event", epistemicStatus: "CONFIRMED", sourceFactIds: [facts[0].id] }),
      new TimelineEvent({ eventId: "EVENT-TEMPORAL-R", caseId, eventType: "FACT_OBSERVATION", label: "Synthetic right event", epistemicStatus: "CONFIRMED", sourceFactIds: [facts[1].id], sourceEvidenceIds: [evidenceId] }),
    ];
    const temporalAnalysisResult = new TemporalAnalysisResult({
      caseId,
      status: "ANALYZED",
      events,
      relations: [new TemporalRelation({ leftEventId: events[0].eventId, rightEventId: events[1].eventId, relation: "BEFORE", explanation: "Synthetic relation" })],
      contradictions: [],
      gaps: [],
      derivations: [],
      unresolvedEvents: [],
    });
    const assessment = EvidenceAssessmentEngine.assess({
      caseId,
      entityResolutionResult,
      facts,
      sources: [official, hospital],
      evidenceMetadata: [
        { evidenceId, sourceId: hospital.id, epistemicStatus: "UNVERIFIED" },
      ],
      temporalAnalysisResult,
    });
    const temporal = assessment.signals.find(
      (signal) => signal.type === EVIDENCE_SIGNAL_TYPES.TEMPORAL_COMPATIBILITY
    );
    expect(temporal?.informationGain).toBe(INFORMATION_GAIN_CATEGORIES.LOW);
    expect(temporal?.strengthCategory).toBe(STRENGTH_CATEGORIES.LOW);
    expect(temporal?.notes).toContain(
      EVIDENCE_SIGNAL_NOTE_CODES.TEMPORAL_COMPATIBILITY_IS_NOT_IDENTITY_CONFIRMATION
    );
    expect(temporal?.evidenceIds).toEqual([evidenceId]);
    expect(temporal?.sourceIds).toContain(hospital.id);
    expect(temporal?.epistemicStatus).toBe("UNVERIFIED");
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INSUFFICIENT_DATA);
  });

  it("allows an applicable hard temporal contradiction to block compatibility", () => {
    const official = source("SOURCE-TEMPORAL-HARD", "OFFICIAL_RECORD");
    const facts = [
      fact({ id: "FACT-TEMPORAL-HARD-L", person: leftPerson, attribute: "person.observed_at", value: "2026-01-01", sourceId: official.id }),
      fact({ id: "FACT-TEMPORAL-HARD-R", person: rightPerson, attribute: "person.observed_at", value: "2026-01-02", sourceId: official.id }),
    ];
    const entityResolutionResult = EntityResolutionEngine.compare(
      buildEntityResolutionCandidate(leftPerson, facts),
      buildEntityResolutionCandidate(rightPerson, facts)
    );
    const events = [
      new TimelineEvent({ eventId: "EVENT-TEMPORAL-HARD-L", caseId, eventType: "FACT_OBSERVATION", label: "Synthetic left event", epistemicStatus: "CONFIRMED", sourceFactIds: [facts[0].id] }),
      new TimelineEvent({ eventId: "EVENT-TEMPORAL-HARD-R", caseId, eventType: "FACT_OBSERVATION", label: "Synthetic right event", epistemicStatus: "CONFIRMED", sourceFactIds: [facts[1].id] }),
    ];
    const temporalAnalysisResult = new TemporalAnalysisResult({
      caseId,
      status: "ANALYZED",
      events,
      relations: [],
      contradictions: [new TemporalContradiction({ leftEventId: events[0].eventId, rightEventId: events[1].eventId, severity: "HARD", reasonCode: "IMPOSSIBLE_SEQUENCE", explanation: "Synthetic contradiction", sourceFactIds: facts.map((item) => item.id) })],
      gaps: [],
      derivations: [],
      unresolvedEvents: [],
    });
    const assessment = EvidenceAssessmentEngine.assess({
      caseId,
      entityResolutionResult,
      facts,
      sources: [official],
      temporalAnalysisResult,
    });
    expect(assessment.conclusion).toBe(INVESTIGATIVE_CONCLUSIONS.INCOMPATIBLE);
    expect(assessment.hardContradictions).toContainEqual(
      expect.objectContaining({ type: EVIDENCE_SIGNAL_TYPES.TEMPORAL_CONTRADICTION })
    );
  });
});
