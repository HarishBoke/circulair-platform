#!/usr/bin/env python3
"""
Circul-AI-r Platform — Python Host-System Agent (Zero New Hardware)
====================================================================
Use this when the battery's host system (solar inverter, UPS controller,
SCADA, fleet management ECU) already has internet access and can run Python.
No additional hardware is required — the agent reads data from the host
system's existing local interface and forwards it to the platform.

Supported host system types (select via HOST_TYPE env var):
  - "sma_inverter"     : SMA Solar inverter (Modbus TCP / Speedwire)
  - "victron_venus"    : Victron Energy Venus OS (MQTT local broker)
  - "growatt_inverter" : Growatt inverter (Modbus TCP)
  - "rest_api"         : Generic REST API (explicit HTTPS endpoint)
  - "csv_file"         : Read from a CSV file exported by the host system
  - "modbus_tcp"       : Generic Modbus TCP (any device with TCP endpoint)

Install:
  pip install paho-mqtt pymodbus requests python-dotenv

Usage:
  HOST_TYPE=sma_inverter python3 circul_air_host_agent.py
"""

import csv
import ipaddress
import json
import logging
import math
import os
import re
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlsplit

import paho.mqtt.client as mqtt
import requests
from pymodbus.client import ModbusTcpClient

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
HOST_TYPE        = os.getenv("HOST_TYPE",       "")

# Platform MQTT credentials — from Device Provisioning page
MQTT_BROKER      = os.getenv("MQTT_BROKER",    "")
MQTT_PORT        = int(os.getenv("MQTT_PORT",  "8883"))
MQTT_USERNAME    = os.getenv("MQTT_USERNAME",  "")
MQTT_PASSWORD    = os.getenv("MQTT_PASSWORD",  "")
MQTT_TOPIC       = os.getenv("MQTT_TOPIC",     "")
DEVICE_BPAN      = os.getenv("DEVICE_BPAN",   "")
DEVICE_ID        = os.getenv("DEVICE_ID",     "")
PILOT_APPROVED   = os.getenv("PILOT_APPROVED", "false") == "true"
CHEMISTRY        = os.getenv("CHEMISTRY",      "LFP")
PUBLISH_INTERVAL = int(os.getenv("PUBLISH_INTERVAL", "60"))

# Host system connection (used depending on HOST_TYPE)
HOST_IP          = os.getenv("HOST_IP",        "192.168.1.100")
HOST_PORT        = int(os.getenv("HOST_PORT",  "502"))   # Modbus TCP default
# REST has no device/address fallback: explicitly configure a trusted HTTPS URL.
# HTTP is permitted only for localhost, 127.0.0.1, or [::1] local simulators.
HOST_API_URL     = os.getenv("HOST_API_URL",   "")
HOST_API_KEY     = os.getenv("HOST_API_KEY",   "")
CSV_FILE_PATH    = os.getenv("CSV_FILE_PATH",  "/data/battery_export.csv")

# ─── LOGGING ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("circul-air-agent")

# ─── OFFLINE BUFFER ───────────────────────────────────────────────────────────
BUFFER_FILE = "/tmp/circul_air_host_buffer.jsonl"
MAX_BUFFER  = 2880

def buffer_reading(payload: dict):
    try:
        with open(BUFFER_FILE, "a") as f:
            f.write(json.dumps(payload) + "\n")
        with open(BUFFER_FILE, "r") as f:
            lines = f.readlines()
        if len(lines) > MAX_BUFFER:
            with open(BUFFER_FILE, "w") as f:
                f.writelines(lines[-MAX_BUFFER:])
    except Exception as e:
        log.warning(f"Buffer write failed: {e}")

def replay_buffer(client: mqtt.Client) -> int:
    # Queue acknowledgement is not durable ingest. Replay awaits timestamp,
    # idempotency and revocation-aware device binding; preserve existing buffer.
    log.warning("Buffered replay disabled pending verified ingestion receipt")
    return 0

# ─── HOST SYSTEM READERS ──────────────────────────────────────────────────────

def read_modbus_tcp() -> Optional[dict]:
    """Generic Modbus TCP reader. Adjust register addresses for your device."""
    try:
        client = ModbusTcpClient(HOST_IP, port=HOST_PORT, timeout=5)
        if not client.connect():
            log.error(f"Cannot connect to Modbus TCP at {HOST_IP}:{HOST_PORT}")
            return None

        # Read 12 holding registers starting at address 0
        result = client.read_holding_registers(0, 12, slave=1)
        client.close()

        if result.isError():
            log.error(f"Modbus TCP read error: {result}")
            return None

        r = result.registers
        return _build_payload(
            v_pack    = r[0] * 0.01,
            i_pack    = _s16(r[1]) * 0.01,
            soc       = r[2] / 10.0,
            soh       = r[3] / 10.0,
            t_max     = _s16(r[4]) * 0.1,
            t_min     = _s16(r[5]) * 0.1,
            cycles    = r[7],
            v_cell_min= r[8] * 0.001,
            v_cell_max= r[9] * 0.001,
        )
    except Exception as e:
        log.error(f"Modbus TCP error: {e}")
        return None


def read_sma_inverter() -> Optional[dict]:
    """
    SMA Solar inverter via Modbus TCP (SunSpec protocol).
    SMA inverters expose battery data on Modbus TCP port 502.
    Register map follows SunSpec Model 802 (Lithium-Ion Battery Bank).
    """
    try:
        client = ModbusTcpClient(HOST_IP, port=HOST_PORT, timeout=5)
        if not client.connect():
            return None

        # SunSpec Model 802 base address (adjust if your inverter uses a different offset)
        BASE = 40000
        result = client.read_holding_registers(BASE, 30, slave=126)
        client.close()

        if result.isError():
            return None

        r = result.registers
        # SunSpec 802 register layout (simplified)
        v_pack = r[2] * 0.1       # Voltage (SF = -1)
        i_pack = _s16(r[3]) * 0.1 # Current (SF = -1)
        soc    = r[4] * 0.1       # SOC %
        soh    = r[5] * 0.1       # SOH %
        t_max  = _s16(r[6]) * 0.1 # Temperature

        return _build_payload(
            v_pack=v_pack, i_pack=i_pack,
            soc=soc, soh=soh,
            t_max=t_max, t_min=t_max,
        )
    except Exception as e:
        log.error(f"SMA inverter read error: {e}")
        return None


def read_victron_venus() -> Optional[dict]:
    """
    Victron Energy Venus OS — reads from the local MQTT broker on the Venus device.
    Venus OS publishes battery data at: N/<VRM_ID>/battery/<instance>/...
    """
    result_holder = {}
    done = False

    def on_message(client, userdata, msg):
        nonlocal done
        topic = msg.topic
        try:
            val = json.loads(msg.payload).get("value")
        except Exception:
            return
        if "/Soc" in topic:
            result_holder["soc"] = val
        elif "/Voltage" in topic and "/battery/" in topic:
            result_holder["v_pack"] = val
        elif "/Current" in topic and "/battery/" in topic:
            result_holder["i_pack"] = val
        elif "/Temp" in topic:
            result_holder["t_max"] = val
        elif "/Soh" in topic:
            result_holder["soh"] = val
        if len(result_holder) >= 4:
            done = True

    c = mqtt.Client()
    c.on_message = on_message
    c.connect(HOST_IP, 1883, 10)
    c.subscribe("N/+/battery/#")
    c.loop_start()
    timeout = time.time() + 10
    while not done and time.time() < timeout:
        time.sleep(0.1)
    c.loop_stop()
    c.disconnect()

    if not result_holder:
        return None

    return _build_payload(
        v_pack = result_holder.get("v_pack", 0),
        i_pack = result_holder.get("i_pack", 0),
        soc    = result_holder.get("soc", 0),
        soh    = result_holder.get("soh", 100),
        t_max  = result_holder.get("t_max", 25),
        t_min  = result_holder.get("t_max", 25),
    )


def _validated_rest_endpoint(endpoint: str) -> str:
    """Validate without DNS/network access; never include endpoint in errors."""
    if (not isinstance(endpoint, str) or not endpoint
            or re.search(r"[\s\x00-\x20\x7f\\]", endpoint)
            or "#" in endpoint
            or re.search(r"%(?![0-9A-Fa-f]{2})", endpoint)):
        raise ValueError("Invalid REST endpoint")

    parsed = urlsplit(endpoint)
    if (parsed.scheme not in {"https", "http"} or not parsed.netloc
            or "@" in parsed.netloc or not parsed.hostname):
        raise ValueError("Invalid REST endpoint")

    # Accessing port also rejects nonnumeric/out-of-range ports and bad IPv6.
    if parsed.netloc.endswith(":") or (parsed.port is not None and parsed.port == 0):
        raise ValueError("Invalid REST endpoint")
    hostname = parsed.hostname
    authority_host = f"[{hostname}]" if ":" in hostname else hostname
    if not re.fullmatch(re.escape(authority_host) + r"(?::[0-9]+)?",
                        parsed.netloc, flags=re.IGNORECASE):
        raise ValueError("Invalid REST endpoint")
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        # Reject ambiguous numeric IP spellings and malformed DNS authorities.
        dns_host = hostname[:-1] if hostname.endswith(".") else hostname
        labels = dns_host.split(".")
        if (len(hostname) > 253 or re.fullmatch(r"[0-9.]+", hostname)
                or any(not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?", label)
                       for label in labels)):
            raise ValueError("Invalid REST endpoint")

    if parsed.scheme == "http" and hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("REST endpoint requires HTTPS")
    return endpoint


def read_rest_api() -> Optional[dict]:
    """
    Generic REST API reader. Requires an explicit, trusted HTTPS endpoint.
    Exact loopback HTTP endpoints are allowed only for local simulators/tests.
    Adjust the field mapping to match your inverter's API response format.
    """
    try:
        endpoint = _validated_rest_endpoint(HOST_API_URL)
    except (TypeError, ValueError):
        log.error("REST API endpoint rejected; configure HTTPS or exact loopback HTTP")
        return None

    try:
        headers = {}
        if HOST_API_KEY:
            headers["Authorization"] = f"Bearer {HOST_API_KEY}"

        resp = requests.get(endpoint, headers=headers, timeout=10,
                            allow_redirects=False, verify=True)
        if 300 <= resp.status_code < 400:
            log.error("REST API redirect response rejected")
            return None
        resp.raise_for_status()
        data = resp.json()

        if not isinstance(data, dict):
            raise ValueError("Object required")
        def metric(primary, alias):
            value = data.get(primary, data.get(alias))
            if value is None:
                return None
            if isinstance(value, bool):
                raise ValueError("Numeric reading required")
            return float(value)
        return _build_payload(
            v_pack=metric("battery_voltage", "vPack"),
            i_pack=metric("battery_current", "iPack"),
            soc=metric("state_of_charge", "soc"),
            soh=metric("state_of_health", "soh"),
            t_max=metric("temperature_max", "tMax"),
            t_min=metric("temperature_min", "tMin"),
            cycles=metric("cycle_count", "cycles"),
            v_cell_min=metric("cell_voltage_min", "vCellMin"),
            v_cell_max=metric("cell_voltage_max", "vCellMax"),
        )
    except Exception:
        # Exceptions may contain URLs, credentials, or upstream response bodies.
        log.error("REST API read failed; transport, status, or payload rejected")
        return None


def read_csv_file() -> Optional[dict]:
    """
    Read the latest row from a CSV file exported by the host system.
    Expected columns: timestamp, voltage, current, soc, soh, temperature, cycles
    """
    try:
        with open(CSV_FILE_PATH, "r") as f:
            rows = list(csv.DictReader(f))
        if not rows:
            return None
        row = rows[-1]  # Latest row

        def metric(primary, alias):
            value = row.get(primary, row.get(alias))
            return None if value is None or value == "" else float(value)
        return _build_payload(
            v_pack=metric("voltage", "vPack"), i_pack=metric("current", "iPack"),
            soc=metric("soc", "SOC"), soh=metric("soh", "SOH"),
            t_max=metric("temperature", "tMax"),
            cycles=metric("cycles", "cycleCount"),
        )
    except Exception:
        log.error("CSV read rejected; verify identity, units, values and provenance")
        return None


# ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
def _build_payload(v_pack=None, i_pack=None, soc=None, soh=None, t_max=None, t_min=None,
                   cycles=None, v_cell_min=None, v_cell_max=None) -> dict:
    # Storage representability is not a chemistry-specific safety envelope.
    # SOH/SOC and inferred averages are unsupported until provenance storage exists.
    if not re.fullmatch(r"(?:[A-Z0-9]{19}|[A-Z0-9]{21})", DEVICE_BPAN) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", DEVICE_ID):
        raise ValueError("Verified identity required")
    if soc is not None or soh is not None:
        raise ValueError("Unsupported estimate/provenance fields")
    payload = {"bpan": DEVICE_BPAN, "deviceId": DEVICE_ID, "source": "measured",
               "recordedAt": datetime.now(timezone.utc).isoformat()}
    values = {"vPack": (v_pack, 0, 999999.99, 2),
              "iPack": (i_pack, -999999.99, 999999.99, 2),
              "tMax": (t_max, -273.15, 9999.99, 2),
              "vMin": (v_cell_min, 0, 9999.999, 3),
              "vMax": (v_cell_max, 0, 9999.999, 3),
              "cycleCount": (cycles, 0, 2147483647, 0)}
    for key, (value, minimum, maximum, digits) in values.items():
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not minimum <= value <= maximum:
            raise ValueError("Invalid measured metric")
        if key == "cycleCount" and value != int(value):
            raise ValueError("Integer cycles required")
        payload[key] = int(value) if key == "cycleCount" else round(value, digits)
    if t_min is not None and (not math.isfinite(t_min) or t_min < -273.15 or t_max is None or t_min > t_max):
        raise ValueError("Invalid temperature range")
    if v_cell_min is not None and v_cell_max is not None and v_cell_min > v_cell_max:
        raise ValueError("Invalid cell range")
    if len(payload) == 4:
        raise ValueError("Measured reading required")
    return payload

def _s16(v: int) -> int:
    return v if v < 32768 else v - 65536


# ─── READER DISPATCH ──────────────────────────────────────────────────────────
READERS = {
    "modbus_tcp":       read_modbus_tcp,
    "sma_inverter":     read_sma_inverter,
    "victron_venus":    read_victron_venus,
    "growatt_inverter": read_modbus_tcp,   # Growatt uses standard Modbus TCP
    "rest_api":         read_rest_api,
    "csv_file":         read_csv_file,
}


# ─── MQTT CLIENT ──────────────────────────────────────────────────────────────
mqtt_connected = False

def on_connect(client, userdata, flags, rc, properties=None):
    global mqtt_connected
    mqtt_connected = (rc == 0)
    log.info(f"MQTT {'connected' if mqtt_connected else f'failed rc={rc}'}")

def on_disconnect(client, userdata, rc, properties=None, reason=None):
    global mqtt_connected
    mqtt_connected = False
    log.warning("MQTT disconnected. Reconnecting...")

def build_mqtt_client() -> mqtt.Client:
    if not PILOT_APPROVED or not MQTT_BROKER or not MQTT_USERNAME or not MQTT_PASSWORD or not MQTT_TOPIC.endswith(f"/{DEVICE_BPAN}/{DEVICE_ID}"):
        raise ValueError("Approved provisioned TLS device configuration required")
    c = mqtt.Client(client_id=f"circul-air-host-{DEVICE_BPAN}", protocol=mqtt.MQTTv5)
    c.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    c.tls_set()
    c.on_connect    = on_connect
    c.on_disconnect = on_disconnect
    c.reconnect_delay_set(min_delay=5, max_delay=120)
    c.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
    c.loop_start()
    return c


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    log.error("Operational agent disabled pending verified profile, provisioning and durable ingestion receipt")
    return
    # Legacy register maps/local broker assumptions are not verified hardware profiles.
    if not PILOT_APPROVED or HOST_TYPE not in {"rest_api", "csv_file"}:
        log.error("Operational pilot disabled; require approved read-only profile and provisioning")
        return
    reader = READERS.get(HOST_TYPE)
    if not reader:
        log.error(f"Unknown HOST_TYPE '{HOST_TYPE}'. Choose from: {list(READERS.keys())}")
        sys.exit(1)

    log.info(f"=== Circul-AI-r Host Agent ===")
    log.info(f"  Host type : {HOST_TYPE}")
    log.info(f"  BPAN      : {DEVICE_BPAN}")
    log.info(f"  Interval  : {PUBLISH_INTERVAL}s")

    running = True
    def _stop(sig, frame):
        nonlocal running
        running = False
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)

    mqtt_client = build_mqtt_client()
    time.sleep(3)

    total = 0
    while running:
        t0 = time.monotonic()
        telemetry = reader()

        if telemetry:
            total += 1
            payload = json.dumps(telemetry)
            if mqtt_connected:
                replay_buffer(mqtt_client)
                result = mqtt_client.publish(MQTT_TOPIC, payload, qos=1)
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    log.info("Broker queue acknowledged; persistence is not confirmed")
                else:
                    buffer_reading(telemetry)
            else:
                buffer_reading(telemetry)
                log.warning("MQTT offline — reading buffered.")
        else:
            log.warning("Read failed — skipping this cycle.")

        elapsed = time.monotonic() - t0
        time.sleep(max(0, PUBLISH_INTERVAL - elapsed))

    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    log.info(f"Agent stopped. Total readings published: {total}")


if __name__ == "__main__":
    main()
