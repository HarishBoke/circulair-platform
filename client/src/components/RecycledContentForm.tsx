import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Recycle, CheckCircle2, Pencil, Info } from "lucide-react";

// EU 2031 targets (Article 8)
const EU_2031_TARGETS: Record<string, number> = {
  cobalt: 16,
  lithium: 6,
  nickel: 6,
  lead: 85,
};
const EU_2036_TARGETS: Record<string, number> = {
  cobalt: 26,
  lithium: 12,
  nickel: 15,
  lead: 85,
};

const MATERIALS = [
  { key: "cobaltPct", label: "Cobalt (Co)", symbol: "Co" },
  { key: "lithiumPct", label: "Lithium (Li)", symbol: "Li" },
  { key: "nickelPct", label: "Nickel (Ni)", symbol: "Ni" },
  { key: "leadPct", label: "Lead (Pb)", symbol: "Pb" },
] as const;

type MaterialKey = typeof MATERIALS[number]["key"];

interface RecycledContentFormProps {
  bpan: string;
  batteryId: number;
}

function getComplianceStatus(values: Record<string, number>): { status: "compliant_2031" | "compliant_2036" | "non_compliant" | "partial"; message: string } {
  const meets2036 = values.cobaltPct >= EU_2036_TARGETS.cobalt &&
    values.lithiumPct >= EU_2036_TARGETS.lithium &&
    values.nickelPct >= EU_2036_TARGETS.nickel &&
    values.leadPct >= EU_2036_TARGETS.lead;
  if (meets2036) return { status: "compliant_2036", message: "Meets EU 2036 targets" };

  const meets2031 = values.cobaltPct >= EU_2031_TARGETS.cobalt &&
    values.lithiumPct >= EU_2031_TARGETS.lithium &&
    values.nickelPct >= EU_2031_TARGETS.nickel &&
    values.leadPct >= EU_2031_TARGETS.lead;
  if (meets2031) return { status: "compliant_2031", message: "Meets EU 2031 targets" };

  const anyMeets2031 = values.cobaltPct >= EU_2031_TARGETS.cobalt ||
    values.lithiumPct >= EU_2031_TARGETS.lithium ||
    values.nickelPct >= EU_2031_TARGETS.nickel ||
    values.leadPct >= EU_2031_TARGETS.lead;
  if (anyMeets2031) return { status: "partial", message: "Partially compliant — some materials meet EU 2031 targets" };

  return { status: "non_compliant", message: "Below EU 2031 minimum targets" };
}

export default function RecycledContentForm({ bpan, batteryId }: RecycledContentFormProps) {
  const [editing, setEditing] = useState(false);
  const [cobaltPct, setCobaltPct] = useState("");
  const [lithiumPct, setLithiumPct] = useState("");
  const [nickelPct, setNickelPct] = useState("");
  const [leadPct, setLeadPct] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("SELF_DECLARED");
  const [certifyingBody, setCertifyingBody] = useState("");
  const [certificateRef, setCertificateRef] = useState("");
  const [notes, setNotes] = useState("");

  const existing = trpc.regulatory.getRecycledContentByBpan.useQuery({ bpan });
  const utils = trpc.useUtils();
  const declare = trpc.regulatory.declareRecycledContent.useMutation({
    onSuccess: () => {
      toast.success("Recycled content declaration saved");
      utils.regulatory.getRecycledContentByBpan.invalidate({ bpan });
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const values = useMemo(() => ({
    cobaltPct: parseFloat(cobaltPct) || 0,
    lithiumPct: parseFloat(lithiumPct) || 0,
    nickelPct: parseFloat(nickelPct) || 0,
    leadPct: parseFloat(leadPct) || 0,
  }), [cobaltPct, lithiumPct, nickelPct, leadPct]);

  const totalRecycled = useMemo(() => {
    const sum = values.cobaltPct + values.lithiumPct + values.nickelPct + values.leadPct;
    return Math.round(sum * 100) / 100 / 4; // weighted average
  }, [values]);

  const compliance = useMemo(() => getComplianceStatus(values), [values]);

  const prefillFromExisting = () => {
    if (existing.data) {
      setCobaltPct(existing.data.cobaltPct ?? "");
      setLithiumPct(existing.data.lithiumPct ?? "");
      setNickelPct(existing.data.nickelPct ?? "");
      setLeadPct(existing.data.leadPct ?? "");
      setVerificationMethod(existing.data.verificationMethod ?? "SELF_DECLARED");
      setCertifyingBody(existing.data.certifyingBody ?? "");
      setCertificateRef(existing.data.certificateRef ?? "");
      setNotes(existing.data.notes ?? "");
    }
    setEditing(true);
  };

  const handleSubmit = () => {
    declare.mutate({
      bpan,
      batteryId,
      cobaltPct: values.cobaltPct,
      lithiumPct: values.lithiumPct,
      nickelPct: values.nickelPct,
      leadPct: values.leadPct,
      totalRecycledPct: totalRecycled,
      verificationMethod: verificationMethod as any,
      certifyingBody: certifyingBody || undefined,
      certificateRef: certificateRef || undefined,
      notes: notes || undefined,
    });
  };

  // Loading state
  if (existing.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading recycled content data…</span>
      </div>
    );
  }

  // Read-only view when declaration exists and not editing
  if (existing.data && !editing) {
    const d = existing.data;
    const readValues = {
      cobaltPct: parseFloat(d.cobaltPct ?? "0"),
      lithiumPct: parseFloat(d.lithiumPct ?? "0"),
      nickelPct: parseFloat(d.nickelPct ?? "0"),
      leadPct: parseFloat(d.leadPct ?? "0"),
    };
    const readCompliance = getComplianceStatus(readValues);

    return (
      <div className="space-y-4">
        {/* Compliance badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          readCompliance.status === "compliant_2036" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
          readCompliance.status === "compliant_2031" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
          readCompliance.status === "partial" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
          "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {readCompliance.message}
        </div>

        {/* Material bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MATERIALS.map(({ key, label, symbol }) => {
            const val = readValues[key as keyof typeof readValues];
            const target2031 = EU_2031_TARGETS[symbol.toLowerCase()] ?? 0;
            const target2036 = EU_2036_TARGETS[symbol.toLowerCase()] ?? 0;
            const meetsTarget = val >= target2031;
            return (
              <div key={key} className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{symbol}</span>
                  <span className={`text-sm font-mono font-semibold ${meetsTarget ? "text-emerald-400" : "text-amber-400"}`}>
                    {val}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all ${meetsTarget ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(val / Math.max(target2036, 1) * 100, 100)}%` }}
                  />
                  {/* 2031 target marker */}
                  <div
                    className="absolute top-0 h-full w-px bg-zinc-400"
                    style={{ left: `${(target2031 / Math.max(target2036, 1)) * 100}%` }}
                    title={`EU 2031 target: ${target2031}%`}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">2031: {target2031}%</span>
                  <span className="text-[10px] text-muted-foreground">2036: {target2036}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Method: {d.verificationMethod?.replace(/_/g, " ")}</span>
          {d.certifyingBody && <span>Body: {d.certifyingBody}</span>}
          {d.certificateRef && <span>Ref: {d.certificateRef}</span>}
          <span>Declared: {d.declaredAt ? new Date(d.declaredAt).toLocaleDateString() : "—"}</span>
        </div>

        <Button variant="outline" size="sm" onClick={prefillFromExisting} className="gap-2">
          <Pencil className="w-3.5 h-3.5" />
          Update Declaration
        </Button>
      </div>
    );
  }

  // Edit / Create form
  return (
    <div className="space-y-4">
      {!existing.data && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>EU Battery Regulation requires declaring recycled content percentages for Co, Li, Ni, and Pb. Targets apply from 2031 (first phase) and 2036 (second phase).</span>
        </div>
      )}

      {/* Material inputs with live compliance indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MATERIALS.map(({ key, label, symbol }) => {
          const val = values[key as keyof typeof values];
          const target = EU_2031_TARGETS[symbol.toLowerCase()] ?? 0;
          const meets = val >= target;
          const setter = key === "cobaltPct" ? setCobaltPct :
                         key === "lithiumPct" ? setLithiumPct :
                         key === "nickelPct" ? setNickelPct : setLeadPct;
          const rawVal = key === "cobaltPct" ? cobaltPct :
                         key === "lithiumPct" ? lithiumPct :
                         key === "nickelPct" ? nickelPct : leadPct;
          return (
            <div key={key}>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={rawVal}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={`EU 2031: ≥${target}%`}
                  className="h-9 pr-8 text-sm"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              {rawVal && (
                <span className={`text-[10px] mt-1 block ${meets ? "text-emerald-400" : "text-amber-400"}`}>
                  {meets ? "✓ Meets 2031 target" : `Below 2031 target (${target}%)`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Live compliance status */}
      {(cobaltPct || lithiumPct || nickelPct || leadPct) && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          compliance.status === "compliant_2036" ? "bg-emerald-500/10 text-emerald-400" :
          compliance.status === "compliant_2031" ? "bg-green-500/10 text-green-400" :
          compliance.status === "partial" ? "bg-amber-500/10 text-amber-400" :
          "bg-red-500/10 text-red-400"
        }`}>
          {compliance.message}
        </div>
      )}

      {/* Verification details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Verification Method</Label>
          <Select value={verificationMethod} onValueChange={setVerificationMethod}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SELF_DECLARED">Self Declared</SelectItem>
              <SelectItem value="THIRD_PARTY_AUDIT">Third Party Audit</SelectItem>
              <SelectItem value="CERTIFIED_LAB">Certified Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Certifying Body</Label>
          <Input
            value={certifyingBody}
            onChange={(e) => setCertifyingBody(e.target.value)}
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Certificate Ref</Label>
          <Input
            value={certificateRef}
            onChange={(e) => setCertificateRef(e.target.value)}
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes on sourcing or methodology…"
          className="text-sm resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={declare.isPending} size="sm" className="gap-2">
          {declare.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Recycle className="w-3.5 h-3.5" />}
          {existing.data ? "Update Declaration" : "Submit Declaration"}
        </Button>
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
