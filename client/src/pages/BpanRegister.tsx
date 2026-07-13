import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Battery, CheckCircle2, Copy, QrCode,
  Building2, FlaskConical, Calendar, Leaf, ChevronRight
} from "lucide-react";

/* ─── Option tables ────────────────────────────────────────────────────────── */
const CAPACITY_OPTIONS = [
  { code: "A1", label: "1.5 kWh" }, { code: "A2", label: "2.0 kWh" }, { code: "A3", label: "2.5 kWh" },
  { code: "A4", label: "3.0 kWh" }, { code: "A5", label: "3.5 kWh" }, { code: "A6", label: "30.0 kWh" },
  { code: "B1", label: "5.0 kWh" }, { code: "B2", label: "7.5 kWh" }, { code: "B3", label: "10.0 kWh" },
  { code: "B4", label: "15.0 kWh" }, { code: "B5", label: "20.0 kWh" }, { code: "B6", label: "25.0 kWh" },
  { code: "C1", label: "40.0 kWh" }, { code: "C2", label: "50.0 kWh" }, { code: "C3", label: "60.0 kWh" },
  { code: "C4", label: "75.0 kWh" }, { code: "C5", label: "100.0 kWh" },
];
const CHEMISTRY_OPTIONS = [
  { code: "A", label: "Lead Acid" }, { code: "B", label: "LFP" }, { code: "C", label: "LCO" },
  { code: "D", label: "LMO" }, { code: "F", label: "NMC" }, { code: "G", label: "NCA" },
];
const VOLTAGE_OPTIONS = [
  { code: "KK", label: "307V" }, { code: "KL", label: "400V" }, { code: "KM", label: "450V" },
  { code: "KN", label: "500V" }, { code: "KO", label: "600V" }, { code: "KP", label: "700V" },
  { code: "KQ", label: "800V" }, { code: "LA", label: "48V" }, { code: "LB", label: "60V" },
  { code: "LC", label: "72V" }, { code: "LD", label: "96V" }, { code: "LE", label: "120V" },
];
const ORIGIN_OPTIONS = [
  { code: "IN", label: "India" }, { code: "CN", label: "China" }, { code: "KR", label: "South Korea" },
  { code: "JP", label: "Japan" }, { code: "US", label: "United States" }, { code: "DE", label: "Germany" },
];
const EXTINGUISHER_OPTIONS = [
  { code: "A", label: "Class A" }, { code: "B", label: "Class B" }, { code: "C", label: "Class C" },
  { code: "D", label: "Class D" }, { code: "E", label: "Class E" },
];

const STEPS = [
  { id: 1, title: "Manufacturer", icon: Building2, desc: "Identity & origin" },
  { id: 2, title: "Specifications", icon: FlaskConical, desc: "Chemistry & capacity" },
  { id: 3, title: "Instance", icon: Calendar, desc: "Production details" },
  { id: 4, title: "Sustainability", icon: Leaf, desc: "Material composition" },
];

/* ─── Stepper ──────────────────────────────────────────────────────────────── */
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary border border-primary/40" :
                "bg-secondary/50 text-muted-foreground border border-border"
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className={`text-xs font-semibold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</div>
                <div className="text-[10px] text-muted-foreground/60 truncate">{step.desc}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Select Field Helper ──────────────────────────────────────────────────── */
function SelectField({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { code: string; label: string }[]; hint?: string;
}) {
  return (
    <div>
      <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-card border-border">
          {options.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {hint && <div className="text-[9px] text-muted-foreground/50 mt-1">{hint}</div>}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function BpanRegister() {
  usePageTitle("Register Battery");
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    countryCode: "IN",
    manufacturerId: "",
    capacityCode: "C3",
    chemistryCode: "F",
    voltageCode: "KO",
    cellOriginCode: "IN",
    extinguisherClass: "D",
    mfgYear: new Date().getFullYear(),
    mfgMonth: new Date().getMonth() + 1,
    mfgDay: new Date().getDate(),
    factoryCode: "A",
    serialNumber: "0001",
    recyclabilityPct: 95,
    lithiumPct: 6.5,
    cobaltPct: 0,
    nickelPct: 0,
    manganesePct: 0,
    carbonFootprintKgCo2: 85,
    vehicleId: "",
  });
  const [generatedBpan, setGeneratedBpan] = useState<string | null>(null);

  const mutation = trpc.bpan.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedBpan(data.bpan);
      toast.success(`Battery registered! BPAN: ${data.bpan}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const previewBpan = useMemo(() => {
    const MONTH_CODES = "ABCDEFGHIJKL";
    const DAY_CODES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567";
    const yearCode = String(form.mfgYear).slice(-1);
    const monthCode = MONTH_CODES[form.mfgMonth - 1] ?? "A";
    const dayCode = DAY_CODES[form.mfgDay - 1] ?? "A";
    return `${form.countryCode}${form.manufacturerId.padEnd(3, "_")}${form.capacityCode}${form.chemistryCode}${form.voltageCode}${form.cellOriginCode}${form.extinguisherClass}${yearCode}${monthCode}${dayCode}${form.factoryCode}${form.serialNumber}`;
  }, [form]);

  const canAdvance = () => {
    if (step === 1) return form.countryCode.length === 2 && form.manufacturerId.length === 3;
    if (step === 2) return form.capacityCode && form.chemistryCode && form.voltageCode;
    if (step === 3) return form.mfgYear >= 2020 && form.mfgMonth >= 1 && form.mfgDay >= 1 && form.serialNumber.length === 4;
    return true;
  };

  const handleSubmit = () => {
    if (form.manufacturerId.length !== 3) {
      toast.error("Manufacturer ID must be exactly 3 characters");
      setStep(1);
      return;
    }
    mutation.mutate(form);
  };

  /* ─── Success Screen ───────────────────────────────────────────────────── */
  if (generatedBpan) {
    return (
      <div className="p-6 max-w-lg mx-auto animate-fade-up">
        <div className="bg-card border border-primary/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Battery Registered!</h2>
          <p className="text-muted-foreground text-sm mb-6">Your battery has been assigned a Battery Pack Aadhaar Number</p>
          <div className="bg-secondary/50 rounded-xl p-4 mb-6">
            <div className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-widest">BPAN</div>
            <div className="font-mono text-xl font-bold text-primary tracking-widest">{generatedBpan}</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">19-character Battery Pack Aadhaar Number</div>
          </div>

          {/* Next steps */}
          <div className="text-left bg-secondary/30 rounded-xl p-4 mb-6 space-y-3">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Recommended Next Steps</div>
            {[
              { label: "View battery detail page", href: `/batteries/${generatedBpan}`, desc: "See full lifecycle view, telemetry, and health passport" },
              { label: "Connect an IoT device", href: "/device-provisioning", desc: "Register a gateway or BMS to start streaming telemetry" },
              { label: "Register warranty", href: "/warranty/register", desc: "Set up warranty coverage for this battery" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group">
                  <div>
                    <div className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-border text-xs"
              onClick={() => { navigator.clipboard.writeText(generatedBpan); toast.success("Copied!"); }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy BPAN
            </Button>
            <Link href={`/batteries/${generatedBpan}`}>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                <QrCode className="w-3.5 h-3.5 mr-1.5" /> View Battery
              </Button>
            </Link>
          </div>
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground text-xs" onClick={() => { setGeneratedBpan(null); setStep(1); }}>
            Register Another Battery
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Wizard Form ──────────────────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/batteries">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Register Battery</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Step {step} of 4 - {STEPS[step - 1].title}</p>
        </div>
      </div>

      {/* BPAN Preview */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Live BPAN Preview</div>
            <div className="font-mono text-lg font-bold text-primary tracking-widest">{previewBpan}</div>
          </div>
          <Battery className="w-8 h-8 text-primary/20" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BMI</div>
            <div className={`font-mono text-[10px] ${step === 1 ? "text-primary" : "text-chart-2"}`}>{previewBpan.slice(0, 5)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BDS</div>
            <div className={`font-mono text-[10px] ${step === 2 ? "text-primary" : "text-chart-3"}`}>{previewBpan.slice(5, 12)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BI</div>
            <div className={`font-mono text-[10px] ${step === 3 ? "text-primary" : "text-chart-4"}`}>{previewBpan.slice(12, 21)}</div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper current={step} />

      {/* Step 1: Manufacturer Identity */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Battery Manufacturer Identity (BMI)
          </h3>
          <p className="text-muted-foreground text-xs">Identifies the country and manufacturer. These 5 characters form the first segment of the BPAN.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Country Code (2 chars)</Label>
              <Input
                value={form.countryCode}
                onChange={(e) => set("countryCode", e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="IN"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">ISO 3166-1 alpha-2 code (e.g., IN, CN, US, DE)</div>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Manufacturer ID (3 chars)</Label>
              <Input
                value={form.manufacturerId}
                onChange={(e) => set("manufacturerId", e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="MH1"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">Unique 3-character manufacturer identifier</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Battery Design Specifications */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" /> Battery Design Specifications (BDS)
          </h3>
          <p className="text-muted-foreground text-xs">Technical specifications that define the battery's chemistry, capacity, voltage, cell origin, and fire safety class.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectField label="Capacity" value={form.capacityCode} onChange={(v) => set("capacityCode", v)} options={CAPACITY_OPTIONS} hint="Nominal energy capacity in kWh" />
            <SelectField label="Chemistry" value={form.chemistryCode} onChange={(v) => set("chemistryCode", v)} options={CHEMISTRY_OPTIONS} hint="Cell chemistry type" />
            <SelectField label="Voltage" value={form.voltageCode} onChange={(v) => set("voltageCode", v)} options={VOLTAGE_OPTIONS} hint="Nominal pack voltage" />
            <SelectField label="Cell Origin" value={form.cellOriginCode} onChange={(v) => set("cellOriginCode", v)} options={ORIGIN_OPTIONS} hint="Country where cells were manufactured" />
            <SelectField label="Extinguisher Class" value={form.extinguisherClass} onChange={(v) => set("extinguisherClass", v)} options={EXTINGUISHER_OPTIONS} hint="Fire extinguisher class required" />
          </div>
        </div>
      )}

      {/* Step 3: Battery Instance */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Battery Instance (BI)
          </h3>
          <p className="text-muted-foreground text-xs">Production date, factory code, and serial number uniquely identify this specific battery unit.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Year</Label>
              <Input
                type="number" min={2020} max={2035}
                value={form.mfgYear}
                onChange={(e) => set("mfgYear", parseInt(e.target.value) || 2025)}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Month</Label>
              <Input
                type="number" min={1} max={12}
                value={form.mfgMonth}
                onChange={(e) => set("mfgMonth", parseInt(e.target.value) || 1)}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Day</Label>
              <Input
                type="number" min={1} max={31}
                value={form.mfgDay}
                onChange={(e) => set("mfgDay", parseInt(e.target.value) || 1)}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Factory Code (1)</Label>
              <Input
                value={form.factoryCode}
                onChange={(e) => set("factoryCode", e.target.value.toUpperCase().slice(0, 1))}
                maxLength={1}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Serial Number (4 chars)</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => set("serialNumber", e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="0001"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">Unique within this factory + date combination</div>
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Vehicle ID (optional)</Label>
              <Input
                value={form.vehicleId}
                onChange={(e) => set("vehicleId", e.target.value)}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="MH01AB1234"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">Registration number if battery is installed in a vehicle</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Material Composition & Sustainability */}
      {step === 4 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" /> Material Composition & Sustainability
          </h3>
          <p className="text-muted-foreground text-xs">EU Battery Regulation requires disclosure of critical raw material percentages and carbon footprint data.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "recyclabilityPct", label: "Recyclability %", hint: "Target: ≥ 70% by 2030" },
              { key: "lithiumPct", label: "Lithium %", hint: "Typical: 5-7% for NMC" },
              { key: "cobaltPct", label: "Cobalt %", hint: "0% for LFP/LMO" },
              { key: "nickelPct", label: "Nickel %", hint: "0% for LFP" },
              { key: "manganesePct", label: "Manganese %", hint: "Higher in LMO/NMC" },
              { key: "carbonFootprintKgCo2", label: "Carbon Footprint (kg CO₂)", hint: "Per kWh of capacity" },
            ].map((field) => (
              <div key={field.key}>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">{field.label}</Label>
                <Input
                  type="number" step="0.1"
                  value={(form as any)[field.key]}
                  onChange={(e) => set(field.key, parseFloat(e.target.value) || 0)}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                />
                <div className="text-[9px] text-muted-foreground/50 mt-1">{field.hint}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          className="border-border"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <div className="flex gap-3">
          {step < 4 ? (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Next <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              disabled={mutation.isPending || !canAdvance()}
              onClick={handleSubmit}
            >
              {mutation.isPending ? "Registering..." : "Generate BPAN & Register"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
