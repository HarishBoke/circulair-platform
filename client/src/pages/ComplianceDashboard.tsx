/**
 * ComplianceDashboard page
 *
 * Shows the compliance posture of the platform across all active
 * regulatory jurisdictions. Each jurisdiction card shows:
 *   - Status (compliant / pending / non-compliant)
 *   - Key mandatory fields and whether they are filled
 *   - Link to the public passport page (if applicable)
 *   - Quick-action to generate the jurisdiction's required document
 *
 * Route: /compliance
 */
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { JURISDICTIONS } from "@shared/jurisdictions";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Globe,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────

type ComplianceStatus = "compliant" | "pending" | "non_compliant" | "not_applicable";

const STATUS_CONFIG: Record<ComplianceStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  compliant:      { icon: CheckCircle2,   label: "Compliant",       color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800/50" },
  pending:        { icon: Clock,          label: "Pending",         color: "text-amber-400",   bg: "bg-amber-950/40 border-amber-800/50" },
  non_compliant:  { icon: XCircle,        label: "Non-Compliant",   color: "text-red-400",     bg: "bg-red-950/40 border-red-800/50" },
  not_applicable: { icon: AlertTriangle,  label: "Not Applicable",  color: "text-muted-foreground/70",    bg: "bg-background/40 border-border/50" },
};

// ─── JURISDICTION CARD ────────────────────────────────────────────────────────

function JurisdictionCard({ code }: { code: string }) {
  const j = JURISDICTIONS[code];
  if (!j) return null;

  // In a real implementation this would query the regulatory_profiles table
  // aggregated by jurisdiction. For now we show the jurisdiction metadata
  // and a "Set Up" CTA.
  const status: ComplianceStatus = j.enabled ? "pending" : "not_applicable";
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{j.name}</h3>
            <span className="text-[10px] font-mono text-muted-foreground/70 bg-secondary px-1.5 py-0.5 rounded">
              {j.code}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">{j.regulationName}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60">Battery ID</span>
          <p className="text-foreground/90 font-medium">{j.idFieldName}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60">Mandatory From</span>
          <p className="text-foreground/90 font-medium">
            {j.mandatoryFrom ?? "TBD"}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60">Public Passport</span>
          <p className={j.requiresPublicPassport ? "text-emerald-400 font-medium" : "text-muted-foreground/70"}>
            {j.requiresPublicPassport ? "Required" : "Not required"}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60">Gov Sync</span>
          <p className={j.requiresGovSync ? "text-amber-400 font-medium" : "text-muted-foreground/70"}>
            {j.requiresGovSync ? "Required" : "Not required"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {j.requiresPublicPassport && (
          <Link href={`/passport/${j.passportIdPrefix}/demo`}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border text-foreground/90 hover:text-foreground bg-transparent"
            >
              <Globe className="h-3 w-3 mr-1.5" />
              View Passport
            </Button>
          </Link>
        )}
        <a
          href={j.regulationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground/90 transition-colors ml-auto"
        >
          Regulation <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ─── SUMMARY STATS ────────────────────────────────────────────────────────────

function SummaryBar({ activeJurisdictions }: { activeJurisdictions: string[] }) {
  const total = activeJurisdictions.length;
  const live = activeJurisdictions.filter((c) => JURISDICTIONS[c]?.enabled).length;
  const upcoming = total - live;

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Active Jurisdictions", value: total, color: "text-foreground" },
        { label: "Live Regulations",     value: live,     color: "text-emerald-400" },
        { label: "Upcoming",             value: upcoming, color: "text-amber-400" },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-background/50 px-4 py-3">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── FEATURE HIGHLIGHTS ───────────────────────────────────────────────────────

function FeatureHighlights() {
  const features = [
    {
      icon: ShieldCheck,
      title: "EU Battery Passport",
      desc: "Public QR-linkable passport page compliant with EU Regulation 2023/1542. Auto-generates a UUID and hosts the data at /passport/EU/{id}.",
      available: true,
    },
    {
      icon: Leaf,
      title: "Carbon Footprint Declaration",
      desc: "Declare kg CO₂e across 4 lifecycle stages (raw material, production, distribution, end-of-life). Performance class A–E rating.",
      available: true,
    },
    {
      icon: FileText,
      title: "CPCB Form BW-3 (India)",
      desc: "Auto-generate the CPCB Extended Producer Responsibility report for submission to the Central Pollution Control Board.",
      available: true,
    },
    {
      icon: Globe,
      title: "China MIIT Sync",
      desc: "Outbound sync to the Chinese Ministry of Industry and Information Technology national battery registry.",
      available: false,
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Compliance Features</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className={`rounded-xl border p-4 space-y-2 ${
                f.available
                  ? "border-border bg-background/50"
                  : "border-border/50 bg-background/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                {!f.available && (
                  <span className="ml-auto text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ComplianceDashboard() {
  usePageTitle("Compliance Dashboard");

  const { activeJurisdictions } = usePlatformSettings();

  const activeList = useMemo(
    () => activeJurisdictions.filter((c) => JURISDICTIONS[c]),
    [activeJurisdictions]
  );

  // Also show all jurisdictions that aren't active so user can enable them
  const inactiveList = useMemo(
    () => Object.keys(JURISDICTIONS).filter((c) => !activeJurisdictions.includes(c)),
    [activeJurisdictions]
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Compliance Dashboard</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Regulatory posture across all active jurisdictions.
          </p>
        </div>
        <Link href="/settings/platform">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border text-foreground/90 hover:text-foreground bg-transparent"
          >
            Manage Jurisdictions
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <SummaryBar activeJurisdictions={activeList} />

      {/* Active Jurisdiction Cards */}
      {activeList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Jurisdictions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeList.map((code) => (
              <JurisdictionCard key={code} code={code} />
            ))}
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <FeatureHighlights />

      {/* Available but inactive */}
      {inactiveList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Available Jurisdictions (not active)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inactiveList.map((code) => {
              const j = JURISDICTIONS[code];
              return (
                <div
                  key={code}
                  className="rounded-xl border border-border/50 bg-background/20 p-4 opacity-60 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{j.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1 rounded">{j.code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60">{j.regulationName}</p>
                </div>
              );
            })}
          </div>
          <Link href="/settings/platform">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border text-muted-foreground hover:text-foreground bg-transparent"
            >
              Enable jurisdictions in Platform Settings
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
