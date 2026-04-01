/**
 * EuBatteryPassport — Public EU Battery Passport page
 *
 * Accessible at /passport/EU/:localId with NO authentication required.
 * Designed to be linked from a QR code printed on the physical battery.
 *
 * Displays the GBA-standard data layout:
 *   - Battery identity (BPAN, local EU ID, manufacturer)
 *   - Carbon footprint declaration (4 lifecycle stages + class)
 *   - Material composition (recycled content %)
 *   - Compliance status
 *
 * Route: /passport/EU/:localId
 */
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Leaf,
  Battery,
  Globe,
  ExternalLink,
  QrCode,
  AlertTriangle,
} from "lucide-react";

// ─── CARBON CLASS BADGE ───────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-green-500 text-white",
  C: "bg-yellow-500 text-black",
  D: "bg-orange-500 text-white",
  E: "bg-red-500 text-white",
};

function CarbonClassBadge({ cls }: { cls: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl font-bold ${CLASS_COLORS[cls] ?? "bg-zinc-700 text-zinc-300"}`}>
      {cls}
    </span>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    compliant:       { icon: CheckCircle2, label: "Compliant",       cls: "text-emerald-400 bg-emerald-950/50 border-emerald-800/50" },
    non_compliant:   { icon: XCircle,      label: "Non-Compliant",   cls: "text-red-400 bg-red-950/50 border-red-800/50" },
    pending:         { icon: Clock,        label: "Pending",         cls: "text-amber-400 bg-amber-950/50 border-amber-800/50" },
    not_applicable:  { icon: AlertTriangle,label: "Not Applicable",  cls: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50" },
    data_incomplete: { icon: AlertTriangle,label: "Data Incomplete", cls: "text-amber-400 bg-amber-950/50 border-amber-800/50" },
  };
  const cfg = map[status] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── DATA ROW ─────────────────────────────────────────────────────────────────

function DataRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className={`text-xs text-zinc-200 text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ─── SECTION ──────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <Icon className="h-4 w-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function PassportSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── NOT FOUND ────────────────────────────────────────────────────────────────

function PassportNotFound({ localId }: { localId: string }) {
  return (
    <div className="text-center py-16 space-y-4">
      <XCircle className="h-12 w-12 text-red-500 mx-auto" />
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Passport Not Found</h2>
        <p className="text-sm text-zinc-500 mt-1">
          No EU Battery Passport found for ID: <span className="font-mono text-zinc-300">{localId}</span>
        </p>
      </div>
      <p className="text-xs text-zinc-600 max-w-sm mx-auto">
        This may mean the battery has not yet been registered on the Circul-AI-r platform,
        or the QR code is damaged. Contact the manufacturer for assistance.
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EuBatteryPassport() {
  const params = useParams<{ localId: string }>();
  const localId = params.localId ?? "";

  const { data: profile, isLoading, error } = trpc.regulatory.getEuPassport.useQuery(
    { localId },
    { enabled: localId.length > 0, retry: false }
  );

  const profileData = profile?.profileData as Record<string, any> | undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold text-zinc-100">EU Battery Passport</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full ml-1">
              Regulation 2023/1542
            </span>
          </div>
          <a
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <Globe className="h-3.5 w-3.5" />
            EU Regulation
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {isLoading && <PassportSkeleton />}

        {!isLoading && (error || !profile) && <PassportNotFound localId={localId} />}

        {!isLoading && profile && (
          <>
            {/* Identity header */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs text-zinc-500">EU Battery Passport ID</span>
                  </div>
                  <p className="font-mono text-sm text-zinc-100 break-all">{profile.localId ?? localId}</p>
                </div>
                <StatusBadge status={profile.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500">BPAN</span>
                  <p className="font-mono text-zinc-200 mt-0.5">{profile.bpan}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Jurisdiction</span>
                  <p className="text-zinc-200 mt-0.5">European Union</p>
                </div>
                <div>
                  <span className="text-zinc-500">Last Updated</span>
                  <p className="text-zinc-200 mt-0.5">
                    {new Date(profile.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Gov Sync</span>
                  <p className={`mt-0.5 capitalize ${
                    profile.govSyncStatus === "synced" ? "text-emerald-400" :
                    profile.govSyncStatus === "failed" ? "text-red-400" : "text-zinc-400"
                  }`}>
                    {profile.govSyncStatus?.replace("_", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Carbon Footprint */}
            {profileData?.carbonFootprint && (
              <Section title="Carbon Footprint Declaration" icon={Leaf}>
                <div className="py-3 flex items-center gap-4">
                  <CarbonClassBadge cls={profileData.carbonFootprint.performanceClass ?? "?"} />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {profileData.carbonFootprint.totalKgCo2e} kg CO₂e
                    </p>
                    <p className="text-xs text-zinc-500">Total lifecycle carbon footprint</p>
                  </div>
                </div>
                {profileData.carbonFootprint.stages && (
                  <>
                    <DataRow label="Raw Material Extraction" value={`${profileData.carbonFootprint.stages.rawMaterial ?? "—"} kg CO₂e`} />
                    <DataRow label="Battery Production" value={`${profileData.carbonFootprint.stages.production ?? "—"} kg CO₂e`} />
                    <DataRow label="Distribution" value={`${profileData.carbonFootprint.stages.distribution ?? "—"} kg CO₂e`} />
                    <DataRow label="End of Life" value={`${profileData.carbonFootprint.stages.endOfLife ?? "—"} kg CO₂e`} />
                  </>
                )}
                {profileData.carbonFootprint.methodology && (
                  <DataRow label="Methodology" value={profileData.carbonFootprint.methodology} />
                )}
                {profileData.carbonFootprint.certifyingBody && (
                  <DataRow label="Certifying Body" value={profileData.carbonFootprint.certifyingBody} />
                )}
              </Section>
            )}

            {/* Material Composition */}
            {profileData?.materialComposition && (
              <Section title="Material Composition" icon={Battery}>
                {Object.entries(profileData.materialComposition as Record<string, any>).map(([k, v]) => (
                  <DataRow key={k} label={k} value={typeof v === "number" ? `${v}%` : String(v)} />
                ))}
              </Section>
            )}

            {/* Supply Chain */}
            {profileData?.supplyChain && (
              <Section title="Supply Chain" icon={Globe}>
                {Object.entries(profileData.supplyChain as Record<string, any>).map(([k, v]) => (
                  <DataRow key={k} label={k} value={String(v)} />
                ))}
              </Section>
            )}

            {/* Raw profile data fallback */}
            {!profileData?.carbonFootprint && !profileData?.materialComposition && (
              <Section title="Passport Data" icon={Battery}>
                {Object.entries(profileData ?? {}).map(([k, v]) => (
                  <DataRow key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
                ))}
                {Object.keys(profileData ?? {}).length === 0 && (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    No detailed passport data has been declared yet.
                  </p>
                )}
              </Section>
            )}

            {/* Footer */}
            <div className="text-center space-y-1 pt-4">
              <p className="text-xs text-zinc-600">
                This passport is issued under EU Battery Regulation 2023/1542.
              </p>
              <p className="text-xs text-zinc-700">
                Powered by{" "}
                <a href="/" className="text-zinc-500 hover:text-zinc-300">
                  Circul-AI-r Platform
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
