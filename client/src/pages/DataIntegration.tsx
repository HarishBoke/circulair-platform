import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import PlatformLayout from "@/components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wifi, Globe, Upload, Webhook, Database, CheckCircle2,
  Copy, Terminal, Zap, AlertTriangle, Info,
  ChevronRight, Code2, Server, Shield, RefreshCw,
} from "lucide-react";
import MqttBrokerPanel from "@/components/MqttBrokerPanel";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const copy = () => { navigator.clipboard.writeText(code); toast.success("Copied to clipboard"); };
  return (
    <div className="relative group rounded-lg bg-[#0d1117] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <Copy className="w-3 h-3 mr-1" /> Copy
        </Button>
      </div>
      <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StatusBadge({ status }: { status: "live" | "demo" | "coming_soon" }) {
  if (status === "live") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Live</Badge>;
  if (status === "demo") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Demo Mode</Badge>;
  return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Coming Soon</Badge>;
}

function ConnectorCard({ icon: Icon, title, description, status, children }: {
  icon: React.ElementType; title: string; description: string;
  status: "live" | "demo" | "coming_soon"; children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="w-full mb-4 border-white/10">
          <ChevronRight className={`w-4 h-4 mr-2 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? "Hide" : "Show"} Integration Guide
        </Button>
        {expanded && <div className="space-y-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

export default function DataIntegration() {
  usePageTitle("Data Integration");

  const [mqttHost, setMqttHost] = useState("mqtt.circulair.in");
  const [mqttPort, setMqttPort] = useState("8883");
  const [mqttTopic, setMqttTopic] = useState("circulair/telemetry/{BPAN}");
  const [apiKey, setApiKey] = useState("ck_live_your_api_key_here");
  const [csvPreview, setCsvPreview] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://your-system.com/webhooks/battery");
  const baseUrl = window.location.origin;

  return (
    <PlatformLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Integration Hub</h1>
          <p className="text-muted-foreground mt-1">
            Connect real data sources or explore with demo data. Supports MQTT IoT devices, REST API ingestion,
            CSV bulk import, and outbound webhooks.
          </p>
        </div>

        {/* Demo Data Banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-300">Platform is running with demo seed data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pre-loaded with realistic Indian EV battery ecosystem data. Connect a real data source below to replace or supplement it.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["40 Batteries (NMC/LFP/NCA/LCO/LMO)","480 Telemetry Readings","25 SOH Predictions","18 Marketplace Listings","20 Logistics Orders","22 EPR Tokens","35 Alerts","89 Service Records"].map(item => (
                    <Badge key={item} variant="outline" className="text-xs border-amber-500/30 text-amber-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />{item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Re-seed command */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Re-seed Demo Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Run the seed script to regenerate fresh demo data. Safe to re-run — uses ON DUPLICATE KEY UPDATE.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-white/10 shrink-0"
                onClick={() => toast.info("Run: node seed.mjs from the project root")}>
                <Terminal className="w-4 h-4 mr-2" />View Command
              </Button>
            </div>
            <CodeBlock code="cd /path/to/circulair-platform && node seed.mjs" language="bash" />
          </CardContent>
        </Card>

        {/* Integration Tabs */}
        <Tabs defaultValue="mqtt">
          <TabsList className="bg-white/5 border border-white/10 h-auto p-1 flex-wrap gap-1">
            <TabsTrigger value="mqtt" className="data-[state=active]:bg-primary/20"><Wifi className="w-4 h-4 mr-2" />MQTT / IoT</TabsTrigger>
            <TabsTrigger value="rest" className="data-[state=active]:bg-primary/20"><Globe className="w-4 h-4 mr-2" />REST API</TabsTrigger>
            <TabsTrigger value="csv" className="data-[state=active]:bg-primary/20"><Upload className="w-4 h-4 mr-2" />CSV Import</TabsTrigger>
            <TabsTrigger value="webhook" className="data-[state=active]:bg-primary/20"><Webhook className="w-4 h-4 mr-2" />Webhooks</TabsTrigger>
            <TabsTrigger value="sdk" className="data-[state=active]:bg-primary/20"><Code2 className="w-4 h-4 mr-2" />SDK / Mobile</TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-primary/20"><Database className="w-4 h-4 mr-2" />Direct DB</TabsTrigger>
          </TabsList>

          {/* MQTT */}
          <TabsContent value="mqtt" className="space-y-4 mt-4">
            {/* Live Broker Connection Manager */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-sm font-semibold text-foreground">Live Broker Connection</h3>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Real-Time</Badge>
              </div>
              <MqttBrokerPanel />
            </div>
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Device Integration Guides</h3>
            </div>
            <ConnectorCard icon={Wifi} title="MQTT Broker — Real-Time IoT Telemetry" description="Connect BMS/IoT devices to stream live voltage, temperature, current, and SOH data." status="live">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Broker Host</Label><Input value={mqttHost} onChange={e=>setMqttHost(e.target.value)} className="bg-white/5 border-white/10 font-mono text-sm"/></div>
                <div className="space-y-2"><Label>Port (TLS)</Label><Input value={mqttPort} onChange={e=>setMqttPort(e.target.value)} className="bg-white/5 border-white/10 font-mono text-sm"/></div>
              </div>
              <div className="space-y-2">
                <Label>Topic Pattern</Label>
                <Input value={mqttTopic} onChange={e=>setMqttTopic(e.target.value)} className="bg-white/5 border-white/10 font-mono text-sm"/>
                <p className="text-xs text-muted-foreground">Replace <code className="bg-white/10 px-1 rounded">{"{BPAN}"}</code> with the 21-character Battery Pack Aadhaar Number.</p>
              </div>
              <div className="space-y-2"><Label>MQTT Payload Schema (JSON)</Label>
                <CodeBlock language="json" code={`{
  "bpan": "INHB30N40250627A000101",
  "vPack": 354.2,
  "iPack": -45.3,
  "vMin": 3.51,
  "vMax": 3.58,
  "tPack": 32.4,
  "tMax": 38.1,
  "cycleCount": 342,
  "irPack": 18.5,
  "sohEstimate": 91.2,
  "source": "bms_v2",
  "ts": 1735689600000
}`}/>
              </div>
              <div className="space-y-2"><Label>Python BMS Publisher Example</Label>
                <CodeBlock language="python" code={`import paho.mqtt.client as mqtt
import json, time, ssl

BROKER = "${mqttHost}"
PORT   = ${mqttPort}
BPAN   = "INHB30N40250627A000101"
TOPIC  = f"circulair/telemetry/{BPAN}"

client = mqtt.Client(client_id=f"bms-{BPAN}")
client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
client.username_pw_set("your_device_id", "your_device_secret")
client.connect(BROKER, PORT)

while True:
    payload = {
        "bpan": BPAN,
        "vPack": read_voltage(),
        "iPack": read_current(),
        "tPack": read_temperature(),
        "tMax":  read_max_cell_temp(),
        "cycleCount": read_cycles(),
        "irPack": read_internal_resistance(),
        "sohEstimate": read_soh(),
        "source": "bms_v2",
        "ts": int(time.time() * 1000)
    }
    client.publish(TOPIC, json.dumps(payload), qos=1)
    time.sleep(2)  # 2-second interval`}/>
              </div>
              <div className="space-y-2"><Label>Server-Side MQTT Subscriber (Node.js)</Label>
                <CodeBlock language="typescript" code={`// server/mqttSubscriber.ts
import mqtt from "mqtt";
import { insertTelemetry } from "./db";
import { getTelemetryServer } from "./telemetrySocket";

const client = mqtt.connect("mqtts://${mqttHost}:${mqttPort}", {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

client.subscribe("circulair/telemetry/#");

client.on("message", async (topic, message) => {
  const data = JSON.parse(message.toString());
  const bpan = topic.split("/")[2];

  // 1. Persist to database
  const record = await insertTelemetry({
    bpan,
    batteryId: await getBatteryIdByBpan(bpan),
    vPack: data.vPack, iPack: data.iPack,
    tPack: data.tPack, tMax: data.tMax,
    cycleCount: data.cycleCount, irPack: data.irPack,
    sohEstimate: data.sohEstimate,
    thermalAnomaly: data.tMax > 51,
    anomalyType: data.tMax > 51 ? "over_temperature" : null,
    source: "mqtt",
  });

  // 2. Broadcast via Socket.io for live dashboard
  const io = getTelemetryServer();
  io.to(\`bpan:\${bpan}\`).emit("telemetry:reading", record);
  if (data.tMax > 51) {
    io.to("global:alerts").emit("alert:thermal", { bpan, tMax: data.tMax });
  }
});`}/>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"/>
                  <p className="text-sm text-blue-300"><strong>Production setup:</strong> Install the <code className="bg-white/10 px-1 rounded">mqtt</code> package, set <code className="bg-white/10 px-1 rounded">MQTT_USERNAME</code> and <code className="bg-white/10 px-1 rounded">MQTT_PASSWORD</code> env vars, then call <code className="bg-white/10 px-1 rounded">initMqttSubscriber()</code> from <code className="bg-white/10 px-1 rounded">server/_core/index.ts</code>. The existing Socket.io broadcaster will automatically push live readings to the Telemetry dashboard.</p>
                </div>
              </div>
            </ConnectorCard>
          </TabsContent>

          {/* REST API */}
          <TabsContent value="rest" className="space-y-4 mt-4">
            <ConnectorCard icon={Globe} title="REST API — Ingest & Query Battery Data" description="Use tRPC-over-HTTP endpoints to push telemetry and query battery records programmatically." status="live">
              <div className="space-y-2"><Label>API Base URL</Label><Input value={`${baseUrl}/api/trpc`} readOnly className="bg-white/5 border-white/10 font-mono text-sm"/></div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value={apiKey} onChange={e=>setApiKey(e.target.value)} className="bg-white/5 border-white/10 font-mono text-sm" placeholder="ck_live_..."/>
                <p className="text-xs text-muted-foreground">Pass as <code className="bg-white/10 px-1 rounded">Authorization: Bearer &lt;key&gt;</code> header.</p>
              </div>
              <div className="space-y-2"><Label>Ingest Telemetry — cURL</Label>
                <CodeBlock language="bash" code={`curl -X POST ${baseUrl}/api/trpc/telemetry.ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "json": {
      "bpan": "INHB30N40250627A000101",
      "vPack": 354.2, "iPack": -45.3,
      "tPack": 32.4, "tMax": 38.1,
      "cycleCount": 342, "irPack": 18.5,
      "sohEstimate": 91.2, "source": "rest_api"
    }
  }'`}/>
              </div>
              <div className="space-y-2"><Label>Query Battery Registry — Python</Label>
                <CodeBlock language="python" code={`import requests

BASE = "${baseUrl}/api/trpc"
HDR  = {"Authorization": "Bearer ${apiKey}"}

# List operational batteries
r = requests.get(f"{BASE}/battery.list",
    params={"input": '{"json":{"status":"operational","limit":50}}'}, headers=HDR)
for bat in r.json()["result"]["data"]["json"]["items"]:
    print(f"BPAN: {bat['bpan']} | SOH: {bat['currentSoh']}%")

# Get latest SOH prediction
r = requests.get(f"{BASE}/ai.getLatestPrediction",
    params={"input": '{"json":{"bpan":"INHB30N40250627A000101"}}'}, headers=HDR)
pred = r.json()["result"]["data"]["json"]
print(f"SOH: {pred['predictedSoh']}% | RUL: {pred['rulCycles']} cycles")`}/>
              </div>
              <div className="space-y-2"><Label>Register Battery — JavaScript</Label>
                <CodeBlock language="javascript" code={`const res = await fetch("${baseUrl}/api/trpc/battery.register", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer ${apiKey}" },
  body: JSON.stringify({ json: {
    countryCode: "IN", manufacturerId: "HB",
    capacityCode: "30", capacityKwh: 30,
    chemistryCode: "N", chemistry: "NMC",
    voltageCode: "40", voltageV: 400,
    mfgYear: 2025, mfgMonth: 6, mfgDay: 27,
    factoryCode: "A", serialNumber: "0001",
    vehicleId: "VIN0000000001IN",
  }}),
});
const { result } = await res.json();
console.log("Generated BPAN:", result.data.json.bpan);`}/>
              </div>
            </ConnectorCard>
          </TabsContent>

          {/* CSV Import */}
          <TabsContent value="csv" className="space-y-4 mt-4">
            <ConnectorCard icon={Upload} title="CSV Bulk Import — Batteries & Telemetry" description="Upload CSV files to bulk-import battery registrations, telemetry history, or service records." status="demo">
              <div className="space-y-2"><Label>Battery Registration CSV Format</Label>
                <CodeBlock language="csv" code={`bpan,countryCode,manufacturerId,capacityKwh,chemistry,voltageV,mfgYear,mfgMonth,mfgDay,factoryCode,serialNumber,status,currentSoh,cycleCount,vehicleId
INHB30N40250627A000101,IN,HB,30,NMC,400,2025,6,27,A,0001,operational,91.2,342,VIN0000000001IN
INOK48L32240315B000202,IN,OK,48,LFP,320,2024,3,15,B,0002,second_life,76.4,847,VIN0000000002IN
INEX50A37231108C000303,IN,EX,50,NCA,370,2023,11,8,C,0003,end_of_life,64.1,1543,VIN0000000003IN`}/>
              </div>
              <div className="space-y-2"><Label>Telemetry History CSV Format</Label>
                <CodeBlock language="csv" code={`bpan,vPack,iPack,vMin,vMax,tPack,tMax,cycleCount,irPack,sohEstimate,thermalAnomaly,recordedAt
INHB30N40250627A000101,354.2,-45.3,3.51,3.58,32.4,38.1,342,18.5,91.2,0,2025-06-27T10:00:00Z
INHB30N40250627A000101,353.8,-44.1,3.50,3.57,33.1,39.2,342,18.7,91.0,0,2025-06-27T10:02:00Z`}/>
              </div>
              <div className="space-y-2"><Label>CSV Import Script (Node.js)</Label>
                <CodeBlock language="javascript" code={`// import-batteries.mjs — run: node import-batteries.mjs
import mysql from "mysql2/promise";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);
const parser = createReadStream("batteries.csv").pipe(
  parse({ columns: true, skip_empty_lines: true })
);

let count = 0;
for await (const row of parser) {
  await db.query(
    \`INSERT INTO batteries
       (bpan,countryCode,manufacturerId,capacityKwh,chemistry,voltageV,
        mfgYear,mfgMonth,mfgDay,factoryCode,serialNumber,
        status,currentSoh,cycleCount,vehicleId,
        chemistryCode,voltageCode,capacityCode,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,LEFT(?,1),
             LEFT(CAST(?/10 AS CHAR),2),LEFT(CAST(? AS CHAR),2),NOW(),NOW())
     ON DUPLICATE KEY UPDATE currentSoh=VALUES(currentSoh),cycleCount=VALUES(cycleCount)\`,
    [row.bpan,row.countryCode,row.manufacturerId,row.capacityKwh,row.chemistry,
     row.voltageV,row.mfgYear,row.mfgMonth,row.mfgDay,row.factoryCode,row.serialNumber,
     row.status,row.currentSoh,row.cycleCount,row.vehicleId,
     row.chemistry,row.voltageV,row.capacityKwh]
  );
  count++;
}
console.log(\`Imported \${count} batteries\`);
await db.end();`}/>
              </div>
              <div className="space-y-2">
                <Label>Paste CSV Preview</Label>
                <Textarea value={csvPreview} onChange={e=>setCsvPreview(e.target.value)} placeholder="Paste CSV rows here to preview..." className="bg-white/5 border-white/10 font-mono text-xs h-32"/>
                {csvPreview && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 inline mr-2"/>
                    {csvPreview.split("\n").filter(Boolean).length - 1} data rows detected
                  </div>
                )}
              </div>
            </ConnectorCard>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhook" className="space-y-4 mt-4">
            <ConnectorCard icon={Webhook} title="Outbound Webhooks — Push Events to External Systems" description="Configure webhooks to push battery events (thermal anomalies, EOL, EPR tokens) to your systems." status="demo">
              <div className="space-y-2"><Label>Your Webhook Endpoint</Label><Input value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} className="bg-white/5 border-white/10 font-mono text-sm"/></div>
              <div className="space-y-2"><Label>Webhook Payload Examples</Label>
                <Tabs defaultValue="thermal">
                  <TabsList className="bg-white/5 h-auto p-1 flex-wrap gap-1">
                    <TabsTrigger value="thermal" className="text-xs">Thermal Anomaly</TabsTrigger>
                    <TabsTrigger value="eol" className="text-xs">EOL Detected</TabsTrigger>
                    <TabsTrigger value="epr" className="text-xs">EPR Token</TabsTrigger>
                    <TabsTrigger value="sla" className="text-xs">SLA Breach</TabsTrigger>
                  </TabsList>
                  <TabsContent value="thermal"><CodeBlock language="json" code={`{
  "event": "thermal_anomaly",
  "timestamp": "2025-06-27T10:15:00Z",
  "bpan": "INHB30N40250627A000101",
  "severity": "critical",
  "data": {
    "tMax": 54.3, "tPack": 48.1, "threshold": 51.0,
    "location": "Cell group 3, Module 2",
    "recommendedAction": "Immediate isolation and inspection"
  }
}`}/></TabsContent>
                  <TabsContent value="eol"><CodeBlock language="json" code={`{
  "event": "eol_detected",
  "timestamp": "2025-06-27T10:15:00Z",
  "bpan": "INHB30N40250627A000101",
  "severity": "warning",
  "data": {
    "currentSoh": 68.4, "threshold": 70.0,
    "triagePath": "material_recycling", "rulCycles": 45,
    "recommendedAction": "Initiate EOL workflow and logistics dispatch"
  }
}`}/></TabsContent>
                  <TabsContent value="epr"><CodeBlock language="json" code={`{
  "event": "epr_token_issued",
  "timestamp": "2025-06-27T10:15:00Z",
  "bpan": "INHB30N40250627A000101",
  "severity": "info",
  "data": {
    "tokenId": "EPR-INHB30-ABC123-001",
    "actualYieldKg": 42.5, "yieldRatio": 0.934,
    "blockchainTxHash": "0xabc123...",
    "blockchainBlock": 4521893,
    "cpcbFormUrl": "https://docs.circulair.in/cpcb/..."
  }
}`}/></TabsContent>
                  <TabsContent value="sla"><CodeBlock language="json" code={`{
  "event": "sla_breach",
  "timestamp": "2025-06-27T10:15:00Z",
  "bpan": "INHB30N40250627A000101",
  "severity": "critical",
  "data": {
    "shipmentId": "SHP0001123456789012",
    "slaTier": "24h", "delayHours": 2.5,
    "logisticsPartner": "BlueDart",
    "currentStatus": "in_transit"
  }
}`}/></TabsContent>
                </Tabs>
              </div>
              <div className="space-y-2"><Label>Webhook Receiver — Express.js Example</Label>
                <CodeBlock language="javascript" code={`app.post("/webhooks/battery", express.json(), (req, res) => {
  const { event, bpan, severity, data } = req.body;

  // Verify HMAC-SHA256 signature
  const sig = req.headers["x-circulair-signature"];
  const expected = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body)).digest("hex");
  if (sig !== \`sha256=\${expected}\`) return res.status(401).end();

  switch (event) {
    case "thermal_anomaly":   alertMaintenanceTeam(bpan, data.tMax); break;
    case "eol_detected":      schedulePickup(bpan, data.triagePath); break;
    case "epr_token_issued":  updateERPSystem(bpan, data.tokenId); break;
    case "sla_breach":        escalateToLogistics(data.shipmentId); break;
  }
  res.json({ received: true });
});`}/>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"/>
                  <p className="text-sm text-blue-300"><strong>Security:</strong> All webhook payloads are signed with HMAC-SHA256 using your <code className="bg-white/10 px-1 rounded">WEBHOOK_SECRET</code>. Always verify the <code className="bg-white/10 px-1 rounded">x-circulair-signature</code> header before processing.</p>
                </div>
              </div>
            </ConnectorCard>
          </TabsContent>

          {/* SDK */}
          <TabsContent value="sdk" className="space-y-4 mt-4">
            <ConnectorCard icon={Server} title="Mobile SDK — Offline-First Field Technician App" description="React Native / Flutter SDK for field technicians with offline-first sync and QR scanning." status="coming_soon">
              <div className="space-y-2"><Label>React Native SDK (Planned)</Label>
                <CodeBlock language="javascript" code={`// npm install @circulair/mobile-sdk
import { CirculairSDK, BpanScanner } from "@circulair/mobile-sdk";

const sdk = new CirculairSDK({
  apiUrl: "${baseUrl}/api/trpc",
  apiKey: "ck_mobile_your_key",
  offlineMode: true,    // Cache reads, queue writes
  syncInterval: 30000,  // Sync every 30s when online
});

// Scan BPAN QR code
const { bpan, battery } = await BpanScanner.scan();
console.log("Scanned:", bpan, battery.currentSoh);

// Log service record (queued offline if no network)
await sdk.service.addRecord({
  bpan,
  serviceType: "inspection",
  sohBefore: battery.currentSoh,
  sohAfter: 89.4,
  notes: "Cells within spec. Thermal management cleaned.",
  technicianName: "Deepak Patel",
  location: "Mumbai Service Center",
});

// Auto-sync when back online
sdk.on("online", () => sdk.sync());`}/>
              </div>
            </ConnectorCard>
          </TabsContent>

          {/* Direct DB */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <ConnectorCard icon={Database} title="Direct Database Access — MySQL / TiDB" description="Connect directly to the MySQL/TiDB database for bulk operations, migrations, and BI tools." status="live">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-300"><strong>Caution:</strong> Direct DB access bypasses application-level validation and audit logging. Use only for migrations, BI reporting, and bulk imports. Never hard-delete records — use status updates instead.</p>
                </div>
              </div>
              <div className="space-y-2"><Label>Connection String Format</Label>
                <CodeBlock language="bash" code={`# Available as DATABASE_URL environment variable
mysql://user:password@host:port/database?ssl=true

# Connect with mysql CLI
mysql -h HOST -u USER -p DATABASE --ssl-mode=REQUIRED

# Python (SQLAlchemy)
from sqlalchemy import create_engine
engine = create_engine(os.environ["DATABASE_URL"])`}/>
              </div>
              <div className="space-y-2"><Label>Key Tables Reference</Label>
                <CodeBlock language="sql" code={`-- Core tables
SELECT * FROM batteries WHERE status = 'operational' LIMIT 10;
SELECT * FROM telemetry WHERE bpan = 'INHB30N40250627A000101'
  ORDER BY recordedAt DESC LIMIT 24;
SELECT * FROM soh_predictions WHERE predictedSoh < 70
  ORDER BY predictedAt DESC;

-- EPR & Compliance
SELECT * FROM epr_tokens WHERE status = 'verified';
SELECT * FROM yield_verifications WHERE status = 'completed';

-- Analytics: SOH distribution
SELECT
  CASE
    WHEN currentSoh >= 80 THEN 'Direct Reuse (>80%)'
    WHEN currentSoh >= 70 THEN 'Repurposing (70-80%)'
    ELSE 'Recycling (<70%)'
  END AS triage_bucket,
  COUNT(*) AS battery_count,
  AVG(currentSoh) AS avg_soh
FROM batteries
GROUP BY triage_bucket;`}/>
              </div>
              <div className="space-y-2"><Label>Grafana Datasource Config</Label>
                <CodeBlock language="yaml" code={`apiVersion: 1
datasources:
  - name: Circulair-MySQL
    type: mysql
    url: \${DATABASE_HOST}:\${DATABASE_PORT}
    database: \${DATABASE_NAME}
    user: \${DATABASE_USER}
    secureJsonData:
      password: \${DATABASE_PASSWORD}
    jsonData:
      sslmode: require
      maxOpenConns: 10

# Example panel query — Live SOH gauge
SELECT AVG(currentSoh) as avg_soh,
       MIN(currentSoh) as min_soh,
       COUNT(*) as total_batteries
FROM batteries
WHERE status IN ('operational', 'second_life')`}/>
              </div>
            </ConnectorCard>
          </TabsContent>
        </Tabs>

        {/* Architecture Diagram */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Data Flow Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Data Sources", items: ["BMS / IoT Devices","Field Technicians","ERP / SAP Systems","CSV Bulk Import"], color: "blue" },
                { label: "Ingestion Layer", items: ["MQTT Broker (TLS)","REST API (tRPC)","CSV Import Script","Direct DB Write"], color: "purple" },
                { label: "Processing Layer", items: ["Socket.io Broadcast","CNN-LSTM SOH Model","Triage Router","EPR Token Engine"], color: "emerald" },
                { label: "Consumers", items: ["Live Dashboard","Marketplace","CPCB Reports","Webhooks / ERP"], color: "amber" },
              ].map(col => (
                <div key={col.label} className="p-3 rounded-lg border" style={{backgroundColor:`color-mix(in oklch, var(--color-${col.color}-500) 10%, transparent)`, borderColor:`color-mix(in oklch, var(--color-${col.color}-500) 30%, transparent)`}}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{col.label}</p>
                  <ul className="space-y-1">
                    {col.items.map(item => (
                      <li key={item} className="text-xs text-muted-foreground flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 shrink-0"/> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3"/>
              <span>Real-time path: IoT Device → MQTT → Socket.io → Live Dashboard (≈2s latency)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
