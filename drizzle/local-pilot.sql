-- REVIEW ONLY: additive local pilot schema. No existing asset/customer backfill.
-- Apply once in a separately approved migration transaction; do not use db:push.
BEGIN;
CREATE TABLE local_pilot_assets (
  id serial PRIMARY KEY,
  asset_ref uuid NOT NULL UNIQUE,
  owner_id integer NOT NULL REFERENCES users(id),
  namespace text NOT NULL DEFAULT 'LOCAL_PILOT',
  version text NOT NULL DEFAULT 'local-pilot-asset/1',
  manufacturer_serial text NOT NULL CHECK (length(manufacturer_serial) BETWEEN 1 AND 200),
  profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  official_bpan text,
  official_allocation_status text,
  official_verification text NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT local_pilot_asset_owner_uq UNIQUE(asset_ref, owner_id),
  CONSTRAINT local_pilot_local_only CHECK (namespace = 'LOCAL_PILOT' AND version = 'local-pilot-asset/1' AND official_bpan IS NULL AND official_allocation_status IS NULL AND official_verification = 'unverified')
);
CREATE TABLE local_pilot_provenance (
  id serial PRIMARY KEY,
  asset_ref uuid NOT NULL UNIQUE REFERENCES local_pilot_assets(asset_ref),
  source text NOT NULL CHECK (source = 'physical-label-and-owner-attestation'),
  observed_at timestamptz NOT NULL,
  evidence_reference text NOT NULL CHECK (length(evidence_reference) BETWEEN 1 AND 200),
  attested_by integer NOT NULL REFERENCES users(id),
  attested_at timestamptz NOT NULL,
  consent_evidence text NOT NULL CHECK (length(consent_evidence) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (asset_ref, attested_by) REFERENCES local_pilot_assets(asset_ref, owner_id)
);
CREATE TABLE local_pilot_devices (
  id serial PRIMARY KEY,
  device_ref uuid NOT NULL UNIQUE,
  asset_ref uuid NOT NULL REFERENCES local_pilot_assets(asset_ref),
  owner_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  capture_revision text NOT NULL CHECK (length(capture_revision) BETWEEN 1 AND 200),
  credential_hash text NOT NULL UNIQUE CHECK (credential_hash ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (asset_ref, owner_id) REFERENCES local_pilot_assets(asset_ref, owner_id),
  CONSTRAINT local_pilot_device_asset_uq UNIQUE(device_ref, asset_ref)
);
CREATE TABLE local_pilot_readings (
  id serial PRIMARY KEY,
  asset_ref uuid NOT NULL REFERENCES local_pilot_assets(asset_ref),
  device_ref uuid NOT NULL REFERENCES local_pilot_devices(device_ref),
  sample_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'BMS_REPORTED' CHECK (source = 'BMS_REPORTED'),
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND (payload->>'source' = 'BMS_REPORTED') IS TRUE),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT local_pilot_sample_uq UNIQUE(asset_ref, sample_id),
  FOREIGN KEY (device_ref, asset_ref) REFERENCES local_pilot_devices(device_ref, asset_ref)
);
CREATE INDEX local_pilot_assets_owner_idx ON local_pilot_assets(owner_id, id DESC);
CREATE INDEX local_pilot_devices_asset_idx ON local_pilot_devices(asset_ref);
CREATE INDEX local_pilot_readings_latest_idx ON local_pilot_readings(asset_ref, id DESC);
-- Functions and triggers affect ONLY these new pilot tables.
CREATE FUNCTION local_pilot_immutable_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'local_pilot_immutable_record';
END;
$$;
CREATE TRIGGER local_pilot_asset_immutable BEFORE UPDATE OR DELETE ON local_pilot_assets FOR EACH ROW EXECUTE FUNCTION local_pilot_immutable_row();
CREATE TRIGGER local_pilot_provenance_immutable BEFORE UPDATE OR DELETE ON local_pilot_provenance FOR EACH ROW EXECUTE FUNCTION local_pilot_immutable_row();
CREATE TRIGGER local_pilot_reading_immutable BEFORE UPDATE OR DELETE ON local_pilot_readings FOR EACH ROW EXECUTE FUNCTION local_pilot_immutable_row();
CREATE FUNCTION local_pilot_device_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'local_pilot_immutable_mapping'; END IF;
  IF (to_jsonb(NEW) - 'revoked_at' - 'last_seen_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at' - 'last_seen_at')
     OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
     OR (OLD.revoked_at IS NOT NULL AND NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at)
     OR (OLD.last_seen_at IS NOT NULL AND (NEW.last_seen_at IS NULL OR NEW.last_seen_at < OLD.last_seen_at)) THEN
    RAISE EXCEPTION 'local_pilot_immutable_mapping';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER local_pilot_device_immutable BEFORE UPDATE OR DELETE ON local_pilot_devices FOR EACH ROW EXECUTE FUNCTION local_pilot_device_guard();
COMMIT;
