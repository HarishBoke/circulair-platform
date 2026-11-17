#!/usr/bin/env python3
"""Finite LOCAL_PILOT BMS capture validation/replay. No hardware reader or loop.
No credentials or payloads are printed. Dry-run is the default; never rewrites capture times.
"""
import argparse
import datetime as dt
import ipaddress
import json
import math
import os
from pathlib import Path
import re
import socket
import time
from urllib.parse import urlsplit
import uuid
import requests

MAX_BYTES = 8192
MAX_FILE_BYTES = 8 * 1024 * 1024
UNITS = {"vPack": "V", "iPack": "A", "tPack": "degC", "socReported": "%"}
BOUNDS = {"vPack": (0, 1000000), "iPack": (-1000000, 1000000), "tPack": (-273.15, 10000), "socReported": (0, 100)}
class PilotValidationError(Exception):
    pass

def strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise PilotValidationError("duplicate_json_key")
        result[key] = value
    return result

def load_json(text):
    try:
        depth, quoted, escaped = 0, False, False
        for char in text:
            if quoted:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    quoted = False
            elif char == '"':
                quoted = True
            elif char in "[{":
                depth += 1
                if depth > 16:
                    raise PilotValidationError("json_too_deep")
            elif char in "]}":
                depth -= 1
        return json.loads(text, object_pairs_hook=strict_object, parse_constant=lambda _: (_ for _ in ()).throw(PilotValidationError("nonfinite_json")))
    except (ValueError, TypeError, UnicodeError, RecursionError) as exc:
        raise PilotValidationError("invalid_json") from exc

def finite(value):
    return type(value) in (int, float) and math.isfinite(value)

def exact_keys(value, required, optional=()):
    if not isinstance(value, dict) or not set(required) <= set(value) or not set(value) <= set(required) | set(optional):
        raise PilotValidationError("invalid_fields")

def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})", value):
        raise PilotValidationError("invalid_timestamp")
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError as exc:
        raise PilotValidationError("invalid_timestamp") from exc

def uuid_value(value):
    try:
        if not isinstance(value, str) or str(uuid.UUID(value)) != value.lower():
            raise ValueError()
        return value
    except (ValueError, TypeError, AttributeError) as exc:
        raise PilotValidationError("invalid_uuid") from exc

def validate_profile(profile):
    exact_keys(profile, ("assetRef", "captureRevision", "units", "acceptedReadingEnvelope"))
    uuid_value(profile["assetRef"])
    revision = profile["captureRevision"]
    if not isinstance(revision, str) or not 1 <= len(revision) <= 200 or not revision.strip() or re.search(r"[\x00-\x1f\x7f]", revision):
        raise PilotValidationError("invalid_revision")
    if profile["units"] != UNITS:
        raise PilotValidationError("invalid_profile_units")
    envelope = profile["acceptedReadingEnvelope"]
    exact_keys(envelope, ("vPack",), ("iPack", "tPack", "socReported"))
    for key, limits in envelope.items():
        exact_keys(limits, ("min", "max"))
        low, high = BOUNDS[key]
        if not finite(limits["min"]) or not finite(limits["max"]) or not low <= limits["min"] <= limits["max"] <= high:
            raise PilotValidationError("invalid_envelope")
    return profile

def validate_sample(sample, profile, now=None, require_fresh=True):
    exact_keys(sample, ("sampleId", "recordedAt", "source", "captureRevision", "metrics", "units"))
    uuid_value(sample["sampleId"])
    if sample["source"] != "BMS_REPORTED":
        raise PilotValidationError("source_not_bms_reported")
    if sample["captureRevision"] != profile["captureRevision"]:
        raise PilotValidationError("capture_revision_mismatch")
    recorded = timestamp(sample["recordedAt"])
    now = time.time() if now is None else now
    if recorded > now + 30 or (require_fresh and recorded < now - 300):
        raise PilotValidationError("outside_fresh_window")
    exact_keys(sample["metrics"], (), UNITS)
    exact_keys(sample["units"], (), UNITS)
    if not sample["metrics"] or set(sample["metrics"]) != set(sample["units"]):
        raise PilotValidationError("metrics_units_mismatch")
    for key, value in sample["metrics"].items():
        limits = profile["acceptedReadingEnvelope"].get(key)
        if not finite(value) or not limits or not limits["min"] <= value <= limits["max"] or sample["units"][key] != UNITS[key]:
            raise PilotValidationError("outside_accepted_envelope")
    return sample

def validate_origin(origin, approved_origin):
    if not origin or origin != approved_origin:
        raise PilotValidationError("explicit_origin_approval_required")
    parsed = urlsplit(origin)
    try:
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment or parsed.port not in (None, 443):
            raise PilotValidationError("https_origin_only")
        hostname = parsed.hostname
        if hostname != hostname.lower() or origin != "https://" + hostname:
            raise PilotValidationError("canonical_https_origin_required")
        if hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal")):
            raise PilotValidationError("nonpublic_origin")
        try:
            if not ipaddress.ip_address(hostname).is_global:
                raise PilotValidationError("nonpublic_origin")
        except ValueError:
            if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?", hostname) or "." not in hostname:
                raise PilotValidationError("invalid_hostname")
    except ValueError as exc:
        raise PilotValidationError("invalid_origin") from exc
    return hostname

def check_public_dns(hostname):
    try:
        answers = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise PilotValidationError("dns_unavailable") from exc
    if not answers or any(not ipaddress.ip_address(answer[4][0]).is_global for answer in answers):
        raise PilotValidationError("nonpublic_dns")

def load_capture(path, profile, max_samples=20, deadline=None, require_fresh=True):
    if not 1 <= max_samples <= 1000:
        raise PilotValidationError("invalid_sample_bound")
    file = Path(path)
    if not file.is_file() or file.stat().st_size > MAX_FILE_BYTES:
        raise PilotValidationError("capture_file_invalid_or_large")
    samples, seen = [], {}
    with file.open("rb") as stream:
        for raw in stream:
            if deadline is not None and time.monotonic() >= deadline:
                raise PilotValidationError("duration_exceeded")
            if not raw.strip():
                raise PilotValidationError("blank_capture_line")
            if len(raw) > MAX_BYTES:
                raise PilotValidationError("sample_too_large")
            if len(samples) >= max_samples:
                raise PilotValidationError("max_samples_exceeded")
            try:
                sample = validate_sample(load_json(raw.decode("utf-8")), profile, require_fresh=require_fresh)
            except UnicodeError as exc:
                raise PilotValidationError("invalid_utf8") from exc
            canonical = json.dumps(sample, sort_keys=True, separators=(",", ":"), allow_nan=False)
            if sample["sampleId"] in seen and seen[sample["sampleId"]] != canonical:
                raise PilotValidationError("sample_payload_conflict")
            seen[sample["sampleId"]] = canonical
            samples.append(sample)
    if not samples:
        raise PilotValidationError("empty_capture")
    return samples

def send_samples(samples, profile, origin, approved_origin, token, deadline, session_factory=requests.Session):
    hostname = validate_origin(origin, approved_origin)
    if not isinstance(token, str) or not re.fullmatch(r"lp1_[A-Za-z0-9_-]{43}", token):
        raise PilotValidationError("device_token_required")
    url = origin + "/api/v1/pilot/assets/" + profile["assetRef"] + "/readings"
    receipts = []
    with session_factory() as session:
        session.trust_env = False  # No implicit proxy, netrc or environment CA/TLS overrides.
        for sample in samples:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PilotValidationError("duration_exceeded")
            validate_sample(sample, profile)  # Never refresh timestamp to disguise stale capture.
            check_public_dns(hostname)  # No private/link-local/loopback resolved target.
            response = None
            try:
                response = session.post(url, json=sample, headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, timeout=(min(3, remaining), min(3, remaining)), verify=True, allow_redirects=False, stream=True)
                if response.status_code not in (200, 201):
                    raise PilotValidationError("ingest_not_accepted")
                body = bytearray()
                for chunk in response.iter_content(1024):
                    if time.monotonic() >= deadline:
                        raise PilotValidationError("duration_exceeded")
                    body.extend(chunk)
                    if len(body) > MAX_BYTES:
                        raise PilotValidationError("receipt_too_large")
                receipt = load_json(bytes(body).decode("utf-8"))
                exact_keys(receipt, ("readingId", "assetRef", "sampleId", "duplicate"))
                if type(receipt["readingId"]) is not int or not 1 <= receipt["readingId"] <= 2147483647 or receipt["assetRef"] != profile["assetRef"] or receipt["sampleId"] != sample["sampleId"] or type(receipt["duplicate"]) is not bool:
                    raise PilotValidationError("receipt_invalid")
                receipts.append(receipt)
            except requests.RequestException as exc:
                raise PilotValidationError("transport_failed") from exc
            finally:
                if response is not None:
                    response.close()
    return receipts

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", required=True, help="Finite JSONL capture, never a hardware endpoint")
    parser.add_argument("--profile", required=True, help="Approved local JSON validation profile")
    parser.add_argument("--max-samples", type=int, default=20)
    parser.add_argument("--max-seconds", type=int, default=30)
    parser.add_argument("--origin", help="Explicit canonical approved HTTPS origin, required only for send")
    parser.add_argument("--approved-origin", help="Repeat the independently approved exact origin")
    parser.add_argument("--send", action="store_true", help="Explicitly send; default is offline dry-run")
    parser.add_argument("--allow-stale-dry-run", action="store_true", help="Validate archived captures offline only; never changes timestamps")
    args = parser.parse_args(argv)
    try:
        if not 1 <= args.max_seconds <= 300 or args.send and args.allow_stale_dry_run:
            raise PilotValidationError("invalid_duration_or_stale_send")
        deadline = time.monotonic() + args.max_seconds
        profile_path = Path(args.profile)
        if not profile_path.is_file() or profile_path.stat().st_size > MAX_BYTES:
            raise PilotValidationError("invalid_profile_file")
        profile = validate_profile(load_json(profile_path.read_text(encoding="utf-8")))
        samples = load_capture(args.capture, profile, args.max_samples, deadline, require_fresh=not args.allow_stale_dry_run)
        if args.send:
            receipts = send_samples(samples, profile, args.origin, args.approved_origin, os.environ.get("LOCAL_PILOT_DEVICE_TOKEN"), deadline)
            print(json.dumps({"mode": "explicit_send", "persisted_receipts": len(receipts), "physical_acceptance": "not_established"}))
        else:
            print(json.dumps({"mode": "offline_dry_run", "validated_samples": len(samples), "network_requests": 0, "physical_acceptance": "not_established", "freshness_required": not args.allow_stale_dry_run}))
        return 0
    except (PilotValidationError, OSError, UnicodeError) as exc:
        # No URLs, tokens, responses, paths or payload values in errors.
        code = str(exc) if isinstance(exc, PilotValidationError) else "local_file_unavailable"
        print(json.dumps({"error": code}))
        return 1
if __name__ == "__main__":
    raise SystemExit(main())
