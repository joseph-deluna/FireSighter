CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_request_limits_expires_at
  ON request_limits (expires_at);
