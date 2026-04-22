/**
 * PlatformSettings page
 *
 * Allows each user to configure their own locale, display currency,
 * timezone, active jurisdictions, and organisation details.
 * Admins additionally see a "Global Defaults" section.
 *
 * Route: /settings/platform
 */
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { JURISDICTIONS } from "@shared/jurisdictions";
import { CURRENCIES } from "@shared/currencies";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Globe, DollarSign, Clock, Shield, Building2, Save, Info } from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const LOCALES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "de-DE", label: "Deutsch (Germany)" },
  { code: "fr-FR", label: "Français (France)" },
  { code: "zh-CN", label: "中文 (China)" },
  { code: "ja-JP", label: "日本語 (Japan)" },
  { code: "ko-KR", label: "한국어 (Korea)" },
];

const TIMEZONES = [
  { value: "Asia/Kolkata",     label: "IST - Asia/Kolkata (UTC+5:30)" },
  { value: "Europe/Berlin",    label: "CET - Europe/Berlin (UTC+1)" },
  { value: "Europe/London",    label: "GMT - Europe/London (UTC+0)" },
  { value: "America/New_York", label: "EST - America/New_York (UTC-5)" },
  { value: "America/Chicago",  label: "CST - America/Chicago (UTC-6)" },
  { value: "America/Los_Angeles", label: "PST - America/Los_Angeles (UTC-8)" },
  { value: "Asia/Shanghai",    label: "CST - Asia/Shanghai (UTC+8)" },
  { value: "Asia/Tokyo",       label: "JST - Asia/Tokyo (UTC+9)" },
  { value: "Asia/Seoul",       label: "KST - Asia/Seoul (UTC+9)" },
  { value: "UTC",              label: "UTC (UTC+0)" },
];

const DATA_REGIONS = [
  { value: "in",     label: "India (in)" },
  { value: "eu",     label: "European Union (eu)" },
  { value: "us",     label: "United States (us)" },
  { value: "cn",     label: "China (cn)" },
  { value: "global", label: "Global (no restriction)" },
];

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-zinc-800 p-2">
          <Icon className="h-4 w-4 text-zinc-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── JURISDICTION PICKER ──────────────────────────────────────────────────────

function JurisdictionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (code: string) => {
    if (value.includes(code)) {
      if (value.length === 1) return; // always keep at least one
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Object.values(JURISDICTIONS).map((j) => {
        const active = value.includes(j.code);
        return (
          <label
            key={j.code}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              active
                ? "border-emerald-600/50 bg-emerald-950/30"
                : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
            }`}
          >
            <Checkbox
              checked={active}
              onCheckedChange={() => toggle(j.code)}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-zinc-100">{j.name}</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1 rounded">
                  {j.code}
                </span>
                {j.enabled && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 rounded-full">
                    Live
                  </span>
                )}
                {!j.enabled && (
                  <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1.5 rounded-full">
                    Upcoming
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{j.regulationName}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PlatformSettings() {
  usePageTitle("Platform Settings");

  const { user } = useAuth();
  const { locale: ctxLocale } = usePlatformSettings();
  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.platformSettings.get.useQuery();

  // Local form state
  const [locale, setLocale] = useState("en-IN");
  const [displayCurrency, setDisplayCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [activeJurisdictions, setActiveJurisdictions] = useState<string[]>(["IN"]);
  const [dataResidencyRegion, setDataResidencyRegion] = useState("in");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationCountry, setOrganisationCountry] = useState("");

  // Sync from server
  useEffect(() => {
    if (!settings) return;
    setLocale(settings.locale ?? "en-IN");
    setDisplayCurrency(settings.displayCurrency ?? "INR");
    setTimezone(settings.timezone ?? "Asia/Kolkata");
    setActiveJurisdictions((settings.activeJurisdictions as string[]) ?? ["IN"]);
    setDataResidencyRegion(settings.dataResidencyRegion ?? "in");
    setOrganisationName(settings.organisationName ?? "");
    setOrganisationCountry(settings.organisationCountry ?? "");
  }, [settings]);

  const saveMutation = trpc.platformSettings.save.useMutation({
    onSuccess: () => {
      utils.platformSettings.get.invalidate();
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    saveMutation.mutate({
      locale,
      displayCurrency,
      timezone,
      activeJurisdictions,
      dataResidencyRegion: dataResidencyRegion as any,
      organisationName: organisationName || undefined,
      organisationCountry: organisationCountry || undefined,
    });
  };

  // Currency preview
  const previewAmount = 125000;
  let currencyPreview = "";
  try {
    currencyPreview = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 2,
    }).format(previewAmount);
  } catch {
    currencyPreview = `${displayCurrency} ${previewAmount}`;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Platform Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure your locale, currency, and regulatory jurisdictions.
        </p>
      </div>

      {/* Organisation */}
      <Section
        icon={Building2}
        title="Organisation"
        description="Your organisation's name and home country."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Organisation Name</Label>
            <Input
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              placeholder="Acme Battery Co."
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Country (ISO 3166-1 alpha-2)</Label>
            <Input
              value={organisationCountry}
              onChange={(e) => setOrganisationCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="IN"
              maxLength={2}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9 font-mono uppercase"
            />
          </div>
        </div>
      </Section>

      {/* Locale & Currency */}
      <Section
        icon={Globe}
        title="Locale & Currency"
        description="Controls number formatting, date display, and price presentation."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Display Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {LOCALES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-zinc-100 text-sm">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Display Currency</Label>
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                {Object.values(CURRENCIES).map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-zinc-100 text-sm">
                    <span className="font-mono text-zinc-400 mr-2">{c.symbol}</span>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Live preview */}
        <div className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-400">
            Preview: <span className="text-zinc-200 font-medium">{currencyPreview}</span>
          </span>
        </div>
      </Section>

      {/* Timezone */}
      <Section
        icon={Clock}
        title="Timezone"
        description="Used for displaying timestamps in telemetry, reports, and audit logs."
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value} className="text-zinc-100 text-sm">
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Active Jurisdictions */}
      <Section
        icon={Globe}
        title="Active Regulatory Jurisdictions"
        description="Select the markets you operate in. This controls which compliance checks and passport formats are available."
      >
        <JurisdictionPicker
          value={activeJurisdictions}
          onChange={setActiveJurisdictions}
        />
      </Section>

      {/* Data Residency */}
      <Section
        icon={Shield}
        title="Data Residency"
        description="Controls where battery data is stored. Required for GDPR (EU) and PIPL (China) compliance."
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Data Region</Label>
          <Select value={dataResidencyRegion} onValueChange={setDataResidencyRegion}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {DATA_REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-zinc-100 text-sm">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(dataResidencyRegion === "eu") && (
            <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />
              EU data residency enables GDPR data subject request workflows.
            </p>
          )}
          {(dataResidencyRegion === "cn") && (
            <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />
              China data residency enables PIPL compliance and MIIT sync.
            </p>
          )}
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-5 text-sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
