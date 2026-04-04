#!/usr/bin/env python3
"""
Circul-AI-r Platform — Lead-Acid / No-BMS Inference Agent
==========================================================
For batteries with no BMS (VRLA, flooded lead-acid, legacy NiCd) where
the only measurable signals are terminal voltage and ambient temperature.

Hardware required:
  - Raspberry Pi Zero 2W (or any Linux SBC)
  - ADS1115 16-bit ADC (I²C) — for voltage measurement via resistor divider
  - DS18B20 temperature sensor (1-Wire) — for ambient temperature
  - Shunt resistor (50A/75mV or 100A/50mV) — for current measurement (optional)

OR (simpler):
  - ESP32 with built-in ADC + DS18B20
  - Use the Arduino sketch variant in esp32-lead-acid/ subdirectory

SOH estimation method:
  - Resting voltage (no load, 2h after charge) → SOC lookup table
  - Capacity fade model: SOH = 100% - (cycles × 0.05%) - (age_months × 0.3%)
  - Confidence: LOW (±10–15%) — clearly reported to the platform

Install:
  pip install paho-mqtt adafruit-circuitpython-ads1x15 python-dotenv
"""

import json
import logging
import math
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
MQTT_BROKER      = os.getenv("MQTT_BROKER",    "sd1218f1.ala.asia-southeast1.emqxsl.com")
MQTT_PORT        = int(os.getenv("MQTT_PORT",  "8883"))
MQTT_USERNAME    = os.getenv("MQTT_USERNAME",  "YOUR_DEVICE_MQTT_USERNAME")
MQTT_PASSWORD    = os.getenv("MQTT_PASSWORD",  "YOUR_DEVICE_MQTT_PASSWORD")
MQTT_TOPIC       = os.getenv("MQTT_TOPIC",     "CAI_/YOUR_BPAN/telemetry")
DEVICE_BPAN      = os.getenv("DEVICE_BPAN",   "YOUR_BATTERY_BPAN")

CELL_COUNT       = int(os.getenv("CELL_COUNT", "6"))      # 12V = 6 cells, 48V = 24 cells
NOMINAL_V        = float(os.getenv("NOMINAL_V", "12.0"))  # V
CAPACITY_AH      = float(os.getenv("CAPACITY_AH", "100.0"))
INSTALL_DATE     = os.getenv("INSTALL_DATE", "2022-01-01")  # YYYY-MM-DD
PUBLISH_INTERVAL = int(os.getenv("PUBLISH_INTERVAL", "300"))  # 5 minutes for lead-acid

# Voltage divider ratio (if using ADS1115 + resistor divider)
# V_battery = V_adc × VOLTAGE_DIVIDER_RATIO
# Example: 12V battery, 10kΩ / 2.2kΩ divider → ratio ≈ 5.55
VOLTAGE_DIVIDER_RATIO = float(os.getenv("VOLTAGE_DIVIDER_RATIO", "5.55"))

# ─── SOC LOOKUP TABLE (Lead-Acid, resting voltage per cell) ───────────────────
# Source: IEEE 485 / Battery Council International
# Key: V per cell (resting, no load, 25°C), Value: SOC %
LEAD_ACID_SOC_TABLE = [
    (2.10, 100), (2.08, 95), (2.06, 90), (2.04, 85),
    (2.02, 80),  (2.00, 75), (1.98, 70), (1.96, 65),
    (1.94, 60),  (1.92, 55), (1.90, 50), (1.88, 45),
    (1.86, 40),  (1.84, 35), (1.82, 30), (1.80, 25),
    (1.78, 20),  (1.75, 15), (1.70, 10), (1.65, 5),
    (1.60, 0),
]

def voltage_to_soc(v_pack: float) -> float:
    """Estimate SOC from resting pack voltage using lookup table interpolation."""
    v_per_cell = v_pack / CELL_COUNT
    # Clamp to table range
    if v_per_cell >= LEAD_ACID_SOC_TABLE[0][0]:
        return 100.0
    if v_per_cell <= LEAD_ACID_SOC_TABLE[-1][0]:
        return 0.0
    # Linear interpolation between table entries
    for i in range(len(LEAD_ACID_SOC_TABLE) - 1):
        v_hi, soc_hi = LEAD_ACID_SOC_TABLE[i]
        v_lo, soc_lo = LEAD_ACID_SOC_TABLE[i + 1]
        if v_lo <= v_per_cell <= v_hi:
            ratio = (v_per_cell - v_lo) / (v_hi - v_lo)
            return round(soc_lo + ratio * (soc_hi - soc_lo), 1)
    return 50.0


def estimate_soh(install_date_str: str) -> float:
    """
    Estimate SOH from battery age.
    Lead-acid degrades ~0.3% per month under normal conditions.
    This is a conservative estimate — actual SOH depends on usage intensity.
    """
    try:
        install = datetime.strptime(install_date_str, "%Y-%m-%d")
        now = datetime.now()
        age_months = (now.year - install.year) * 12 + (now.month - install.month)
        soh = max(20.0, 100.0 - (age_months * 0.3))
        return round(soh, 1)
    except Exception:
        return 80.0  # Default if date parsing fails


# ─── HARDWARE READERS ─────────────────────────────────────────────────────────
def read_voltage_ads1115() -> Optional[float]:
    """Read battery voltage via ADS1115 ADC on I²C bus."""
    try:
        import board
        import busio
        import adafruit_ads1x15.ads1115 as ADS
        from adafruit_ads1x15.analog_in import AnalogIn

        i2c = busio.I2C(board.SCL, board.SDA)
        ads = ADS.ADS1115(i2c)
        chan = AnalogIn(ads, ADS.P0)  # Channel A0
        v_adc = chan.voltage
        v_battery = v_adc * VOLTAGE_DIVIDER_RATIO
        return round(v_battery, 3)
    except ImportError:
        # Fallback: read from /sys/bus/iio (if using onboard ADC)
        return read_voltage_sysfs()
    except Exception as e:
        logging.error(f"ADS1115 read error: {e}")
        return None


def read_voltage_sysfs() -> Optional[float]:
    """Read voltage from Linux IIO subsystem (e.g., onboard ADC on some SBCs)."""
    try:
        with open("/sys/bus/iio/devices/iio:device0/in_voltage0_raw") as f:
            raw = int(f.read().strip())
        with open("/sys/bus/iio/devices/iio:device0/in_voltage0_scale") as f:
            scale = float(f.read().strip())
        v_adc = raw * scale / 1000.0  # mV → V
        return round(v_adc * VOLTAGE_DIVIDER_RATIO, 3)
    except Exception:
        return None


def read_temperature_ds18b20() -> Optional[float]:
    """Read temperature from DS18B20 1-Wire sensor."""
    try:
        import glob
        base = "/sys/bus/w1/devices/"
        device_folder = glob.glob(base + "28-*")
        if not device_folder:
            return None
        with open(device_folder[0] + "/w1_slave") as f:
            lines = f.readlines()
        if "YES" not in lines[0]:
            return None
        temp_str = lines[1].split("t=")[1]
        return round(int(temp_str) / 1000.0, 1)
    except Exception:
        return None


# ─── MAIN READING ─────────────────────────────────────────────────────────────
def read_battery() -> Optional[dict]:
    v_pack = read_voltage_ads1115()
    if v_pack is None:
        logging.warning("Voltage read failed — skipping cycle.")
        return None

    temperature = read_temperature_ds18b20() or 25.0
    soc = voltage_to_soc(v_pack)
    soh = estimate_soh(INSTALL_DATE)

    return {
        "bpan":           DEVICE_BPAN,
        "ts":             int(datetime.now(timezone.utc).timestamp() * 1000),
        "vPack":          v_pack,
        "iPack":          0.0,    # No current sensor — set to 0
        "soc":            soc,
        "sohEstimate":    soh,
        "tMax":           temperature,
        "tMin":           temperature,
        "tAvg":           temperature,
        "vCellMin":       round(v_pack / CELL_COUNT, 3),
        "vCellMax":       round(v_pack / CELL_COUNT, 3),
        "cycleCount":     0,      # Not tracked without BMS
        "thermalAnomaly": temperature > 45.0,  # Lower threshold for lead-acid
        "chemistry":      "LEAD_ACID",
        "inferenceMode":  True,   # Signals to platform that SOH is inferred, not measured
        "confidence":     "LOW",  # Platform uses this to widen the SOH confidence interval
    }


# ─── MQTT ─────────────────────────────────────────────────────────────────────
mqtt_connected = False

def on_connect(c, u, f, rc, p=None):
    global mqtt_connected
    mqtt_connected = (rc == 0)
    logging.info(f"MQTT {'connected' if mqtt_connected else f'failed rc={rc}'}")

def on_disconnect(c, u, rc, p=None, r=None):
    global mqtt_connected
    mqtt_connected = False

def main():
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    log = logging.getLogger()

    log.info("=== Circul-AI-r Lead-Acid Inference Agent ===")
    log.info(f"  BPAN: {DEVICE_BPAN}  Cells: {CELL_COUNT}  Nominal: {NOMINAL_V}V")

    running = True
    def _stop(s, f): nonlocal running; running = False
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)

    c = mqtt.Client(client_id=f"circul-air-la-{DEVICE_BPAN}", protocol=mqtt.MQTTv5)
    c.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    c.tls_set()
    c.on_connect    = on_connect
    c.on_disconnect = on_disconnect
    c.reconnect_delay_set(5, 120)
    c.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
    c.loop_start()
    time.sleep(3)

    total = 0
    while running:
        t0 = time.monotonic()
        data = read_battery()
        if data and mqtt_connected:
            total += 1
            payload = json.dumps(data)
            c.publish(MQTT_TOPIC, payload, qos=1)
            log.info(f"[#{total}] V={data['vPack']}V SOC={data['soc']}% "
                     f"SOH≈{data['sohEstimate']}% (inferred, LOW confidence)")
        time.sleep(max(0, PUBLISH_INTERVAL - (time.monotonic() - t0)))

    c.loop_stop()
    c.disconnect()


if __name__ == "__main__":
    main()
