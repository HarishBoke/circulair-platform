-- REVIEW ONLY. Apply solely after a separate migration approval; never replay legacy rows.
-- CREATE-only additive migration. Application generates random UUIDs; no extension required.
CREATE TABLE IF NOT EXISTS oss_incident_destinations (
  fingerprint varchar(64) PRIMARY KEY CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  approved_by_user_id integer NOT NULL REFERENCES users(id),
  approval_ref uuid NOT NULL,
  activation_at timestamptz NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS oss_incidents (
  id uuid PRIMARY KEY,
  alert_id integer NOT NULL UNIQUE REFERENCES alerts(id),
  tenant_user_id integer NOT NULL REFERENCES users(id),
  destination_fingerprint varchar(64) NOT NULL REFERENCES oss_incident_destinations(fingerprint),
  category text NOT NULL CHECK (category IN ('availability','telemetry','security','operational')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','resolved')),
  started_at timestamptz NOT NULL,
  resolved_at timestamptz,
  action_version integer NOT NULL DEFAULT 1 CHECK (action_version > 0),
  next_refresh_at timestamptz NOT NULL DEFAULT NOW(),
  resolve_pending boolean NOT NULL DEFAULT false,
  quarantined boolean NOT NULL DEFAULT false,
  ambiguous_until timestamptz,
  repair_until timestamptz,
  resolved_by_user_id integer REFERENCES users(id),
  resolution_reason text CHECK (resolution_reason IN ('verified_recovery','false_positive_verified','operator_mitigation_verified')),
  recovery_evidence_ref uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK ((state = 'open' AND resolved_at IS NULL AND resolved_by_user_id IS NULL AND resolution_reason IS NULL AND recovery_evidence_ref IS NULL AND NOT resolve_pending)
    OR (state = 'resolved' AND resolved_at IS NOT NULL AND resolved_at >= started_at AND resolved_by_user_id IS NOT NULL AND resolution_reason IS NOT NULL AND recovery_evidence_ref IS NOT NULL)),
  CHECK (repair_until IS NULL OR ambiguous_until IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS oss_incident_deliveries (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES oss_incidents(id),
  action text NOT NULL CHECK (action IN ('trigger','resolve')),
  version integer NOT NULL CHECK (version > 0),
  kind text NOT NULL CHECK (kind IN ('initial','refresh','resolution','repair')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','accepted','dead','quarantined','superseded')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
  lease_until timestamptz,
  lease_token uuid,
  lease_generation integer NOT NULL DEFAULT 0 CHECK (lease_generation >= 0),
  ambiguous boolean NOT NULL DEFAULT false,
  last_error_code varchar(64),
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, version),
  CHECK ((state = 'sending' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR (state <> 'sending' AND lease_token IS NULL AND lease_until IS NULL)),
  CHECK ((action = 'trigger' AND kind IN ('initial','refresh')) OR (action = 'resolve' AND kind IN ('resolution','repair')))
);
CREATE TABLE IF NOT EXISTS oss_incident_commands (
  id uuid PRIMARY KEY,
  incident_id uuid REFERENCES oss_incidents(id),
  actor_user_id integer NOT NULL REFERENCES users(id),
  command text NOT NULL CHECK (command IN ('resolve','destination_approval','dead_letter_retry','quarantine_release')),
  evidence_ref uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS oss_incident_delivery_due_idx ON oss_incident_deliveries(state, next_attempt_at, lease_until);
CREATE INDEX IF NOT EXISTS oss_incident_refresh_idx ON oss_incidents(quarantined, next_refresh_at);
CREATE INDEX IF NOT EXISTS oss_incident_destination_idx ON oss_incidents(destination_fingerprint);
CREATE INDEX IF NOT EXISTS oss_incident_command_idx ON oss_incident_commands(incident_id, created_at);
