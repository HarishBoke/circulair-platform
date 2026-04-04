#!/usr/bin/env python3
"""
Circul-AI-r Platform — Raspberry Pi Modbus RS-485 Gateway Agent
================================================================
Target hardware : Raspberry Pi 3B+ / 4 / Zero 2W
                  + USB-to-RS485 adapter (CH340 or FTDI)
                  OR RS485 HAT (Waveshare / ModMyPi)
Battery types   : Industrial UPS, BESS (Battery Energy Storage Systems),
                  Telecom tower batteries, Solar storage with Modbus BMS
Protocol        : Modbus RTU (RS-485) → MQTT over TLS
Publish rate    : Every 60 seconds (configurable)

Wiring:
  RS-485 adapter A+ ─── BMS RS-485 A+
  RS-485 adapter B- ─── BMS RS-485 B-
  GND               ─── BMS GND (optional but recommended)

Install dependencies:
  pip3 install pymodbus paho-mqtt python-dotenv

Usage:
  python3 circul_air_modbus_gateway.py

Run as a systemd service for production (see README.md).
"""

import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
from pymodbus.client import ModbusSerialClient
from pymodbus.exceptions import ModbusException

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
# Set these via environment variables or a .env file.
# Copy credential values from the Device Provisioning page on the platform.

SERIAL_PORT      = os.getenv("SERIAL_PORT",    "/dev/ttyUSB0")  # or /dev/ttyAMA0
BAUD_RATE        = int(os.getenv("BAUD_RATE",  "9600"))          # 9600 | 19200 | 38400
MODBUS_UNIT_ID   = int(os.getenv("MODBUS_UNIT","1"))             # BMS slave address

MQTT_BROKER      = os.getenv("MQTT_BROKER",    "sd1218f1.ala.asia-southeast1.emqxsl.com")
MQTT_PORT        = int(os.getenv("MQTT_PORT",  "8883"))
MQTT_USERNAME    = os.getenv("MQTT_USERNAME",  "YOUR_DEVICE_MQTT_USERNAME")
MQTT_PASSWORD    = os.getenv("MQTT_PASSWORD",  "YOUR_DEVICE_MQTT_PASSWORD")
MQTT_TOPIC       = os.getenv("MQTT_TOPIC",     "CAI_/YOUR_BPAN/telemetry")
DEVICE_BPAN      = os.getenv("DEVICE_BPAN",   "YOUR_BATTERY_BPAN")
CHEMISTRY        = os.getenv("CHEMISTRY",      "LFP")   # NMC | LFP | NCA | LEAD_ACID

PUBLISH_INTERVAL = int(os.getenv("PUBLISH_INTERVAL", "60"))  # seconds

# ─── MODBUS REGISTER MAP ──────────────────────────────────────────────────────
# These are example register addresses for a generic industrial BMS.
# Consult your BMS datasheet for the actual register map.
# Common BMS brands and their register maps are listed in README.md.

# Holding registers (function code 0x03)
REG_PACK_VOLTAGE   = 0x0000  # uint16, factor 0.01V
REG_PACK_CURRENT   = 0x0001  # int16,  factor 0.01A (positive=charge, negative=discharge)
REG_SOC            = 0x0002  # uint16, 0–1000 (divide by 10 for %)
REG_SOH            = 0x0003  # uint16, 0–1000 (divide by 10 for %)
REG_TEMP_1         = 0x0004  # int16,  factor 0.1°C
REG_TEMP_2         = 0x0005  # int16,  factor 0.1°C
REG_TEMP_3         = 0x0006  # int16,  factor 0.1°C
REG_CYCLE_COUNT    = 0x0007  # uint16
REG_CELL_MIN_V     = 0x0008  # uint16, factor 0.001V
REG_CELL_MAX_V     = 0x0009  # uint16, factor 0.001V
REG_ALARM_STATUS   = 0x000A  # uint16, bitmask (see README for bit definitions)
REG_CAPACITY_AH    = 0x000B  # uint16, factor 0.1Ah (remaining capacity)

# Number of registers to read in one request (more efficient than individual reads)
REG_START          = REG_PACK_VOLTAGE
REG_COUNT          = 12

# ─── LOGGING ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/var/log/circul_air_gateway.log", mode="a"),
    ],
)
log = logging.getLogger("circul-air-gateway")

# ─── OFFLINE BUFFER ───────────────────────────────────────────────────────────
# Readings are buffered locally when MQTT is unavailable and replayed on reconnect.
BUFFER_FILE = "/tmp/circul_air_offline_buffer.jsonl"
MAX_BUFFER_LINES = 2880  # 48 hours at 60s interval


def buffer_reading(payload: dict) -> None:
    """Append a reading to the offline buffer file."""
    try:
        with open(BUFFER_FILE, "a") as f:
            f.write(json.dumps(payload) + "\n")
        # Trim buffer if too large
        with open(BUFFER_FILE, "r") as f:
            lines = f.readlines()
        if len(lines) > MAX_BUFFER_LINES:
            with open(BUFFER_FILE, "w") as f:
                f.writelines(lines[-MAX_BUFFER_LINES:])
    except Exception as e:
        log.warning(f"Buffer write failed: {e}")


def replay_buffer(client: mqtt.Client) -> int:
    """Publish all buffered readings and clear the buffer. Returns count replayed."""
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
                break  # Stop if publish fails; will retry next cycle
        if replayed == len(lines):
            os.remove(BUFFER_FILE)
            log.info(f"Replayed {replayed} buffered readings.")
        else:
            # Keep undelivered lines
            with open(BUFFER_FILE, "w") as f:
                f.writelines(lines[replayed:])
    except Exception as e:
        log.warning(f"Buffer replay failed: {e}")
    return replayed


# ─── MODBUS READER ────────────────────────────────────────────────────────────
def read_bms(client: ModbusSerialClient) -> Optional[dict]:
    """Read all BMS registers in one Modbus RTU request and return a telemetry dict."""
    try:
        result = client.read_holding_registers(
            address=REG_START,
            count=REG_COUNT,
            slave=MODBUS_UNIT_ID,
        )
        if result.isError():
            log.error(f"Modbus read error: {result}")
            return None

        regs = result.registers

        # Decode registers
        v_pack    = regs[0] * 0.01          # V
        i_pack    = _signed16(regs[1]) * 0.01  # A
        soc       = regs[2] / 10.0          # %
        soh       = regs[3] / 10.0          # %
        t1        = _signed16(regs[4]) * 0.1   # °C
        t2        = _signed16(regs[5]) * 0.1
        t3        = _signed16(regs[6]) * 0.1
        cycles    = regs[7]
        v_cell_min= regs[8] * 0.001         # V
        v_cell_max= regs[9] * 0.001         # V
        alarms    = regs[10]                # bitmask
        cap_ah    = regs[11] * 0.1          # Ah remaining

        temps = [t for t in [t1, t2, t3] if t != 0]
        t_max = max(temps) if temps else 0.0
        t_min = min(temps) if temps else 0.0
        t_avg = sum(temps) / len(temps) if temps else 0.0

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
            "remainingCapAh": round(cap_ah, 1),
            "alarmBitmask":   alarms,
            "thermalAnomaly": t_max > 51.0,
            "chemistry":      CHEMISTRY,
        }

    except ModbusException as e:
        log.error(f"Modbus exception: {e}")
        return None
    except Exception as e:
        log.error(f"Unexpected error reading BMS: {e}")
        return None


def _signed16(value: int) -> int:
    """Convert unsigned 16-bit Modbus register to signed int."""
    return value if value < 32768 else value - 65536


# ─── MQTT CLIENT ──────────────────────────────────────────────────────────────
mqtt_connected = False


def on_connect(client, userdata, flags, rc, properties=None):
    global mqtt_connected
    if rc == 0:
        mqtt_connected = True
        log.info(f"MQTT connected to {MQTT_BROKER}:{MQTT_PORT}")
    else:
        mqtt_connected = False
        log.error(f"MQTT connection failed (rc={rc})")


def on_disconnect(client, userdata, rc, properties=None, reason=None):
    global mqtt_connected
    mqtt_connected = False
    log.warning(f"MQTT disconnected (rc={rc}). Will reconnect automatically.")


def build_mqtt_client() -> mqtt.Client:
    client = mqtt.Client(
        client_id=f"circul-air-{DEVICE_BPAN}",
        protocol=mqtt.MQTTv5,
    )
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.tls_set()  # Uses system CA bundle; set ca_certs= for custom CA
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.reconnect_delay_set(min_delay=5, max_delay=120)
    client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    return client


# ─── MAIN LOOP ────────────────────────────────────────────────────────────────
def main():
    log.info("=== Circul-AI-r Modbus Gateway starting ===")
    log.info(f"  Serial port  : {SERIAL_PORT} @ {BAUD_RATE} baud")
    log.info(f"  Modbus unit  : {MODBUS_UNIT_ID}")
    log.info(f"  MQTT broker  : {MQTT_BROKER}:{MQTT_PORT}")
    log.info(f"  BPAN         : {DEVICE_BPAN}")
    log.info(f"  Publish every: {PUBLISH_INTERVAL}s")

    # Graceful shutdown
    running = True
    def _shutdown(sig, frame):
        nonlocal running
        log.info("Shutdown signal received.")
        running = False
    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    # Initialise Modbus client
    modbus = ModbusSerialClient(
        port=SERIAL_PORT,
        baudrate=BAUD_RATE,
        bytesize=8,
        parity="N",
        stopbits=1,
        timeout=3,
    )
    if not modbus.connect():
        log.error(f"Cannot open serial port {SERIAL_PORT}. Exiting.")
        sys.exit(1)
    log.info(f"Modbus RTU connected on {SERIAL_PORT}")

    # Initialise MQTT client
    mqtt_client = build_mqtt_client()
    time.sleep(3)  # Allow MQTT to connect before first publish

    total_readings = 0
    total_errors   = 0

    while running:
        cycle_start = time.monotonic()

        # Read BMS
        telemetry = read_bms(modbus)

        if telemetry:
            total_readings += 1
            payload_str = json.dumps(telemetry)

            if mqtt_connected:
                # Replay any buffered readings first
                replay_buffer(mqtt_client)
                # Publish current reading
                result = mqtt_client.publish(MQTT_TOPIC, payload_str, qos=1)
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    log.info(f"[#{total_readings}] Published: vPack={telemetry['vPack']}V "
                             f"SOC={telemetry['soc']}% SOH={telemetry['sohEstimate']}% "
                             f"T_max={telemetry['tMax']}°C")
                else:
                    log.warning(f"Publish failed (rc={result.rc}). Buffering.")
                    buffer_reading(telemetry)
            else:
                log.warning("MQTT offline. Buffering reading.")
                buffer_reading(telemetry)

            if telemetry.get("thermalAnomaly"):
                log.warning(f"THERMAL ANOMALY: T_max={telemetry['tMax']}°C > 51°C")

            if telemetry.get("alarmBitmask", 0) != 0:
                log.warning(f"BMS ALARM active: bitmask=0x{telemetry['alarmBitmask']:04X}")
        else:
            total_errors += 1
            log.warning(f"BMS read failed (total errors: {total_errors})")

        # Sleep for remainder of interval
        elapsed = time.monotonic() - cycle_start
        sleep_time = max(0, PUBLISH_INTERVAL - elapsed)
        time.sleep(sleep_time)

    # Cleanup
    modbus.close()
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    log.info(f"Gateway stopped. Total readings: {total_readings}, errors: {total_errors}")


if __name__ == "__main__":
    main()
