import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Battery, CheckCircle2, Copy, QrCode } from "lucide-react";

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

export default function BpanRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    countryCode: "IN",
    manufacturerId: "MH1",
    capacityCode: "C3",
    chemistryCode: "F",
    voltageCode: "KO",
    cellOriginCode: "IN",
    extinguisherClass: "D",
    mfgYear: 2025,
    mfgMonth: 3,
    mfgDay: 15,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const previewBpan = () => {
    const MONTH_CODES = "ABCDEFGHIJKL";
    const DAY_CODES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567";
    const yearCode = String(form.mfgYear).slice(-1);
    const monthCode = MONTH_CODES[form.mfgMonth - 1] ?? "A";
    const dayCode = DAY_CODES[form.mfgDay - 1] ?? "A";
    return `${form.countryCode}${form.manufacturerId}${form.capacityCode}${form.chemistryCode}${form.voltageCode}${form.cellOriginCode}${form.extinguisherClass}${yearCode}${monthCode}${dayCode}${form.factoryCode}${form.serialNumber}`;
  };

  const preview = previewBpan();

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
            <div className="font-mono text-[9px] text-muted-foreground mt-1">21-character Battery Pack Aadhaar Number</div>
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
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground text-xs" onClick={() => setGeneratedBpan(null)}>
            Register Another Battery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/batteries">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Register Battery</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate a Battery Pack Aadhaar Number (BPAN)</p>
        </div>
      </div>

      {/* BPAN Preview */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 mb-6">
        <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Live BPAN Preview</div>
        <div className="font-mono text-lg font-bold text-primary tracking-widest">{preview}</div>
        <div className="flex gap-4 mt-2">
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BMI</div>
            <div className="font-mono text-[10px] text-chart-2">{preview.slice(0, 5)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BDS</div>
            <div className="font-mono text-[10px] text-chart-3">{preview.slice(5, 12)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[8px] text-muted-foreground/60">BI</div>
            <div className="font-mono text-[10px] text-chart-4">{preview.slice(12, 21)}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Battery Manufacturer Identity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Battery className="w-4 h-4 text-primary" /> Battery Manufacturer Identity (BMI)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Country Code (2)</Label>
              <Input
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase().slice(0, 2) })}
                maxLength={2}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="IN"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Manufacturer ID (3)</Label>
              <Input
                value={form.manufacturerId}
                onChange={(e) => setForm({ ...form, manufacturerId: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="MH1"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Battery Design Specifications */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display text-sm font-bold mb-4">Battery Design Specifications (BDS)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Capacity</Label>
              <Select value={form.capacityCode} onValueChange={(v) => setForm({ ...form, capacityCode: v })}>
                <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CAPACITY_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Chemistry</Label>
              <Select value={form.chemistryCode} onValueChange={(v) => setForm({ ...form, chemistryCode: v })}>
                <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CHEMISTRY_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Voltage</Label>
              <Select value={form.voltageCode} onValueChange={(v) => setForm({ ...form, voltageCode: v })}>
                <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {VOLTAGE_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Cell Origin</Label>
              <Select value={form.cellOriginCode} onValueChange={(v) => setForm({ ...form, cellOriginCode: v })}>
                <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ORIGIN_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Extinguisher Class</Label>
              <Select value={form.extinguisherClass} onValueChange={(v) => setForm({ ...form, extinguisherClass: v })}>
                <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {EXTINGUISHER_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 3: Battery Instance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display text-sm font-bold mb-4">Battery Instance (BI)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Year</Label>
              <Input
                type="number" min={2020} max={2035}
                value={form.mfgYear}
                onChange={(e) => setForm({ ...form, mfgYear: parseInt(e.target.value) })}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Month</Label>
              <Input
                type="number" min={1} max={12}
                value={form.mfgMonth}
                onChange={(e) => setForm({ ...form, mfgMonth: parseInt(e.target.value) })}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Mfg Day</Label>
              <Input
                type="number" min={1} max={31}
                value={form.mfgDay}
                onChange={(e) => setForm({ ...form, mfgDay: parseInt(e.target.value) })}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Factory Code (1)</Label>
              <Input
                value={form.factoryCode}
                onChange={(e) => setForm({ ...form, factoryCode: e.target.value.toUpperCase().slice(0, 1) })}
                maxLength={1}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
              />
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Serial Number (4)</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value.toUpperCase().slice(0, 4) })}
                maxLength={4}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="0001"
              />
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Vehicle ID (optional)</Label>
              <Input
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="bg-secondary/30 border-border font-mono text-sm h-9"
                placeholder="MH01AB1234"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Material Composition */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display text-sm font-bold mb-4">Material Composition & Sustainability</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "recyclabilityPct", label: "Recyclability %" },
              { key: "lithiumPct", label: "Lithium %" },
              { key: "cobaltPct", label: "Cobalt %" },
              { key: "nickelPct", label: "Nickel %" },
              { key: "manganesePct", label: "Manganese %" },
              { key: "carbonFootprintKgCo2", label: "Carbon Footprint (kg CO₂)" },
            ].map((field) => (
              <div key={field.key}>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">{field.label}</Label>
                <Input
                  type="number" step="0.1"
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: parseFloat(e.target.value) })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Registering Battery..." : "Generate BPAN & Register Battery"}
        </Button>
      </form>
    </div>
  );
}
