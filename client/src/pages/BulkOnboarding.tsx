import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload, Battery, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2,
  Download, Shield, Zap, ArrowLeft, FileSpreadsheet, ListChecks,
} from "lucide-react";

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

interface BatteryEntry {
  countryCode: string;
  manufacturerId: string;
  capacityCode: string;
  chemistryCode: string;
  voltageCode: string;
  cellOriginCode: string;
  extinguisherClass: string;
  mfgYear: number;
  mfgMonth: number;
  mfgDay: number;
  factoryCode: string;
  serialNumber: string;
  vehicleId: string;
  currentSoh: string;
  cycleCount: string;
  status: string;
}

const defaultEntry = (): BatteryEntry => ({
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
  vehicleId: "",
  currentSoh: "100",
  cycleCount: "0",
  status: "operational",
});

type ImportResult = {
  success: boolean;
  jobId: number;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  generatedBpans: string[];
  errors: { row: number; error: string }[];
};

export default function BulkOnboarding() {
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [jobName, setJobName] = useState("");
  const [batteries, setBatteries] = useState<BatteryEntry[]>([defaultEntry()]);
  const [registerWarranty, setRegisterWarranty] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState(24);
  const [defaultCustomerName, setDefaultCustomerName] = useState("");
  const [defaultManufacturer, setDefaultManufacturer] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvText, setCsvText] = useState("");

  const bulkMutation = trpc.onboarding.bulkImport.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Onboarding complete: ${data.successCount} batteries registered`);
    },
    onError: (e) => toast.error(e.message),
  });

  const jobsQuery = trpc.onboarding.listJobs.useQuery({ limit: 10, offset: 0 });

  const addEntry = () => setBatteries(prev => [...prev, defaultEntry()]);
  const removeEntry = (idx: number) => setBatteries(prev => prev.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, key: keyof BatteryEntry, val: string | number) => {
    setBatteries(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  // Auto-increment serial numbers
  const autoIncrementSerials = () => {
    setBatteries(prev => prev.map((b, i) => ({
      ...b,
      serialNumber: String(i + 1).padStart(4, "0"),
    })));
    toast.success("Serial numbers auto-incremented");
  };

  // Apply same specs to all entries
  const applyFirstToAll = () => {
    if (batteries.length < 2) return;
    const first = batteries[0];
    setBatteries(prev => prev.map((b, i) => i === 0 ? b : {
      ...b,
      countryCode: first.countryCode,
      manufacturerId: first.manufacturerId,
      capacityCode: first.capacityCode,
      chemistryCode: first.chemistryCode,
      voltageCode: first.voltageCode,
      cellOriginCode: first.cellOriginCode,
      extinguisherClass: first.extinguisherClass,
      mfgYear: first.mfgYear,
      mfgMonth: first.mfgMonth,
      mfgDay: first.mfgDay,
      factoryCode: first.factoryCode,
    }));
    toast.success("Applied first battery specs to all entries");
  };

  // Parse CSV
  const parseCsv = () => {
    if (!csvText.trim()) { toast.error("Paste CSV data first"); return; }
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const entries: BatteryEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim());
      const get = (key: string) => vals[headers.indexOf(key)] ?? "";
      entries.push({
        countryCode: get("countrycode") || "IN",
        manufacturerId: get("manufacturerid") || "MH1",
        capacityCode: get("capacitycode") || "C3",
        chemistryCode: get("chemistrycode") || "F",
        voltageCode: get("voltagecode") || "KO",
        cellOriginCode: get("cellorigincode") || "IN",
        extinguisherClass: get("extinguisherclass") || "D",
        mfgYear: parseInt(get("mfgyear")) || 2025,
        mfgMonth: parseInt(get("mfgmonth")) || 3,
        mfgDay: parseInt(get("mfgday")) || 15,
        factoryCode: get("factorycode") || "A",
        serialNumber: get("serialnumber") || String(i).padStart(4, "0"),
        vehicleId: get("vehicleid") || "",
        currentSoh: get("currentsoh") || "100",
        cycleCount: get("cyclecount") || "0",
        status: get("status") || "operational",
      });
    }
    setBatteries(entries);
    toast.success(`Parsed ${entries.length} batteries from CSV`);
  };

  const handleSubmit = () => {
    if (!jobName.trim()) { toast.error("Enter a job name"); return; }
    if (batteries.length === 0) { toast.error("Add at least one battery"); return; }

    bulkMutation.mutate({
      jobName,
      batteries: batteries.map(b => ({
        countryCode: b.countryCode,
        manufacturerId: b.manufacturerId,
        capacityCode: b.capacityCode,
        chemistryCode: b.chemistryCode,
        voltageCode: b.voltageCode,
        cellOriginCode: b.cellOriginCode,
        extinguisherClass: b.extinguisherClass,
        mfgYear: b.mfgYear,
        mfgMonth: b.mfgMonth,
        mfgDay: b.mfgDay,
        factoryCode: b.factoryCode,
        serialNumber: b.serialNumber,
        vehicleId: b.vehicleId || undefined,
        currentSoh: b.currentSoh ? Number(b.currentSoh) : undefined,
        cycleCount: b.cycleCount ? Number(b.cycleCount) : undefined,
        status: b.status as any,
      })),
      registerWarranty,
      defaultWarrantyMonths: registerWarranty ? warrantyMonths : undefined,
      defaultCustomerName: defaultCustomerName || undefined,
      defaultManufacturer: defaultManufacturer || undefined,
    });
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = "countryCode,manufacturerId,capacityCode,chemistryCode,voltageCode,cellOriginCode,extinguisherClass,mfgYear,mfgMonth,mfgDay,factoryCode,serialNumber,vehicleId,currentSoh,cycleCount,status";
    const example = "IN,MH1,C3,F,KO,IN,D,2025,3,15,A,0001,,100,0,operational";
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "battery_onboarding_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Result view
  if (result) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-up">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result.failureCount === 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
              {result.failureCount === 0
                ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                : <AlertTriangle className="w-8 h-8 text-amber-400" />
              }
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">Onboarding Complete</h2>
            <p className="text-sm text-muted-foreground">Job #{result.jobId} processed {result.totalProcessed} batteries</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{result.successCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Success</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{result.failureCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Failed</div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{result.generatedBpans.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">BPANs</div>
            </div>
          </div>

          {/* Generated BPANs */}
          {result.generatedBpans.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-2">Generated BPANs</h3>
              <div className="bg-secondary/30 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                {result.generatedBpans.map((bpan, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <Link href={`/batteries/${bpan}`}>
                      <span className="font-mono text-primary hover:underline cursor-pointer">{bpan}</span>
                    </Link>
                    <button onClick={() => { navigator.clipboard.writeText(bpan); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground">Copy</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-red-400 mb-2">Errors</h3>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-400">
                    <span className="font-mono">Row {err.row}:</span> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 text-xs" onClick={() => { setResult(null); setBatteries([defaultEntry()]); setJobName(""); }}>
              Start New Batch
            </Button>
            <Link href="/batteries">
              <Button className="flex-1 bg-primary text-primary-foreground text-xs">View Registry</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/batteries">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" /> Bulk Battery Onboarding
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Onboard existing batteries with auto-BPAN generation and optional warranty registration</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${mode === "manual" ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/30 border-border text-muted-foreground"}`}
        >
          <ListChecks className="w-4 h-4" /> Manual Entry
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${mode === "csv" ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/30 border-border text-muted-foreground"}`}
        >
          <FileSpreadsheet className="w-4 h-4" /> CSV Import
        </button>
      </div>

      {/* Job Name */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Job Name *</Label>
        <Input value={jobName} onChange={(e) => setJobName(e.target.value)} className="bg-secondary/30 border-border text-sm h-10" placeholder="e.g., March 2025 Factory Batch" />
      </div>

      {/* CSV Mode */}
      {mode === "csv" && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Paste CSV Data</h3>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={downloadTemplate}>
              <Download className="w-3 h-3 mr-1" /> Download Template
            </Button>
          </div>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="bg-secondary/30 border-border text-xs font-mono min-h-[120px]"
            placeholder="countryCode,manufacturerId,capacityCode,chemistryCode,voltageCode,cellOriginCode,extinguisherClass,mfgYear,mfgMonth,mfgDay,factoryCode,serialNumber,vehicleId,currentSoh,cycleCount,status&#10;IN,MH1,C3,F,KO,IN,D,2025,3,15,A,0001,,100,0,operational"
          />
          <Button className="mt-3 text-xs" size="sm" onClick={parseCsv}>
            <Zap className="w-3 h-3 mr-1" /> Parse CSV → {batteries.length} entries
          </Button>
        </div>
      )}

      {/* Manual Mode — Battery Entries */}
      {mode === "manual" && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{batteries.length} Batter{batteries.length === 1 ? "y" : "ies"}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={applyFirstToAll}>Apply #1 to All</Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={autoIncrementSerials}>Auto-Increment Serials</Button>
              <Button size="sm" className="text-xs h-7 bg-primary text-primary-foreground" onClick={addEntry}>
                <Plus className="w-3 h-3 mr-1" /> Add Battery
              </Button>
            </div>
          </div>

          {batteries.map((bat, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground">Battery #{idx + 1}</span>
                {batteries.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => removeEntry(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Country</Label>
                  <Input value={bat.countryCode} onChange={(e) => updateEntry(idx, "countryCode", e.target.value.toUpperCase().slice(0, 2))} className="bg-secondary/30 border-border text-xs h-8 font-mono" maxLength={2} />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Mfg ID</Label>
                  <Input value={bat.manufacturerId} onChange={(e) => updateEntry(idx, "manufacturerId", e.target.value.toUpperCase().slice(0, 3))} className="bg-secondary/30 border-border text-xs h-8 font-mono" maxLength={3} />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Capacity</Label>
                  <Select value={bat.capacityCode} onValueChange={(v) => updateEntry(idx, "capacityCode", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-48">
                      {CAPACITY_OPTIONS.map(o => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Chemistry</Label>
                  <Select value={bat.chemistryCode} onValueChange={(v) => updateEntry(idx, "chemistryCode", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CHEMISTRY_OPTIONS.map(o => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Voltage</Label>
                  <Select value={bat.voltageCode} onValueChange={(v) => updateEntry(idx, "voltageCode", v)}>
                    <SelectTrigger className="bg-secondary/30 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-48">
                      {VOLTAGE_OPTIONS.map(o => <SelectItem key={o.code} value={o.code}>{o.code} – {o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Serial #</Label>
                  <Input value={bat.serialNumber} onChange={(e) => updateEntry(idx, "serialNumber", e.target.value.slice(0, 4))} className="bg-secondary/30 border-border text-xs h-8 font-mono" maxLength={4} />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Mfg Year</Label>
                  <Input type="number" value={bat.mfgYear} onChange={(e) => updateEntry(idx, "mfgYear", parseInt(e.target.value) || 2025)} className="bg-secondary/30 border-border text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Month</Label>
                  <Input type="number" value={bat.mfgMonth} onChange={(e) => updateEntry(idx, "mfgMonth", parseInt(e.target.value) || 1)} className="bg-secondary/30 border-border text-xs h-8" min={1} max={12} />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Day</Label>
                  <Input type="number" value={bat.mfgDay} onChange={(e) => updateEntry(idx, "mfgDay", parseInt(e.target.value) || 1)} className="bg-secondary/30 border-border text-xs h-8" min={1} max={31} />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">SOH %</Label>
                  <Input value={bat.currentSoh} onChange={(e) => updateEntry(idx, "currentSoh", e.target.value)} className="bg-secondary/30 border-border text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Cycles</Label>
                  <Input value={bat.cycleCount} onChange={(e) => updateEntry(idx, "cycleCount", e.target.value)} className="bg-secondary/30 border-border text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Vehicle ID</Label>
                  <Input value={bat.vehicleId} onChange={(e) => updateEntry(idx, "vehicleId", e.target.value)} className="bg-secondary/30 border-border text-xs h-8" placeholder="Optional" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warranty Options */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold">Auto-Register Warranty</h3>
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={registerWarranty}
              onChange={(e) => setRegisterWarranty(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Enable</span>
          </label>
        </div>
        {registerWarranty && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up">
            <div>
              <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Warranty Term (months)</Label>
              <Input type="number" value={warrantyMonths} onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 24)} className="bg-secondary/30 border-border text-sm h-9" min={1} max={120} />
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Default Customer Name</Label>
              <Input value={defaultCustomerName} onChange={(e) => setDefaultCustomerName(e.target.value)} className="bg-secondary/30 border-border text-sm h-9" placeholder="Bulk Import Customer" />
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground uppercase mb-1 block">Manufacturer</Label>
              <Input value={defaultManufacturer} onChange={(e) => setDefaultManufacturer(e.target.value)} className="bg-secondary/30 border-border text-sm h-9" placeholder="OEM Name" />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {batteries.length} batter{batteries.length === 1 ? "y" : "ies"} ready
          {registerWarranty && ` · ${warrantyMonths}mo warranty`}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={bulkMutation.isPending}
          className="bg-primary text-primary-foreground px-8"
        >
          {bulkMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" /> Onboard {batteries.length} Batteries
            </>
          )}
        </Button>
      </div>

      {/* Previous Jobs */}
      {jobsQuery.data && jobsQuery.data.jobs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold mb-3">Previous Onboarding Jobs</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Job</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Success</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Failed</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {jobsQuery.data.jobs.map((j: any) => (
                  <tr key={j.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs">{j.jobName}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${j.status === "completed" ? "text-emerald-400 bg-emerald-500/10" : j.status === "failed" ? "text-red-400 bg-red-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">{j.totalRecords}</td>
                    <td className="px-4 py-2 text-xs text-emerald-400">{j.successCount}</td>
                    <td className="px-4 py-2 text-xs text-red-400">{j.failureCount}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
