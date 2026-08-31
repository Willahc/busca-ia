-- 001-initial-schema.sql: Initial relational schema for missing-person intelligence platform

CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  external_reference TEXT,
  is_synthetic INTEGER NOT NULL CHECK(is_synthetic IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persons (
  person_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS missing_events (
  missing_event_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(person_id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  case_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(person_id),
  missing_event_id TEXT NOT NULL REFERENCES missing_events(missing_event_id),
  workflow_status TEXT NOT NULL,
  official_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
  fact_id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  attribute TEXT NOT NULL,
  value_json TEXT NOT NULL,
  epistemic_status TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  observed_at TEXT,
  recorded_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  confidence REAL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS fact_parents (
  fact_id TEXT NOT NULL REFERENCES facts(fact_id) ON DELETE CASCADE,
  parent_fact_id TEXT NOT NULL,
  PRIMARY KEY (fact_id, parent_fact_id)
);

CREATE TABLE IF NOT EXISTS tips (
  tip_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(case_id),
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  original_text TEXT NOT NULL,
  received_at TEXT NOT NULL,
  epistemic_status TEXT NOT NULL,
  observed_at TEXT,
  recorded_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(case_id),
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  description TEXT NOT NULL,
  epistemic_status TEXT NOT NULL,
  observed_at TEXT,
  recorded_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypotheses (
  hypothesis_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(case_id),
  statement TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_supporting_evidence (
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  PRIMARY KEY (hypothesis_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS hypothesis_contradicting_evidence (
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(hypothesis_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  PRIMARY KEY (hypothesis_id, evidence_id)
);