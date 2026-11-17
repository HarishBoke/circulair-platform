import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Cpu, Server, Zap, Battery, Radio } from "lucide-react";

const GATEWAY_OPTIONS = [
  { id: "esp32-can", label: "Battery Pack / CAN Bus", icon: Cpu,
    description: "Historical CAN reference for a manufacturer-documented interface. Compatibility, connector pinout, bitrate, isolation and passive receive behavior have not been accepted for a physical pack.",
    sources: ["gateway/esp32-can/circul_air_can_gateway.ino", "gateway/esp32-can/README.md"],
    review: "Obtain the exact manufacturer's interface documentation and a qualified operator-approved passive read-only plan. Do not guess pins, decode arbitrary frames or transmit CAN requests. Review firmware for transmit behavior before considering any connection." },
  { id: "rpi-modbus", label: "Industrial Battery / Modbus", icon: Server,
    description: "Historical serial reference for an explicitly documented BMS. No register map, unit identifier, baud rate, wiring or scaling is approved here.",
    sources: ["gateway/rpi-modbus/circul_air_modbus_gateway.py", "gateway/rpi-modbus/README.md"],
    review: "Use only an operator-approved manufacturer register allowlist and isolation design. Do not scan unit IDs or registers, guess scaling, or perform writes/control commands. A generic Modbus example is not a safe pack-specific configuration." },
  { id: "python-agent", label: "Host System / Recorded Export", icon: Zap,
    description: "Historical host-agent source. A documented recorded export can be reviewed offline; generic hardware adapters are not an interoperability guarantee.",
    sources: ["gateway/python-agent/circul_air_host_agent.py", "gateway/python-agent/REST_TRANSPORT.md"],
    review: "Prefer an approved offline fixture first. No network discovery, host installation, polling loop or service startup is authorized by this guide. Any later read-only endpoint requires separate owner and operator approval." },
  { id: "lead-acid", label: "Battery Without a BMS", icon: Battery,
    description: "Historical voltage/age inference reference. Estimates are uncalibrated; terminal voltage alone does not establish capacity, SOH, safe operation or remaining life.",
    sources: ["gateway/lead-acid/circul_air_lead_acid_agent.py"],
    review: "No direct battery-to-ADC wiring or voltage-divider design is supplied. Qualified personnel must select calibrated, appropriately rated isolated instruments under a separate physical test protocol. Accuracy and confidence coverage are unknown." },
  { id: "rest-ingest", label: "REST Contract Review", icon: Radio,
    description: "Legacy hardware ingestion is blocked with HTTP 503. Documentation is not a receipt proving that a reading was accepted or stored.",
    sources: ["gateway/python-agent/REST_TRANSPORT.md"],
    review: "Do not reuse a displayed MQTT password as a REST device token. The strict device boundary distinguishes device identity, battery binding, recorded timestamp and measured source. Missing measurements remain unknown; explicit zero is retained. Unsupported aliases and inferred health are not physical measurements. The new local pilot is in development and not deployed; no new route is advertised as ready." },
];

export default function GatewayDocs() {
  const [selectedGateway, setSelectedGateway] = useState("esp32-can");
  const selected = GATEWAY_OPTIONS.find(option => option.id === selectedGateway)!;
  const Icon = selected.icon;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Gateway Integration Review</h1>
        <p className="text-muted-foreground mt-1">Brand-agnostic reference inventory, not installation instructions or physical acceptance evidence.</p>
      </header>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <div className="text-sm space-y-2">
            <p><strong>Physical testing not performed.</strong> Legacy hardware ingestion is blocked with HTTP 503. Existing sources are conditional, operator-approved review examples only; they are not tested working gateways.</p>
            <p>Before any physical connection, separately approve pack-specific documentation, qualified supervision, isolation, calibrated instruments, device-to-battery authorization, units, timestamps and source provenance. Use dedicated isolated pilot data, never production customer records.</p>
            <p>No writes, battery control, charging, discharging, firmware flashing or public broker production use is approved. Software estimates are uncalibrated and must not approve safety, second-life use or recycling. Independent emergency isolation remains necessary; this app is not an emergency cutoff.</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GATEWAY_OPTIONS.map(option => {
          const OptionIcon = option.icon;
          return <button key={option.id} onClick={() => setSelectedGateway(option.id)} aria-pressed={selectedGateway === option.id}
            className={`text-left p-4 rounded-xl border ${selectedGateway === option.id ? "border-primary bg-primary/5" : "border-border"}`}>
            <OptionIcon className="w-5 h-5 mb-2" />
            <div className="font-medium text-sm">{option.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
          </button>;
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Icon className="w-5 h-5" />{selected.label}</CardTitle>
          <CardDescription>{selected.description}</CardDescription>
          <Badge variant="outline" className="w-fit">Blocked pending separate physical approval</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{selected.review}</p>
          <div>
            <h2 className="text-sm font-semibold mb-2">Historical source paths for review</h2>
            <p className="text-xs text-muted-foreground mb-2">Files exist in the development repository. This page does not provide verified downloads, credentials, runnable payloads or approved hardware configuration.</p>
            {selected.sources.map(path => <code key={path} className="block text-xs break-all py-1">{path}</code>)}
          </div>
          <p className="text-sm text-muted-foreground">If readings are absent, zero, inconsistent or rejected, preserve the raw evidence and stop the test. Zero may be a legitimate measurement; it is not permission to scan for alternative registers or substitute a healthy default. Connection, storage and physical acceptance remain separate unknowns until independently evidenced.</p>
        </CardContent>
      </Card>
    </div>
  );
}
