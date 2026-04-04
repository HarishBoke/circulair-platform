import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Cpu, Zap, Server, Radio, Battery, AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GatewayOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string;
  hardware: string;
  cost: string;
  protocol: string;
  tab: string;
}

const GATEWAY_OPTIONS: GatewayOption[] = [
  {
    id: "esp32-can",
    label: "EV Pack / CAN Bus",
    icon: <Cpu className="w-5 h-5" />,
    badge: "ESP32 + MCP2515",
    badgeVariant: "default",
    description: "For EV battery packs (Nissan Leaf, BYD Blade, CATL NMC) that communicate over CAN bus via OBD-II port or direct CAN-H/CAN-L terminals.",
    hardware: "ESP32 DevKit + MCP2515 CAN module + OBD-II cable",
    cost: "₹800 – ₹1,200 per battery",
    protocol: "CAN bus → MQTT/TLS over Wi-Fi or 4G",
    tab: "esp32",
  },
  {
    id: "rpi-modbus",
    label: "Industrial UPS / BESS",
    icon: <Server className="w-5 h-5" />,
    badge: "Raspberry Pi + RS-485",
    badgeVariant: "secondary",
    description: "For industrial UPS banks, telecom tower batteries, and solar BESS systems with Modbus RTU RS-485 interface (Daly, JK BMS, Narada, Dynavolt).",
    hardware: "Raspberry Pi Zero 2W + USB-to-RS485 adapter",
    cost: "₹2,900 – ₹4,800 per system",
    protocol: "Modbus RTU RS-485 → MQTT/TLS over Wi-Fi or 4G",
    tab: "rpi",
  },
  {
    id: "python-agent",
    label: "Solar Inverter / SCADA",
    icon: <Zap className="w-5 h-5" />,
    badge: "Python Agent",
    badgeVariant: "outline",
    description: "Zero new hardware. Runs on the inverter's existing Linux system or a co-located PC. Supports SMA, Victron Venus OS, Growatt, generic REST APIs, and CSV file exports.",
    hardware: "No new hardware — runs on existing host system",
    cost: "₹0 additional hardware",
    protocol: "Modbus TCP / REST API / MQTT local → MQTT/TLS",
    tab: "python",
  },
  {
    id: "lead-acid",
    label: "Lead-Acid / No BMS",
    icon: <Battery className="w-5 h-5" />,
    badge: "Inference Mode",
    badgeVariant: "destructive",
    description: "For VRLA, flooded lead-acid, or any battery with no BMS. Uses terminal voltage + temperature to infer SOC/SOH. Confidence is LOW (±10–15%) — clearly flagged on the platform.",
    hardware: "Raspberry Pi + ADS1115 ADC + DS18B20 temperature sensor",
    cost: "₹1,500 – ₹2,500 per battery",
    protocol: "Voltage/temperature inference → MQTT/TLS",
    tab: "leadacid",
  },
  {
    id: "rest-ingest",
    label: "REST API Ingest",
    icon: <Radio className="w-5 h-5" />,
    badge: "HTTP POST",
    badgeVariant: "outline",
    description: "For systems that already have internet access and can make HTTP requests. POST telemetry directly to the platform REST endpoint — no MQTT broker required.",
    hardware: "Any device that can make HTTP POST requests",
    cost: "₹0",
    protocol: "HTTP POST → Platform REST API",
    tab: "rest",
  },
];

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

// ─── Code Block ───────────────────────────────────────────────────────────────
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

// ─── Payload Schema ───────────────────────────────────────────────────────────
const PAYLOAD_SCHEMA = `{
  "bpan":           "INXYZ12FABCD3456789AB",  // Required — Battery BPAN
  "ts":             1712200000000,             // Required — Unix ms UTC
  "vPack":          398.4,                    // Required — Pack voltage (V)
  "iPack":          -12.5,                    // Required — Pack current (A, negative=discharge)
  "soc":            78,                       // Required — State of Charge (%)
  "tMax":           34.2,                     // Required — Max cell temperature (°C)
  "tMin":           31.8,                     // Optional — Min cell temperature (°C)
  "tAvg":           33.0,                     // Optional — Average temperature (°C)
  "vCellMin":       4.051,                    // Optional — Min cell voltage (V)
  "vCellMax":       4.063,                    // Optional — Max cell voltage (V)
  "cycleCount":     312,                      // Optional — Charge cycle count
  "sohEstimate":    93.8,                     // Optional — SOH % (from BMS or inferred)
  "chemistry":      "NMC",                    // Optional — NMC|LFP|NCA|LCO|LMO|LEAD_ACID
  "thermalAnomaly": false,                    // Optional — true if tMax > 51°C
  "inferenceMode":  false,                    // Optional — true if SOH is inferred not measured
  "confidence":     "HIGH"                    // Optional — HIGH|MEDIUM|LOW
}`;

const REST_EXAMPLE = `curl -X POST https://circulair.energy/api/v1/batteries/INXYZ12FABCD3456789AB/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: YOUR_MQTT_PASSWORD" \\
  -d '{
    "bpan": "INXYZ12FABCD3456789AB",
    "ts": 1712200000000,
    "vPack": 398.4,
    "iPack": -12.5,
    "soc": 78,
    "tMax": 34.2,
    "sohEstimate": 93.8,
    "chemistry": "NMC"
  }'`;

const ESP32_ENV = (username: string, password: string, topic: string, bpan: string) =>
`// In circul_air_can_gateway.ino — CONFIGURATION section
#define WIFI_SSID         "YourNetworkName"
#define WIFI_PASSWORD     "YourNetworkPassword"
#define MQTT_USERNAME     "${username}"
#define MQTT_PASSWORD     "${password}"
#define MQTT_TOPIC        "${topic}"
#define DEVICE_BPAN       "${bpan}"
#define CELL_COUNT_SERIES 96        // Adjust for your pack
#define CHEMISTRY         "NMC"     // NMC | LFP | NCA | LCO | LMO`;

const RPI_ENV = (username: string, password: string, topic: string, bpan: string) =>
`# /etc/circul-air-gateway.env
SERIAL_PORT=/dev/ttyUSB0
BAUD_RATE=9600
MODBUS_UNIT=1
MQTT_USERNAME=${username}
MQTT_PASSWORD=${password}
MQTT_TOPIC=${topic}
DEVICE_BPAN=${bpan}
CHEMISTRY=LFP
PUBLISH_INTERVAL=60`;

const PYTHON_ENV = (username: string, password: string, topic: string, bpan: string) =>
`# .env or environment variables
HOST_TYPE=sma_inverter   # sma_inverter | victron_venus | modbus_tcp | rest_api | csv_file
HOST_IP=192.168.1.100
MQTT_USERNAME=${username}
MQTT_PASSWORD=${password}
MQTT_TOPIC=${topic}
DEVICE_BPAN=${bpan}
CHEMISTRY=LFP
PUBLISH_INTERVAL=60`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GatewayDocs() {
  const [selectedGateway, setSelectedGateway] = useState<string>("esp32-can");
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const { data: devicesData } = trpc.device.list.useQuery({ limit: 50 });
  const devices = devicesData?.items ?? [];

  const selected = GATEWAY_OPTIONS.find(g => g.id === selectedGateway)!;
  const device = devices.find((d: { id: number }) => String(d.id) === selectedDevice) as typeof devices[0] | undefined;

  const mqttUsername = device?.mqttUsername ?? "YOUR_MQTT_USERNAME";
  const mqttPassword = device?.mqttPassword ?? "YOUR_MQTT_PASSWORD";
  const mqttTopic    = device?.mqttTopic    ?? "CAI_/YOUR_BPAN/telemetry";
  const bpan         = device?.bpan         ?? "YOUR_BATTERY_BPAN";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gateway Integration Guide</h1>
        <p className="text-muted-foreground mt-1">
          Connect any battery to the platform — from EV packs with CAN bus to legacy lead-acid with no BMS.
          Select your battery type below to get a tailored setup guide with auto-filled credentials.
        </p>
      </div>

      {/* Credential Selector */}
      {devices.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Radio className="w-4 h-4 text-primary" />
                Auto-fill credentials from registered device:
              </div>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a registered device…" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d: { id: number; name: string; bpan: string | null }) => (
                    <SelectItem key={String(d.id)} value={String(d.id)}>
                      {d.name} {d.bpan ? `(${d.bpan.slice(0, 12)}…)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {device && (
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  <Check className="w-3 h-3 mr-1" /> Credentials loaded
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gateway Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GATEWAY_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelectedGateway(opt.id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedGateway === opt.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className={`p-2 rounded-lg ${selectedGateway === opt.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {opt.icon}
              </div>
              <Badge variant={opt.badgeVariant} className="text-xs shrink-0">{opt.badge}</Badge>
            </div>
            <div className="font-medium text-sm">{opt.label}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{opt.description}</div>
          </button>
        ))}
      </div>

      {/* Selected Gateway Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{selected.icon}</div>
            <div>
              <CardTitle className="text-lg">{selected.label}</CardTitle>
              <CardDescription>{selected.description}</CardDescription>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3">
            {[
              { label: "Hardware", value: selected.hardware },
              { label: "Cost", value: selected.cost },
              { label: "Protocol", value: selected.protocol },
            ].map(item => (
              <div key={item.label} className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup">
            <TabsList>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              <TabsTrigger value="payload">Payload Schema</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
            </TabsList>

            {/* ── ESP32 CAN ── */}
            {selected.id === "esp32-can" && (
              <>
                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {[
                      { step: 1, title: "Install Arduino IDE + ESP32 board support", content: "Add this URL to File → Preferences → Additional Board URLs:\nhttps://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json\n\nThen: Tools → Board Manager → search 'esp32' → Install." },
                      { step: 2, title: "Install Arduino libraries", content: "Tools → Manage Libraries → install:\n• PubSubClient by Nick O'Leary (v2.8+)\n• MCP_CAN by Cory J. Fowler (v1.5+)\n• ArduinoJson by Benoit Blanchon (v6.x)" },
                      { step: 3, title: "Download the firmware", content: "Download circul_air_can_gateway.ino from the gateway/esp32-can/ folder in the platform repository." },
                      { step: 4, title: "Fill in your credentials", content: ESP32_ENV(mqttUsername, mqttPassword, mqttTopic, bpan) },
                      { step: 5, title: "Wire the hardware", content: "MCP2515 → ESP32:\n  VCC → 3.3V  |  GND → GND\n  CS  → GPIO5  |  SO → GPIO19\n  SI  → GPIO23 |  SCK → GPIO18\n  INT → GPIO4\n\nMCP2515 CAN_H → OBD-II Pin 6\nMCP2515 CAN_L → OBD-II Pin 14" },
                      { step: 6, title: "Flash and verify", content: "Tools → Board: ESP32 Dev Module → Upload\nOpen Serial Monitor at 115200 baud.\nYou should see: [MQTT] Published reading #1 (OK)" },
                    ].map(({ step, title, content }) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">{title}</div>
                          <CodeBlock code={content} language={step === 4 ? "cpp" : step === 5 ? "text" : "bash"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="troubleshoot" className="mt-4">
                  <TroubleshootTable rows={[
                    ["CAN Init failed", "Wrong SPI pins or MCP2515 not powered", "Check wiring, confirm 3.3V supply"],
                    ["No CAN frames received", "Wrong baud rate", "Try CAN_250KBPS instead of CAN_500KBPS"],
                    ["MQTT connect failed rc=-2", "Wrong broker address", "Copy exact value from Device Provisioning page"],
                    ["MQTT connect failed rc=5", "Wrong credentials", "Regenerate credentials on Device Provisioning page"],
                    ["All values zero", "Wrong CAN PIDs", "Use SavvyCAN to discover correct PIDs for your BMS"],
                  ]} />
                </TabsContent>
              </>
            )}

            {/* ── Raspberry Pi Modbus ── */}
            {selected.id === "rpi-modbus" && (
              <>
                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {[
                      { step: 1, title: "Install dependencies on the Raspberry Pi", content: "sudo apt update && sudo apt install -y python3-pip python3-venv\npython3 -m venv /opt/circul-air-gateway\nsource /opt/circul-air-gateway/bin/activate\npip install pymodbus paho-mqtt python-dotenv" },
                      { step: 2, title: "Create the credentials file", content: RPI_ENV(mqttUsername, mqttPassword, mqttTopic, bpan) },
                      { step: 3, title: "Wire the RS-485 adapter", content: "USB-RS485 A+ → BMS RS-485 A+\nUSB-RS485 B- → BMS RS-485 B-\nGND → BMS GND (if available)\n\nAdd 120Ω termination resistor between A+ and B-\nif cable run exceeds 10 metres." },
                      { step: 4, title: "Discover your BMS register map", content: "python3 -c \"\nfrom pymodbus.client import ModbusSerialClient\nc = ModbusSerialClient(port='/dev/ttyUSB0', baudrate=9600)\nc.connect()\nr = c.read_holding_registers(0, 20, slave=1)\nprint(r.registers)\n\"" },
                      { step: 5, title: "Install as a systemd service", content: "sudo systemctl enable --now circul-air-gateway\nsudo journalctl -u circul-air-gateway -f\n\n# See README.md in gateway/rpi-modbus/ for the full service file." },
                    ].map(({ step, title, content }) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">{title}</div>
                          <CodeBlock code={content} language={step === 2 ? "bash" : "bash"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="troubleshoot" className="mt-4">
                  <TroubleshootTable rows={[
                    ["Cannot open serial port", "Wrong port or permissions", "Run ls /dev/ttyUSB* and sudo usermod -aG dialout pi"],
                    ["All registers return 0", "Wrong baud rate or unit ID", "Try 19200 baud; scan unit IDs 1–10"],
                    ["Modbus read error", "Wrong register count or address", "Start with count=1 at address 0 and increment"],
                    ["MQTT connect failed", "Wrong credentials", "Regenerate on Device Provisioning page"],
                    ["Values wrong scale", "Wrong scale factor", "Check BMS datasheet for register encoding"],
                  ]} />
                </TabsContent>
              </>
            )}

            {/* ── Python Host Agent ── */}
            {selected.id === "python-agent" && (
              <>
                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {[
                      { step: 1, title: "Install the agent on the host system", content: "pip install pymodbus paho-mqtt requests python-dotenv" },
                      { step: 2, title: "Set environment variables", content: PYTHON_ENV(mqttUsername, mqttPassword, mqttTopic, bpan) },
                      { step: 3, title: "Run the agent", content: "python3 circul_air_host_agent.py\n\n# Supported HOST_TYPE values:\n# sma_inverter     — SMA Solar (Modbus TCP / SunSpec)\n# victron_venus    — Victron Energy Venus OS (local MQTT)\n# growatt_inverter — Growatt (Modbus TCP)\n# modbus_tcp       — Generic Modbus TCP\n# rest_api         — Generic HTTP REST endpoint\n# csv_file         — CSV file exported by host system" },
                    ].map(({ step, title, content }) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">{title}</div>
                          <CodeBlock code={content} language="bash" />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="troubleshoot" className="mt-4">
                  <TroubleshootTable rows={[
                    ["Cannot connect to Modbus TCP", "Wrong IP or port", "Confirm inverter IP with nmap -p 502 192.168.1.0/24"],
                    ["Victron: no readings", "Wrong VRM ID in topic", "Check Venus OS → Settings → VRM Online Portal → VRM ID"],
                    ["REST API 401", "Wrong API key", "Check inverter web UI for API token settings"],
                    ["CSV: no data", "File path wrong or empty", "Confirm CSV_FILE_PATH and that the host system writes to it"],
                  ]} />
                </TabsContent>
              </>
            )}

            {/* ── Lead-Acid ── */}
            {selected.id === "lead-acid" && (
              <>
                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Inference mode:</strong> SOH is estimated from terminal voltage and battery age, not measured by a BMS. Accuracy is ±10–15%. The platform clearly labels these readings as LOW confidence and widens the SOH confidence interval accordingly.
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { step: 1, title: "Install dependencies", content: "pip install paho-mqtt adafruit-circuitpython-ads1x15 python-dotenv" },
                      { step: 2, title: "Wire the voltage divider", content: "For a 12V battery:\n  Battery+ → 10kΩ resistor → ADS1115 A0\n  ADS1115 A0 → 2.2kΩ resistor → GND\n  VOLTAGE_DIVIDER_RATIO = (10+2.2)/2.2 = 5.55\n\nFor a 48V battery:\n  Use 47kΩ + 3.3kΩ → ratio = 15.24" },
                      { step: 3, title: "Set environment variables", content: `DEVICE_BPAN=${bpan}\nMQTT_USERNAME=${mqttUsername}\nMQTT_PASSWORD=${mqttPassword}\nMQTT_TOPIC=${mqttTopic}\nCELL_COUNT=6          # 12V=6, 24V=12, 48V=24\nNOMINAL_V=12.0\nINSTALL_DATE=2022-01-01\nVOLTAGE_DIVIDER_RATIO=5.55\nPUBLISH_INTERVAL=300  # 5 min — lead-acid changes slowly` },
                    ].map(({ step, title, content }) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">{title}</div>
                          <CodeBlock code={content} language="bash" />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="troubleshoot" className="mt-4">
                  <TroubleshootTable rows={[
                    ["ADS1115 not found", "I²C not enabled", "Run raspi-config → Interface Options → I2C → Enable"],
                    ["Voltage reads too high/low", "Wrong divider ratio", "Measure actual voltage with multimeter and adjust VOLTAGE_DIVIDER_RATIO"],
                    ["DS18B20 not found", "1-Wire not enabled", "Add dtoverlay=w1-gpio to /boot/config.txt and reboot"],
                    ["SOH seems too low", "Wrong INSTALL_DATE", "Set INSTALL_DATE to the actual battery manufacture date"],
                  ]} />
                </TabsContent>
              </>
            )}

            {/* ── REST Ingest ── */}
            {selected.id === "rest-ingest" && (
              <>
                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {[
                      { step: 1, title: "POST telemetry to the platform REST endpoint", content: REST_EXAMPLE },
                      { step: 2, title: "Authentication", content: `# Use your MQTT password as the device token:\nX-Device-Token: ${mqttPassword}\n\n# The BPAN in the URL and in the JSON body must match.\n# The platform validates the token against the registered device.` },
                      { step: 3, title: "Response format", content: '# Success (200):\n{"ok": true, "readingId": "abc123"}\n\n# Validation error (400):\n{"ok": false, "error": "vPack is required"}\n\n# Auth error (401):\n{"ok": false, "error": "Invalid device token"}' },
                    ].map(({ step, title, content }) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">{title}</div>
                          <CodeBlock code={content} language="bash" />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="troubleshoot" className="mt-4">
                  <TroubleshootTable rows={[
                    ["401 Unauthorized", "Wrong device token", "Use the MQTT password from Device Provisioning page as X-Device-Token"],
                    ["400 Bad Request", "Missing required fields", "Ensure bpan, ts, vPack, iPack, soc, tMax are all present"],
                    ["404 Not Found", "BPAN not registered", "Register the battery in BPAN Registry first"],
                    ["429 Too Many Requests", "Rate limit exceeded", "Maximum 1 request per 10 seconds per device"],
                  ]} />
                </TabsContent>
              </>
            )}

            {/* Payload Schema tab — shared across all gateway types */}
            <TabsContent value="payload" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                All gateway types publish the same JSON payload format. Required fields are marked. Optional fields improve SOH prediction accuracy.
              </p>
              <CodeBlock code={PAYLOAD_SCHEMA} language="json" />
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="font-medium text-sm mb-2">Chemistry values</div>
                <div className="flex flex-wrap gap-2">
                  {["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"].map(c => (
                    <Badge key={c} variant="outline" className="font-mono">{c}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Download Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Download Gateway Firmware & Agents</CardTitle>
          <CardDescription>All source files are available in the platform repository under gateway/</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "ESP32 CAN Gateway (.ino)", path: "gateway/esp32-can/circul_air_can_gateway.ino" },
              { label: "ESP32 CAN README", path: "gateway/esp32-can/README.md" },
              { label: "Raspberry Pi Modbus Agent (.py)", path: "gateway/rpi-modbus/circul_air_modbus_gateway.py" },
              { label: "Raspberry Pi Modbus README", path: "gateway/rpi-modbus/README.md" },
              { label: "Python Host Agent (.py)", path: "gateway/python-agent/circul_air_host_agent.py" },
              { label: "Lead-Acid Inference Agent (.py)", path: "gateway/lead-acid/circul_air_lead_acid_agent.py" },
            ].map(item => (
              <div key={item.path} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                <span className="text-sm font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground">{item.path.split("/").pop()}</code>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared Troubleshoot Table ────────────────────────────────────────────────
function TroubleshootTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="rounded-lg border overflow-hidden mt-4">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">Symptom</th>
            <th className="text-left p-3 font-medium">Likely Cause</th>
            <th className="text-left p-3 font-medium">Fix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([symptom, cause, fix], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="p-3 font-mono text-xs text-destructive">{symptom}</td>
              <td className="p-3 text-muted-foreground">{cause}</td>
              <td className="p-3">{fix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
