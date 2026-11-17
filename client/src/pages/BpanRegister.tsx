import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import {
  BPAN_LOCAL_PILOT_LABEL, BPAN_REGISTRATION_BLOCKED_REASON, BPAN_DRAFT_FORMAT,
  BPAN_DRAFT_ALPHABET_CONFLICT,
  bpanPilotRegistrationSchema, createLocalBpanPreview, draftChemistryOptions,
  draftCountryOptions, draftExtinguisherOptions, encodeDraftParameter,
} from "@shared/bpanContract";
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
const CAPACITY_OPTIONS = [1, 2, 3, 5, 10, 20, 30, 40, 60, 100].map(value => ({ code: encodeDraftParameter(value), label: `${value} kWh (draft table)` }));
const CHEMISTRY_OPTIONS = [...draftChemistryOptions];
const VOLTAGE_OPTIONS = [48, 60, 72, 96, 120, 307, 400, 600, 800].map(value => ({ code: encodeDraftParameter(value), label: `${value} V (draft table)` }));
const ORIGIN_OPTIONS = draftCountryOptions;
const EXTINGUISHER_OPTIONS = [...draftExtinguisherOptions];

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
  usePageTitle("Local Battery Pilot Preview");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    countryCode: "MY",
    manufacturerId: "",
    capacityCode: encodeDraftParameter(30),
    chemistryCode: "F",
    voltageCode: encodeDraftParameter(307),
    cellOriginCode: "KL",
    extinguisherClass: "D",
    mfgYear: new Date().getFullYear(),
    mfgMonth: new Date().getMonth() + 1,
    mfgDay: new Date().getDate(),
    factoryCode: "1",
    serialNumber: "0001",
    recyclabilityPct: undefined as number | undefined,
    lithiumPct: undefined as number | undefined,
    cobaltPct: undefined as number | undefined,
    nickelPct: undefined as number | undefined,
    manganesePct: undefined as number | undefined,
    carbonFootprintKgCo2: undefined as number | undefined,
  });
  const [generatedBpan, setGeneratedBpan] = useState<string | null>(null);

  const set = (key: string, value: string | number | undefined) => setForm((f) => ({ ...f, [key]: value }));

  const previewBpan = useMemo(() => {
    const parsed = bpanPilotRegistrationSchema.safeParse(form);
    return parsed.success ? createLocalBpanPreview(parsed.data).bpan : "Complete valid pilot fields";
  }, [form]);

  const canAdvance = () => {
    if (step === 1) return draftCountryOptions.some(option => option.code === form.countryCode) && /^[A-HJ-NP-Z0-9]{3}$/.test(form.manufacturerId);
    if (step === 2) return form.capacityCode && form.chemistryCode && form.voltageCode;
    return bpanPilotRegistrationSchema.safeParse(form).success;
  };

  const handleSubmit = () => {
    const parsed = bpanPilotRegistrationSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid pilot metadata");
      return;
    }
    setGeneratedBpan(createLocalBpanPreview(parsed.data).bpan);
    toast.success("Offline preview created. No battery or customer record was registered.");
  };

  /* ─── Success Screen ───────────────────────────────────────────────────── */
  if (generatedBpan) {
    return (
      <div className="p-6 max-w-lg mx-auto animate-fade-up">
        <div className="bg-card border border-primary/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Local Pilot Preview Only</h2>
          <p className="text-muted-foreground text-sm mb-6">{BPAN_LOCAL_PILOT_LABEL}. This preview is not saved, allocated, or evidence of battery registration.</p>
          <div className="bg-secondary/50 rounded-xl p-4 mb-6">
            <div className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-widest">Draft-style preview</div>
            <div className="font-mono text-xl font-bold text-primary tracking-widest">{generatedBpan}</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">{BPAN_DRAFT_FORMAT} · 21 characters · no official assignment</div>
          </div>
          <p className="text-xs text-muted-foreground mb-6">{BPAN_DRAFT_ALPHABET_CONFLICT}</p>

          {/* Next steps */}
          <div className="text-left bg-secondary/30 rounded-xl p-4 mb-6 space-y-3">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Recommended Next Steps</div>
            {[
              { label: "Return to existing local assets", href: "/batteries", desc: "Existing identities are retained; this preview is not a battery record" },
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
              onClick={() => { navigator.clipboard.writeText(`${BPAN_LOCAL_PILOT_LABEL}\n${BPAN_DRAFT_FORMAT}\n${BPAN_DRAFT_ALPHABET_CONFLICT}\n${generatedBpan}`).then(() => toast.success("Labelled preview copied"), () => toast.error("Clipboard unavailable")); }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Labelled Preview
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground text-xs" onClick={() => { setGeneratedBpan(null); setStep(1); }}>
            Preview Another Local Sample
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
          <h1 className="font-display text-2xl font-bold">Local Battery Pilot Preview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Step {step} of 4 - {STEPS[step - 1].title}</p>
        </div>
      </div>
      <div role="note" className="bg-chart-4/10 border border-chart-4/30 rounded-xl p-4 mb-6 text-sm">
        {BPAN_LOCAL_PILOT_LABEL}. {BPAN_REGISTRATION_BLOCKED_REASON} The supplied guideline is Draft and specifies 21 characters; legacy 19-character assets remain unchanged. Default values are examples, not measured pack specifications. Manufacturer serials must be recorded separately in the pilot worksheet.
        <p className="mt-2">{BPAN_DRAFT_ALPHABET_CONFLICT}</p>
      </div>

      {/* BPAN Preview */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Offline Draft-Style Preview · Not Allocated</div>
            <div className="font-mono text-lg font-bold text-primary tracking-widest">{previewBpan}</div>
          </div>
          <Battery className="w-8 h-8 text-primary/20" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BMI</div>
            <div className={`font-mono text-[10px] ${step === 1 ? "text-primary" : "text-chart-2"}`}>{previewBpan.length === 21 ? previewBpan.slice(0, 5) : "—"}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BDS</div>
            <div className={`font-mono text-[10px] ${step === 2 ? "text-primary" : "text-chart-3"}`}>{previewBpan.length === 21 ? previewBpan.slice(5, 13) : "—"}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BI</div>
            <div className={`font-mono text-[10px] ${step === 3 ? "text-primary" : "text-chart-4"}`}>{previewBpan.length === 21 ? previewBpan.slice(13, 21) : "—"}</div>
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
                placeholder="MY"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">Draft Table 16 pilot subset, not ISO alpha-2; allocation unverified</div>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Manufacturer ID (3 chars)</Label>
              <Input
                value={form.manufacturerId}
                onChange={(e) => set("manufacturerId", e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="008 (draft example only)"
              />
              <div className="text-[9px] text-muted-foreground/50 mt-1">Preview metadata only; entering a code does not allocate a manufacturer ID</div>
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
          <p className="text-muted-foreground text-xs">Draft metadata only. Extinguisher codes are not emergency instructions; follow a qualified site safety plan and manufacturer documentation.</p>
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
                type="number" min={2025} max={2057}
                value={form.mfgYear}
                onChange={(e) => set("mfgYear", Number(e.target.value))}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Month</Label>
              <Input
                type="number" min={1} max={12}
                value={form.mfgMonth}
                onChange={(e) => set("mfgMonth", Number(e.target.value))}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Day</Label>
              <Input
                type="number" min={1} max={31}
                value={form.mfgDay}
                onChange={(e) => set("mfgDay", Number(e.target.value))}
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
          </div>
        </div>
      )}

      {/* Step 4: Material Composition & Sustainability */}
      {step === 4 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" /> Material Composition & Sustainability
          </h3>
          <p className="text-muted-foreground text-xs">Optional evidence-backed pilot metadata. Blank means unknown; explicit zero is preserved. No compliance assessment is performed.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "recyclabilityPct", label: "Recyclability %", hint: "0–100; evidence required" },
              { key: "lithiumPct", label: "Lithium %", hint: "0–100; evidence required" },
              { key: "cobaltPct", label: "Cobalt %", hint: "0–100; evidence required" },
              { key: "nickelPct", label: "Nickel %", hint: "0–100; evidence required" },
              { key: "manganesePct", label: "Manganese %", hint: "0–100; evidence required" },
              { key: "carbonFootprintKgCo2", label: "Total footprint (kg CO₂e)", hint: "Pack total, not per kWh; source required" },
            ].map((field) => (
              <div key={field.key}>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">{field.label}</Label>
                <Input
                  type="number" step="0.1" min={0} max={field.key === "carbonFootprintKgCo2" ? undefined : 100}
                  value={form[field.key as keyof typeof form] ?? ""}
                  onChange={(e) => set(field.key, e.target.value === "" ? undefined : Number(e.target.value))}
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
              disabled={!canAdvance()}
              onClick={handleSubmit}
            >
              Create Offline Preview — No Registration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
