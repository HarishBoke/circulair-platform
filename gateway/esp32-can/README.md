# Circul-AI-r Gateway — ESP32 CAN Bus (EV Packs / OBD-II)

## What This Does

This firmware runs on an **ESP32 + MCP2515 CAN controller** and bridges a battery pack's CAN bus to the Circul-AI-r platform over MQTT/TLS. It reads voltage, current, temperature, SOC, cycle count, and cell voltages from the BMS every 30 seconds and publishes them to the platform in real time — no manual inspection required.

## Compatible Battery Types

| Battery | Interface | CAN Speed |
|---|---|---|
| Nissan Leaf (2nd gen, 40 kWh) | OBD-II port (CAN) | 500 kbps |
| BYD Blade (LFP) | CAN connector on pack | 500 kbps |
| CATL NMC modules | CAN connector | 500 kbps |
| Generic EV pack with BMS | CAN-H / CAN-L terminals | 250–500 kbps |
| Any OBD-II accessible vehicle | OBD-II port | 500 kbps |

## Hardware Required

| Component | Approx. Cost (INR) | Notes |
|---|---|---|
| ESP32 DevKit v1 | ₹350–500 | Any 38-pin ESP32 board |
| MCP2515 CAN module | ₹200–350 | Includes TJA1050 transceiver |
| OBD-II breakout cable | ₹150–300 | Or bare CAN-H/CAN-L wires |
| 4G LTE SIM module (optional) | ₹800–1200 | SIM800L or SIM7600 for cellular |
| 3D-printed enclosure | ₹100–200 | IP54 rated for under-bonnet use |
| **Total** | **₹800–1200** | Per battery / vehicle |

## Wiring

```
MCP2515 Module          ESP32 DevKit v1
─────────────           ───────────────
VCC          ──────────  3.3V
GND          ──────────  GND
CS           ──────────  GPIO 5
SO (MISO)    ──────────  GPIO 19
SI (MOSI)    ──────────  GPIO 23
SCK          ──────────  GPIO 18
INT          ──────────  GPIO 4

MCP2515 CAN_H ─────────  OBD-II Pin 6  (CAN High)
MCP2515 CAN_L ─────────  OBD-II Pin 14 (CAN Low)
```

> **Safety note:** Always connect CAN_H and CAN_L with the vehicle/pack powered off. Never short CAN_H to CAN_L. Use 120Ω termination resistors at each end of the bus if you are tapping mid-bus.

## Software Setup

### 1. Install Arduino IDE + ESP32 Board Support
```
File → Preferences → Additional Board URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

### 2. Install Libraries (Tools → Manage Libraries)
- `PubSubClient` by Nick O'Leary (v2.8+)
- `MCP_CAN` by Cory J. Fowler (v1.5+)
- `ArduinoJson` by Benoit Blanchon (v6.x)

### 3. Configure the Firmware

Open `circul_air_can_gateway.ino` and fill in the `CONFIGURATION` section at the top:

```cpp
#define WIFI_SSID         "YourNetworkName"
#define WIFI_PASSWORD     "YourNetworkPassword"
#define MQTT_USERNAME     "dev_abc123"          // From Device Provisioning page
#define MQTT_PASSWORD     "secret_xyz"          // From Device Provisioning page
#define MQTT_TOPIC        "CAI_/INXYZ.../telemetry"  // From Device Provisioning page
#define DEVICE_BPAN       "INXYZ12FABCD3456789AB"    // From BPAN Registry
#define CELL_COUNT_SERIES 96                    // Adjust for your pack
#define CHEMISTRY         "NMC"                 // NMC | LFP | NCA | LCO | LMO
```

### 4. Discover Your BMS CAN PIDs

Every BMS manufacturer uses different CAN message IDs. Use **SavvyCAN** (free, open source) or a **CANable USB adapter** to sniff the bus and identify the PIDs for your pack before flashing.

Common PID databases:
- Nissan Leaf: [github.com/dalathegreat/Nissan-LEAF-Battery-Upgrade](https://github.com/dalathegreat/Nissan-LEAF-Battery-Upgrade)
- BYD: Contact Circul-AI-r support for the PID map
- Generic BMS: Check the BMS datasheet under "CAN communication protocol"

Update the `CAN_ID_*` defines in the firmware to match your BMS.

### 5. Flash and Test

```
Tools → Board → ESP32 Dev Module
Tools → Upload Speed → 921600
Sketch → Upload
```

Open Serial Monitor at 115200 baud. You should see:
```
[WiFi] Connected. IP: 192.168.1.42
[CAN] Initialised at 500 kbps.
[MQTT] Connecting... connected.
[Circul-AI-r] Gateway ready. Publishing to CAI_/INXYZ.../telemetry every 30000 ms
[MQTT] Published reading #1 (OK): {"bpan":"INXYZ...","vPack":398.4,...}
```

### 6. Verify on Platform

Navigate to **BPAN Registry → [Your Battery] → Telemetry** on the platform. You should see live readings arriving within 30 seconds of the first publish.

## MQTT Payload Schema

```json
{
  "bpan":          "INXYZ12FABCD3456789AB",
  "ts":            1712200000000,
  "vPack":         398.4,
  "iPack":         -12.5,
  "soc":           78,
  "tMax":          34.2,
  "tMin":          31.8,
  "tAvg":          33.0,
  "vCellMin":      4.051,
  "vCellMax":      4.063,
  "cycleCount":    312,
  "sohEstimate":   93.8,
  "chemistry":     "NMC",
  "thermalAnomaly": false
}
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| CAN Init failed | Wrong SPI pins or MCP2515 not powered | Check wiring, use 3.3V not 5V |
| No CAN frames received | Wrong baud rate | Try `CAN_250KBPS` instead of `CAN_500KBPS` |
| MQTT connect failed rc=-2 | Wrong broker address | Copy exact value from Device Provisioning page |
| MQTT connect failed rc=5 | Wrong credentials | Regenerate credentials on Device Provisioning page |
| All values zero | Wrong CAN PIDs | Use SavvyCAN to discover correct PIDs |
| Thermal anomaly false positives | Wrong temperature offset | Adjust `buf[0] - 40` offset for your BMS |
