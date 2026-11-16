-- Additive standalone PostgreSQL migration; review and apply once to the intended database.
-- No legacy MySQL migration is executed by this file.
CREATE TABLE IF NOT EXISTS pagerduty_outbox (
  id serial PRIMARY KEY,
  "alertId" integer NOT NULL UNIQUE REFERENCES alerts(id),
  "dedupKey" varchar(255) NOT NULL UNIQUE,
  "routingFingerprint" varchar(24) NOT NULL,
  event json NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'accepted', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "nextAttemptAt" timestamptz NOT NULL DEFAULT NOW(),
  "leaseUntil" timestamptz,
  "leaseToken" varchar(36),
  "lastErrorCode" varchar(64),
  "acceptedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pagerduty_outbox_due_idx ON pagerduty_outbox(status, "nextAttemptAt");
