CREATE TABLE IF NOT EXISTS audit_events (
  audit_event_id TEXT PRIMARY KEY,
  actor_id TEXT,
  request_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  occurred_at TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit_events (request_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_events (occurred_at);