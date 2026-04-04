# Circul-AI-r Gateway — Raspberry Pi Modbus RS-485 (Industrial UPS / BESS)

## What This Does

This Python agent runs on a **Raspberry Pi** (or any Linux SBC) and reads battery telemetry from an industrial BMS over **Modbus RTU (RS-485)**, then publishes it to the Circul-AI-r platform over MQTT/TLS every 60 seconds. It includes an **offline buffer** that stores readings locally when connectivity is lost and replays them in order when reconnected — ensuring no data gaps in the SOH trend.

## Compatible Battery Systems

| System | BMS Brand | Interface | Notes |
|---|---|---|---|
| Telecom tower VRLA | Eltek, Emerson | Modbus RTU | Most common in India |
| Solar BESS (C&I) | Dynavolt, Narada | Modbus RTU | 48V / 192V rack systems |
| Industrial UPS | APC, Eaton, Vertiv | Modbus TCP or RTU | Check datasheet |
| Grid-scale BESS | BYD, CATL, Sungrow | Modbus TCP | Use Modbus TCP variant |
| Forklift / AGV | Hoppecke, EnerSys | Modbus RTU | Lead-acid or LFP |
| Generic LFP rack | PACE, Daly, JK BMS | Modbus RTU | Very common in India |

## Hardware Required

| Component | Approx. Cost (INR) | Notes |
|---|---|---|
| Raspberry Pi Zero 2W | ₹1,200–1,500 | Smallest option; use Pi 4 for reliability |
| USB-to-RS485 adapter | ₹300–600 | CH340 or FTDI based |
| MicroSD card (16GB) | ₹200–400 | Class 10 |
| 4G USB dongle (optional) | ₹800–1,500 | Jio JioFi or Airtel 4G for cellular |
| DIN rail enclosure | ₹400–800 | IP20 for indoor panels |
| **Total** | **₹2,900–4,800** | Per battery system |

## Wiring

```
USB-RS485 Adapter          BMS RS-485 Port
─────────────────          ───────────────
A+ (Data+)     ──────────  A+ (or D+)
B- (Data-)     ──────────  B- (or D-)
GND            ──────────  GND (if available)
```

> **Termination:** Add a 120Ω resistor between A+ and B- at the far end of the bus if the cable run exceeds 10 metres.

> **Isolation:** Use an optically isolated RS-485 adapter for battery systems above 48V to protect the Raspberry Pi.

## Software Setup

### 1. Install OS and Dependencies

```bash
# On Raspberry Pi OS Lite (64-bit recommended)
sudo apt update && sudo apt install -y python3-pip python3-venv

python3 -m venv /opt/circul-air-gateway
source /opt/circul-air-gateway/bin/activate
pip install pymodbus paho-mqtt python-dotenv
```

### 2. Configure Credentials

Create `/etc/circul-air-gateway.env`:
```bash
SERIAL_PORT=/dev/ttyUSB0
BAUD_RATE=9600
MODBUS_UNIT=1
MQTT_USERNAME=dev_abc123
MQTT_PASSWORD=secret_xyz
MQTT_TOPIC=CAI_/INXYZ12FABCD3456789AB/telemetry
DEVICE_BPAN=INXYZ12FABCD3456789AB
CHEMISTRY=LFP
PUBLISH_INTERVAL=60
```

Copy credentials from the **Device Provisioning** page on the platform.

### 3. Discover Your BMS Register Map

Use `modpoll` or `pymodbus` to scan registers before running the agent:

```bash
pip install pymodbus
python3 -c "
from pymodbus.client import ModbusSerialClient
c = ModbusSerialClient(port='/dev/ttyUSB0', baudrate=9600)
c.connect()
r = c.read_holding_registers(0, 20, slave=1)
print(r.registers)
"
```

Compare the output against your BMS datasheet to map register addresses.

### 4. Update Register Map in the Script

Edit the `REG_*` constants in `circul_air_modbus_gateway.py` to match your BMS.

### 5. Run as a systemd Service

```bash
sudo cp circul_air_modbus_gateway.py /opt/circul-air-gateway/
sudo tee /etc/systemd/system/circul-air-gateway.service << 'EOF'
[Unit]
Description=Circul-AI-r Modbus Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
EnvironmentFile=/etc/circul-air-gateway.env
ExecStart=/opt/circul-air-gateway/bin/python3 /opt/circul-air-gateway/circul_air_modbus_gateway.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now circul-air-gateway
sudo journalctl -u circul-air-gateway -f
```

## Register Maps for Common BMS Brands

### Daly BMS (very common in India for LFP packs)

| Register | Address | Scale | Unit |
|---|---|---|---|
| Pack Voltage | 0x0000 | ×0.1 | V |
| Pack Current | 0x0001 | ×0.1 | A (signed) |
| SOC | 0x0002 | ×0.1 | % |
| Max Cell Voltage | 0x0003 | ×0.001 | V |
| Min Cell Voltage | 0x0004 | ×0.001 | V |
| Max Temp | 0x0005 | −40 offset | °C |
| Min Temp | 0x0006 | −40 offset | °C |
| Cycle Count | 0x0007 | ×1 | — |
| Alarm Flags | 0x0008 | bitmask | — |

### JK BMS (popular for DIY and C&I LFP)

| Register | Address | Scale | Unit |
|---|---|---|---|
| Pack Voltage | 0x0002 | ×0.01 | V |
| Pack Current | 0x0003 | ×0.01 | A (signed) |
| SOC | 0x0006 | ×1 | % |
| Temp 1 | 0x0010 | ×0.1 | °C |
| Temp 2 | 0x0011 | ×0.1 | °C |
| Cycle Count | 0x001E | ×1 | — |

### Narada / Dynavolt BESS (telecom / solar)

Contact Circul-AI-r support for the full register map — these brands use proprietary extensions to the standard Modbus map.

## Alarm Bitmask Reference (Generic)

| Bit | Meaning |
|---|---|
| 0 | Over voltage |
| 1 | Under voltage |
| 2 | Over temperature |
| 3 | Under temperature |
| 4 | Over current (charge) |
| 5 | Over current (discharge) |
| 6 | Short circuit |
| 7 | BMS internal fault |

## Offline Buffer

The agent writes undelivered readings to `/tmp/circul_air_offline_buffer.jsonl` (one JSON object per line). When MQTT reconnects, it replays all buffered readings in chronological order before publishing new ones. The buffer is capped at 2,880 lines (48 hours at 60s interval) to prevent disk exhaustion.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Cannot open serial port` | Wrong port or permissions | Run `ls /dev/ttyUSB*` and `sudo usermod -aG dialout pi` |
| All registers return 0 | Wrong baud rate or unit ID | Try 19200 baud; scan unit IDs 1–10 |
| `Modbus read error` | Wrong register count or address | Start with count=1 at address 0 and increment |
| MQTT connect failed | Wrong credentials | Regenerate on Device Provisioning page |
| Readings arrive but values wrong | Wrong scale factor | Check BMS datasheet for register encoding |
