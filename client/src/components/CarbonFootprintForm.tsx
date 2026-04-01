/**
 * CarbonFootprintForm.tsx
 * EU Battery Regulation 2023/1542 — Carbon Footprint Declaration Form
 *
 * Features:
 * - 4 lifecycle stage inputs (raw material, production, distribution, end-of-life)
 * - Auto-sum to total with live update
 * - Real-time A–E performance class badge (recalculates on every keystroke)
 * - Visual class bar showing where this battery sits vs. EU reference
 * - Read-only passport view when a declaration already exists
 * - Edit mode toggle for updating an existing declaration
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Leaf, Edit2, CheckCircle2, AlertCircle, Info, ChevronRight } from "lucide-react";
import {
  calculatePerformanceClass,
  CLASS_LABELS,
  CLASS_COLORS,
  LIFECYCLE_STAGES,
  getThresholds,
  getReferenceIntensity,
  type PerformanceClass,
} from "../../../shared/carbonClass";

interface CarbonDeclaration {
  id: number;
  bpan: string;
  batteryId: number;
  totalKgCo2e: string;
  rawMaterialKgCo2e: string | null;
  productionKgCo2e: string | null;
  distributionKgCo2e: string | null;
  endOfLifeKgCo2e: string | null;
  performanceClass: string | null;
  methodology: string;
  certifyingBody: string | null;
  declaredById: number;
  declaredAt: Date;
  createdAt: Date;
}

interface Props {
  bpan: string;
  batteryId: number;
  capacityKwh: number;
  chemistry: string;
  onSaved?: () => void;
}

interface StageValues {
  rawMaterialKgCo2e: string;
  productionKgCo2e: string;
  distributionKgCo2e: string;
  endOfLifeKgCo2e: string;
}

const METHODOLOGY_OPTIONS = [
  { value: "GHG_PROTOCOL", label: "GHG Protocol" },
  { value: "ISO_14067",    label: "ISO 14067" },
  { value: "EU_PEF",       label: "EU PEF" },
  { value: "GBA",          label: "GBA Battery Passport" },
] as const;

// ─── Performance Class Badge ──────────────────────────────────────────────────
function ClassBadge({ cls }: { cls: PerformanceClass }) {
  const c = CLASS_COLORS[cls];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold font-mono ${c.bg} ${c.text} ${c.border}`}>
      {cls}
      <span className="font-sans font-normal text-xs opacity-80">{CLASS_LABELS[cls]}</span>
    </span>
  );
}

// ─── Performance Class Bar ────────────────────────────────────────────────────
function ClassBar({ intensity, chemistry }: { intensity: number; chemistry: string }) {
  const thresholds = getThresholds(chemistry);
  const reference = getReferenceIntensity(chemistry);
  const maxBar = thresholds.D * 1.4; // bar ends at 140% of Class D threshold

  const segments = [
    { cls: "A" as PerformanceClass, max: thresholds.A,  color: "bg-emerald-500" },
    { cls: "B" as PerformanceClass, max: thresholds.B,  color: "bg-green-500"   },
    { cls: "C" as PerformanceClass, max: thresholds.C,  color: "bg-yellow-500"  },
    { cls: "D" as PerformanceClass, max: thresholds.D,  color: "bg-orange-500"  },
    { cls: "E" as PerformanceClass, max: maxBar,         color: "bg-red-500"     },
  ];

  const markerPct = Math.min((intensity / maxBar) * 100, 100);
  const refPct    = Math.min((reference / maxBar) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Carbon Intensity vs. EU Reference</span>
        <span className="font-mono text-xs text-muted-foreground">{intensity > 0 ? `${intensity.toFixed(1)} kg CO₂e/kWh` : "—"}</span>
      </div>
      {/* Segmented bar */}
      <div className="relative h-4 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => {
          const prevMax = i === 0 ? 0 : segments[i - 1].max;
          const segWidth = ((seg.max - prevMax) / maxBar) * 100;
          return (
            <div
              key={seg.cls}
              className={`${seg.color} opacity-30 flex items-center justify-center`}
              style={{ width: `${segWidth}%` }}
            >
              <span className="font-mono text-[8px] font-bold text-white">{seg.cls}</span>
            </div>
          );
        })}
        {/* EU reference marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/50"
          style={{ left: `${refPct}%` }}
          title={`EU reference: ${reference.toFixed(0)} kg CO₂e/kWh`}
        />
        {/* This battery marker */}
        {intensity > 0 && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg transition-all duration-300"
            style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[9px] text-muted-foreground/60">
        <span>0</span>
        <span className="text-white/40">EU ref: {reference.toFixed(0)}</span>
        <span>{maxBar.toFixed(0)}+</span>
      </div>
    </div>
  );
}

// ─── Read-only Declaration View ───────────────────────────────────────────────
function DeclarationView({
  declaration,
  capacityKwh,
  chemistry,
  onEdit,
}: {
  declaration: CarbonDeclaration;
  capacityKwh: number;
  chemistry: string;
  onEdit: () => void;
}) {
  if (!declaration) return null;
  const total = Number(declaration.totalKgCo2e);
  const intensity = capacityKwh > 0 ? total / capacityKwh : 0;
  const cls = (declaration.performanceClass ?? calculatePerformanceClass(total, capacityKwh, chemistry)) as PerformanceClass;

  return (
    <div className="space-y-5">
      {/* Class summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Performance Class</div>
            <ClassBadge cls={cls} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Total Footprint</div>
          <div className="font-display text-2xl font-bold text-foreground">{total.toFixed(1)}</div>
          <div className="font-mono text-[10px] text-muted-foreground">kg CO₂e</div>
        </div>
      </div>

      {/* Class bar */}
      <ClassBar intensity={intensity} chemistry={chemistry} />

      {/* Stage breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {LIFECYCLE_STAGES.map((stage) => {
          const val = Number((declaration as any)[stage.key] ?? 0);
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={stage.key} className="bg-secondary/20 rounded-lg p-3 space-y-1">
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{stage.shortLabel}</div>
              <div className="font-display text-base font-bold">{val > 0 ? val.toFixed(1) : "—"}</div>
              <div className="font-mono text-[9px] text-muted-foreground">kg CO₂e · {pct.toFixed(0)}%</div>
              <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] text-muted-foreground border-t border-border pt-3">
        <span>Methodology: <span className="text-foreground/70">{declaration.methodology}</span></span>
        {declaration.certifyingBody && (
          <span>Certified by: <span className="text-foreground/70">{declaration.certifyingBody}</span></span>
        )}
        <span>Declared: <span className="text-foreground/70">{new Date(declaration.declaredAt).toLocaleDateString()}</span></span>
      </div>

      <Button variant="outline" size="sm" className="border-border h-8 text-xs" onClick={onEdit}>
        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Update Declaration
      </Button>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function CarbonFootprintForm({ bpan, batteryId, capacityKwh, chemistry, onSaved }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [methodology, setMethodology] = useState<"GHG_PROTOCOL" | "ISO_14067" | "EU_PEF" | "GBA">("GHG_PROTOCOL");
  const [certifyingBody, setCertifyingBody] = useState("");
  const [stages, setStages] = useState<StageValues>({
    rawMaterialKgCo2e: "",
    productionKgCo2e: "",
    distributionKgCo2e: "",
    endOfLifeKgCo2e: "",
  });

  const { data: existing, refetch } = trpc.regulatory.getCarbonFootprintByBpan.useQuery(
    { bpan },
    { enabled: !!bpan }
  );

  const declareMutation = trpc.regulatory.declareCarbonFootprint.useMutation({
    onSuccess: () => {
      toast.success("Carbon footprint declaration saved", {
        description: `Performance class ${computedClass} assigned to ${bpan}`,
      });
      setEditMode(false);
      refetch();
      onSaved?.();
    },
    onError: (e) => toast.error("Failed to save declaration", { description: e.message }),
  });

  // ── Live calculations ──────────────────────────────────────────────────────
  const stageValues = useMemo(() => ({
    rawMaterial:   parseFloat(stages.rawMaterialKgCo2e)   || 0,
    production:    parseFloat(stages.productionKgCo2e)    || 0,
    distribution:  parseFloat(stages.distributionKgCo2e)  || 0,
    endOfLife:     parseFloat(stages.endOfLifeKgCo2e)     || 0,
  }), [stages]);

  const total = useMemo(
    () => stageValues.rawMaterial + stageValues.production + stageValues.distribution + stageValues.endOfLife,
    [stageValues]
  );

  const computedClass = useMemo(
    () => calculatePerformanceClass(total, capacityKwh, chemistry),
    [total, capacityKwh, chemistry]
  );

  const intensity = capacityKwh > 0 ? total / capacityKwh : 0;

  // ── Prefill form from existing declaration ─────────────────────────────────
  const startEdit = () => {
    if (existing) {
      setStages({
        rawMaterialKgCo2e:   existing.rawMaterialKgCo2e   ? String(Number(existing.rawMaterialKgCo2e))   : "",
        productionKgCo2e:    existing.productionKgCo2e    ? String(Number(existing.productionKgCo2e))    : "",
        distributionKgCo2e:  existing.distributionKgCo2e  ? String(Number(existing.distributionKgCo2e))  : "",
        endOfLifeKgCo2e:     existing.endOfLifeKgCo2e     ? String(Number(existing.endOfLifeKgCo2e))     : "",
      });
      setMethodology((existing.methodology as any) ?? "GHG_PROTOCOL");
      setCertifyingBody(existing.certifyingBody ?? "");
    }
    setEditMode(true);
  };

  const handleSubmit = () => {
    if (total <= 0) {
      toast.error("Total carbon footprint must be greater than 0");
      return;
    }
    declareMutation.mutate({
      batteryId,
      bpan,
      totalKgCo2e: total,
      rawMaterialKgCo2e:  stageValues.rawMaterial  > 0 ? stageValues.rawMaterial  : undefined,
      productionKgCo2e:   stageValues.production   > 0 ? stageValues.production   : undefined,
      distributionKgCo2e: stageValues.distribution > 0 ? stageValues.distribution : undefined,
      endOfLifeKgCo2e:    stageValues.endOfLife    > 0 ? stageValues.endOfLife    : undefined,
      performanceClass: computedClass,
      methodology,
      certifyingBody: certifyingBody.trim() || undefined,
    });
  };

  // ── Render: read-only view ─────────────────────────────────────────────────
  if (existing && !editMode) {
    return (
      <DeclarationView
        declaration={existing}
        capacityKwh={capacityKwh}
        chemistry={chemistry}
        onEdit={startEdit}
      />
    );
  }

  // ── Render: form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Live class preview */}
      <div className="bg-secondary/20 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Live Performance Class</div>
            {total > 0 ? (
              <ClassBadge cls={computedClass} />
            ) : (
              <span className="font-mono text-sm text-muted-foreground">Enter values below to calculate</span>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Total</div>
            <div className={`font-display text-2xl font-bold transition-colors ${total > 0 ? CLASS_COLORS[computedClass].text : "text-muted-foreground"}`}>
              {total > 0 ? total.toFixed(1) : "0.0"}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">kg CO₂e</div>
          </div>
        </div>
        {total > 0 && <ClassBar intensity={intensity} chemistry={chemistry} />}
      </div>

      {/* Info callout */}
      <div className="flex gap-2.5 p-3 bg-primary/5 border border-primary/15 rounded-lg">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          EU Battery Regulation requires carbon footprint declarations for EV batteries ≥ 2 kWh from Feb 2027.
          Classes are calculated per kg CO₂e per kWh of usable capacity using {chemistry}-specific thresholds.
        </p>
      </div>

      {/* Stage inputs */}
      <div className="space-y-3">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Lifecycle Stages — EU Annex II
        </div>
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const val = parseFloat((stages as any)[stage.key]) || 0;
          const pct = total > 0 ? (val / total) * 100 : stage.typicalShare * 100;
          return (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={stage.key} className="font-mono text-xs text-foreground/80">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {stage.shortLabel}
                  <span className="ml-2 text-[9px] text-muted-foreground/60">{stage.euStage}</span>
                </Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {val > 0 ? `${pct.toFixed(0)}% of total` : `~${(stage.typicalShare * 100).toFixed(0)}% typical`}
                </span>
              </div>
              <div className="relative">
                <Input
                  id={stage.key}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={`e.g. ${(capacityKwh * getReferenceIntensity(chemistry) * stage.typicalShare).toFixed(0)}`}
                  value={(stages as any)[stage.key]}
                  onChange={(e) => setStages((prev) => ({ ...prev, [stage.key]: e.target.value }))}
                  className="bg-secondary/30 border-border font-mono text-sm pr-20 h-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground pointer-events-none">
                  kg CO₂e
                </span>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground/60 pl-1">{stage.description}</p>
            </div>
          );
        })}
      </div>

      {/* Total summary row */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-xs text-muted-foreground">Total (auto-sum)</span>
        <span className={`font-mono text-sm font-bold ${total > 0 ? CLASS_COLORS[computedClass].text : "text-muted-foreground"}`}>
          {total.toFixed(2)} kg CO₂e
        </span>
      </div>

      {/* Methodology + certifying body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-foreground/80">Methodology</Label>
          <Select value={methodology} onValueChange={(v) => setMethodology(v as any)}>
            <SelectTrigger className="bg-secondary/30 border-border h-9 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODOLOGY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="font-mono text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="certifyingBody" className="font-mono text-xs text-foreground/80">
            Certifying Body <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="certifyingBody"
            placeholder="e.g. TÜV Rheinland"
            value={certifyingBody}
            onChange={(e) => setCertifyingBody(e.target.value)}
            className="bg-secondary/30 border-border font-mono text-xs h-9"
          />
        </div>
      </div>

      {/* Validation warning */}
      {total > 0 && computedClass === "E" && (
        <div className="flex gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="font-mono text-[10px] text-red-400">
            Class E indicates a carbon intensity above {getThresholds(chemistry).D} kg CO₂e/kWh for {chemistry} batteries.
            Consider reviewing production energy sources or raw material sourcing to improve the rating.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSubmit}
          disabled={total <= 0 || declareMutation.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs font-mono"
        >
          {declareMutation.isPending ? (
            "Saving..."
          ) : (
            <>
              <Leaf className="w-3.5 h-3.5 mr-1.5" />
              {existing ? "Update Declaration" : "Submit Declaration"}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </>
          )}
        </Button>
        {editMode && existing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => setEditMode(false)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
