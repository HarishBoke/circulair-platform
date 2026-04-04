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
  - "rest_api"         : Generic REST API (any inverter with HTTP endpoint)
  - "csv_file"         : Read from a CSV file exported by the host system
  - "modbus_tcp"       : Generic Modbus TCP (any device with TCP endpoint)

Install:
  pip install paho-mqtt pymodbus requests python-dotenv

Usage:
  HOST_TYPE=sma_inverter python3 circul_air_host_agent.py
"""

import csv
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
import requests
from pymodbus.client import ModbusTcpClient

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
HOST_TYPE        = os.getenv("HOST_TYPE",       "modbus_tcp")

# Platform MQTT credentials — from Device Provisioning page
MQTT_BROKER      = os.getenv("MQTT_BROKER",    "sd1218f1.ala.asia-southeast1.emqxsl.com")
MQTT_PORT        = int(os.getenv("MQTT_PORT",  "8883"))
MQTT_USERNAME    = os.getenv("MQTT_USERNAME",  "YOUR_DEVICE_MQTT_USERNAME")
MQTT_PASSWORD    = os.getenv("MQTT_PASSWORD",  "YOUR_DEVICE_MQTT_PASSWORD")
MQTT_TOPIC       = os.getenv("MQTT_TOPIC",     "CAI_/YOUR_BPAN/telemetry")
DEVICE_BPAN      = os.getenv("DEVICE_BPAN",   "YOUR_BATTERY_BPAN")
CHEMISTRY        = os.getenv("CHEMISTRY",      "LFP")
PUBLISH_INTERVAL = int(os.getenv("PUBLISH_INTERVAL", "60"))

# Host system connection (used depending on HOST_TYPE)
HOST_IP          = os.getenv("HOST_IP",        "192.168.1.100")
HOST_PORT        = int(os.getenv("HOST_PORT",  "502"))   # Modbus TCP default
HOST_API_URL     = os.getenv("HOST_API_URL",   "http://192.168.1.100/api/battery")
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
    if not os.path.exists(BUFFER_FILE):
        return 0
    replayed = 0
    try:
        with open(BUFFER_FILE, "r") as f:
            lines = f.readlines()
        for line in lines:
            line = line.strip()
            if not line:
                continue
            result = client.publish(MQTT_TOPIC, line, qos=1)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                replayed += 1
            else:
                break
        if replayed == len(lines):
            os.remove(BUFFER_FILE)
        else:
            with open(BUFFER_FILE, "w") as f:
                f.writelines(lines[replayed:])
    except Exception as e:
        log.warning(f"Buffer replay failed: {e}")
    return replayed

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


def read_rest_api() -> Optional[dict]:
    """
    Generic REST API reader. Reads battery data from an HTTP endpoint.
    Adjust the field mapping to match your inverter's API response format.
    """
    try:
        headers = {}
        if HOST_API_KEY:
            headers["Authorization"] = f"Bearer {HOST_API_KEY}"

        resp = requests.get(HOST_API_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # Adjust these field names to match your API's response structure
        return _build_payload(
            v_pack    = float(data.get("battery_voltage",  data.get("vPack",  0))),
            i_pack    = float(data.get("battery_current",  data.get("iPack",  0))),
            soc       = float(data.get("state_of_charge",  data.get("soc",    0))),
            soh       = float(data.get("state_of_health",  data.get("soh",  100))),
            t_max     = float(data.get("temperature_max",  data.get("tMax",  25))),
            t_min     = float(data.get("temperature_min",  data.get("tMin",  25))),
            cycles    = int(data.get("cycle_count",        data.get("cycles",  0))),
            v_cell_min= float(data.get("cell_voltage_min", data.get("vCellMin", 0))),
            v_cell_max= float(data.get("cell_voltage_max", data.get("vCellMax", 0))),
        )
    except Exception as e:
        log.error(f"REST API read error: {e}")
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

        return _build_payload(
            v_pack = float(row.get("voltage",     row.get("vPack",  0))),
            i_pack = float(row.get("current",     row.get("iPack",  0))),
            soc    = float(row.get("soc",         row.get("SOC",    0))),
            soh    = float(row.get("soh",         row.get("SOH",  100))),
            t_max  = float(row.get("temperature", row.get("tMax",  25))),
            t_min  = float(row.get("temperature", row.get("tMin",  25))),
            cycles = int(float(row.get("cycles",  row.get("cycleCount", 0)))),
        )
    except Exception as e:
        log.error(f"CSV file read error: {e}")
        return None


# ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
def _build_payload(v_pack=0, i_pack=0, soc=0, soh=100, t_max=25, t_min=25,
                   cycles=0, v_cell_min=0, v_cell_max=0) -> dict:
    t_avg = (t_max + t_min) / 2.0
    return {
        "bpan":           DEVICE_BPAN,
        "ts":             int(datetime.now(timezone.utc).timestamp() * 1000),
        "vPack":          round(v_pack, 2),
        "iPack":          round(i_pack, 2),
        "soc":            round(soc, 1),
        "sohEstimate":    round(soh, 1),
        "tMax":           round(t_max, 1),
        "tMin":           round(t_min, 1),
        "tAvg":           round(t_avg, 1),
        "vCellMin":       round(v_cell_min, 3),
        "vCellMax":       round(v_cell_max, 3),
        "cycleCount":     cycles,
        "thermalAnomaly": t_max > 51.0,
        "chemistry":      CHEMISTRY,
    }

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
                    log.info(f"[#{total}] Published: SOC={telemetry['soc']}% "
                             f"SOH={telemetry['sohEstimate']}% T={telemetry['tMax']}°C")
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
