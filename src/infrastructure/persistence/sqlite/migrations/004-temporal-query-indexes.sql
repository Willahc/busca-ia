-- 004-temporal-query-indexes.sql: Query indexes for timeline and case lookup

CREATE INDEX IF NOT EXISTS idx_facts_subject_id ON facts (subject_id);
CREATE INDEX IF NOT EXISTS idx_tips_case_id ON tips (case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence (case_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_case_id ON hypotheses (case_id);