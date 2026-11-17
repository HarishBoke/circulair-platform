import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  queries: {} as Record<string, any>, metadata: [] as any[], charts: [] as any[],
  mutate: vi.fn(), invalidate: vi.fn(), refetch: vi.fn(),
  user: { name: "Fixture Reviewer", role: "admin" },
}));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("@/hooks/useStructuredData", () => ({ useStructuredData: (data: any) => fixture.metadata.push(data) }));
vi.mock("@/hooks/useDebounce", () => ({ useDebounce: (value: any) => value }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: fixture.user }) }));
vi.mock("@/lib/csvExport", () => ({ downloadCsv: vi.fn() }));
vi.mock("@/lib/trpc", () => {
  const tree = (path = ""): any => new Proxy(() => {}, {
    get(_target, key: string) {
      if (key === "useQuery") return () => ({ isLoading: false, error: null, refetch: fixture.refetch, ...fixture.queries[path] });
      if (key === "useMutation") return () => ({ isPending: false, mutate: fixture.mutate });
      if (key === "invalidate") return fixture.invalidate;
      if (key === "useUtils") return () => tree();
      return tree(path ? `${path}.${key}` : key);
    },
  });
  return { trpc: tree() };
});
vi.mock("wouter", () => ({ Link: ({ children, ...props }: any) => createElement("a", props, children) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/PlatformLayout", () => ({ default: ({ children }: any) => createElement("main", {}, children) }));
vi.mock("@/components/MqttBrokerPanel", () => ({ default: () => createElement("div", {}, "Broker panel isolated; no connection") }));
vi.mock("@/components/OnboardingWizard", () => ({ default: () => null }));
vi.mock("@/components/GettingStartedWidget", () => ({ default: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, variant, size, ...props }: any) => createElement("button", props, children) }));
vi.mock("@/components/ui/input", () => ({ Input: (props: any) => createElement("input", props) }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: any) => createElement("textarea", props) }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: any) => createElement("label", props, children) }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children, variant, ...props }: any) => createElement("span", props, children) }));
vi.mock("@/components/ui/card", () => {
  const block = ({ children, ...props }: any) => createElement("div", props, children);
  return { Card: block, CardContent: block, CardHeader: block, CardTitle: block, CardDescription: block };
});
vi.mock("@/components/ui/tabs", () => {
  const block = ({ children, value, defaultValue, onValueChange, ...props }: any) => createElement("div", props, children);
  return { Tabs: block, TabsList: block, TabsTrigger: block, TabsContent: block };
});
vi.mock("@/components/ui/select", () => {
  const block = ({ children }: any) => createElement("div", {}, children);
  return { Select: block, SelectContent: block, SelectItem: block, SelectTrigger: block, SelectValue: block };
});
vi.mock("@/components/ui/dialog", () => {
  const block = ({ children }: any) => createElement("div", {}, children);
  return { Dialog: block, DialogContent: block, DialogHeader: block, DialogTitle: block, DialogTrigger: block };
});
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: ({ onCheckedChange, ...props }: any) => createElement("input", { type: "checkbox", readOnly: true, ...props }) }));
vi.mock("recharts", () => {
  const chart = ({ children, data }: any) => {
    if (data) fixture.charts.push(data);
    return createElement("svg", {}, children);
  };
  const blank = () => null;
  return { AreaChart: chart, BarChart: chart, PieChart: chart, Pie: chart, RadarChart: chart,
    ResponsiveContainer: chart, Area: blank, Bar: blank, XAxis: blank, YAxis: blank,
    CartesianGrid: blank, Tooltip: blank, Cell: blank, Radar: blank, PolarGrid: blank, PolarAngleAxis: blank };
});

import ApiReference from "../client/src/pages/ApiReference";
import GatewayDocs from "../client/src/pages/GatewayDocs";
import Faq from "../client/src/pages/Faq";
import AdminUserManagement from "../client/src/pages/AdminUserManagement";
import DataSharing from "../client/src/pages/DataSharing";
import AiSoh from "../client/src/pages/AiSoh";
import Dashboard from "../client/src/pages/Dashboard";
import Glossary from "../client/src/pages/Glossary";
import DataIntegration from "../client/src/pages/DataIntegration";
import { WIKI_ARTICLES, WIKI_CATEGORIES, searchWiki, getRelatedArticles, getArticlesByCategory, getWikiSystemPrompt } from "../client/src/lib/wikiData";

const root = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(resolve(root, file), "utf8");
const pages = { ApiReference, GatewayDocs, Faq, AdminUserManagement, DataSharing, AiSoh, Dashboard, Glossary, DataIntegration };
const pageSource = (name: string) => source(`client/src/pages/${name}.tsx`);
const render = (Page: any) => renderToStaticMarkup(createElement(Page));
const brands = /\b(?:manus|tesla|byd|nissan|ather|catl|tata|bluedart|exide|amara|narada|dynavolt|growatt|victron)\b/i;

beforeEach(() => {
  fixture.queries = {};
  fixture.metadata.length = 0;
  fixture.charts.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal("React", React); // Existing Vitest config uses classic JSX.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in offline public copy tests"); }));
});
afterEach(() => vi.unstubAllGlobals());

describe("assigned public copy boundaries — offline isolated actual pages", () => {
  it.each(Object.entries(pages))("%s renders without fabricated model or trend promises", (name, Page) => {
    const html = render(Page);
    expect(html).not.toMatch(/RMSE\s*(?:&lt;|<)\s*2|98% accuracy|CNN-LSTM v|\+12%|\+8%|\+20%|100% verified|99\.99%/i);
    expect(pageSource(name)).not.toMatch(brands);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(fixture.mutate).not.toHaveBeenCalled();
  });

  it("FAQ structured answers, not merely collapsed headings, have explicit estimate and enrollment boundaries", () => {
    render(Faq);
    const answers = fixture.metadata[0].mainEntity.map((question: any) => question.acceptedAnswer.text).join("\n");
    expect(answers).toContain("official BPAN enrollment not verified");
    expect(answers).toContain("uncalibrated estimates");
    expect(answers).toContain("Legacy hardware ingestion is blocked with HTTP 503");
    expect(answers).toContain("new local pilot is in development and not deployed");
    expect(answers).not.toMatch(brands);
    expect(answers).not.toMatch(/CNN-LSTM|RMSE <|yield-verified|ready for submission|AI-verified|SLA-backed/);
  });

  it("glossary retains legitimate percentage definitions and general CNN-LSTM/RMSE definitions without claiming app accuracy", () => {
    const html = render(Glossary);
    expect(html).toContain("100% means fully charged, 0% means fully discharged");
    expect(html).toContain("SOH = 100% when capacity equals the reference rating");
    expect(html).toContain("general neural architecture");
    expect(html).toContain("not a bound on every prediction");
    expect(html).toContain("metadata is not observed validation error");
    expect(JSON.stringify(fixture.metadata)).not.toMatch(/RMSE < 2|EU-compliant DPP|fulfilled recycling obligations/);
  });

  it("API examples have no fabricated response, runnable try-it handler or production target", () => {
    const text = pageSource("ApiReference");
    expect((text.match(/"documentationOnly": true/g) ?? []).length).toBe(9);
    expect(text).toContain("approved-host.example.invalid");
    expect(text).toContain('<Button size="sm" disabled={true}>Requests unavailable</Button>');
    expect(text).not.toMatch(/await fetch\(url|\/api\/proxy\/v1|setTryResult|"valid": true|"healthStatus": "healthy"|"confidence": 0\./);
    expect(text).toContain("Legacy hardware ingestion is blocked with HTTP 503");
    expect(text).toContain("payments and private document publishing are disabled");
  });

  it("gateway is reference-only, preserves actual historical paths and supplies no guessed physical configuration", () => {
    const html = render(GatewayDocs);
    const text = pageSource("GatewayDocs");
    for (const phrase of ["Physical testing not performed", "HTTP 503", "conditional, operator-approved", "not an emergency cutoff", "independent", "operator-approved"]) {
      expect((html + text).toLowerCase()).toContain(phrase.toLowerCase());
    }
    for (const match of text.matchAll(/"(gateway\/[^"]+)"/g)) expect(existsSync(resolve(root, match[1]))).toBe(true);
    expect(text).not.toMatch(/GPIO\d|OBD-II Pin|read_holding_registers|read_input_registers|VOLTAGE_DIVIDER_RATIO|nmap|Published reading #1|Accuracy is ±|YOUR_MQTT_PASSWORD|curl -X POST|systemctl|pip install/);
    expect(text).toContain("new local pilot is in development and not deployed");
    expect(text).not.toMatch(/href=["']\/(?:pilot|local-pilot)/);
  });

  it("integration no longer asserts synthetic record counts, live status, seed safety or external execution", () => {
    const html = render(DataIntegration);
    const text = pageSource("DataIntegration");
    expect(html).toContain("Data provenance unknown unless evidenced");
    expect(html).toContain("No seed counts, model accuracy, latency or uptime are asserted");
    expect(text).toContain("nothing uploaded or saved"); // Conditional local-text notice, not shown until text is entered.
  });

  it("integration local preview and broker remain bounded without runnable publish/DB/write snippets", () => {
    const text = pageSource("DataIntegration");
    expect(text).toContain("<MqttBrokerPanel />");
    expect(text).toContain("Line counting does not handle quoted multiline CSV fields");
    expect(text).toContain("nothing uploaded or saved");
    expect(text).not.toMatch(/node seed|mysql\.createConnection|client\.publish|schedulePickup|blockchainTxHash|≈2s|40 Batteries|480 Telemetry|status="live"|npm install/);
    expect(render(DataIntegration)).toContain("Planned; unavailable");
  });

  it("dashboard retains fixture counts, actual chart data and explicit zero without invented trends", () => {
    fixture.queries = {
      "analytics.kpis": { data: { batteryStats: { total: 314, operational: 0, endOfLife: 27 }, marketStats: { activeListings: 8 }, eprStats: { verified: 0 } } },
      "analytics.sohTrend": { data: [{ month: "Fixture", avg: 44 }, { month: "Missing", avg: null }] },
      "analytics.triageDistribution": { data: [{ name: "Candidate fixture", value: 100, color: "red" }] },
      "analytics.marketplaceWeekly": { data: [{ week: "Fixture", txns: 2 }] },
      "alerts.list": { data: [{ id: 1, title: "Fixture alert", message: "Fixture message", severity: "warning", read: false }] },
    };
    const html = render(Dashboard);
    expect(html).toContain(">314<");
    expect(html).toContain(">0<");
    expect(html).toContain("Fixture alert");
    expect(html).toContain("Recorded count; trend unavailable");
    expect(fixture.charts).toContainEqual([{ month: "Fixture", avg: 44 }]);
    expect(fixture.charts).toContainEqual([{ week: "Fixture", txns: 2 }]);
    expect(html).toContain("100%"); // supplied distribution, not a fabricated certification badge
    expect(html).not.toMatch(/\+12%|\+8%|\+20%|this month|CNN-LSTM/);
  });

  it("dashboard query failures and missing counts are not mislabeled as zero, safe or empty", () => {
    for (const path of ["analytics.kpis", "analytics.sohTrend", "analytics.triageDistribution", "analytics.marketplaceWeekly", "alerts.list"])
      fixture.queries[path] = { error: { message: "Fixture denied" } };
    const html = render(Dashboard);
    for (const phrase of ["Dashboard counts unavailable", "SOH records unavailable", "Candidate records unavailable", "Marketplace records unavailable", "Alert records unavailable", "Unknown"])
      expect(html).toContain(phrase);
    expect(html).not.toContain("No SOH records returned");
    expect(html).not.toContain("No alert records returned");
    expect(html).not.toContain(">0<");
  });

  it("SOH fixture missing fields are unknown, not fabricated accuracy or reliability scores", () => {
    fixture.queries["bpan.get"] = { data: { battery: { id: 1, chemistry: "LFP", capacityKwh: 4, currentSoh: null }, latestSoh: { predictedSoh: null, confidence: null, rmse: null, rulCycles: null } } };
    const html = render(AiSoh);
    expect(html).toContain("Unknown");
    expect(html).toContain("Legacy error metadata (not validation RMSE)");
    expect(html).not.toContain("0.00000");
    expect(html).not.toContain("0.0%");
    expect(fixture.charts).toEqual([]);
    expect(pageSource("AiSoh")).not.toMatch(/metric: "Accuracy"|metric: "Reliability"|100 - \(Number\(latestPred\.rmse/);
  });

  it("SOH fixture real values and zero are preserved while candidate and heuristic metadata are qualified", () => {
    fixture.queries["bpan.get"] = { data: { battery: { id: 1, chemistry: "LFP", capacityKwh: 4 }, latestSoh: { predictedSoh: 0, confidence: 0, rmse: 0, rulCycles: 0, triagePath: "direct_reuse", triageReason: "Fixture-only reason" } } };
    const html = render(AiSoh);
    expect(html).toContain("0.0%");
    expect(html).toContain("0.00000");
    expect(html).toContain("candidate — not approved");
    expect(html).toContain("Fixture-only reason");
    expect(fixture.charts).toContainEqual([{ metric: "SOH estimate (uncalibrated)", value: 0 }]);
    expect(pageSource("AiSoh")).toContain("predictMutation.mutate({ bpan: activeBpan, batteryId: batteryData.battery.id })");
    expect(pageSource("AiSoh")).not.toContain("maxLength={19}");
  });

  it("SOH, user management and consent query errors remain explicit", () => {
    fixture.queries["bpan.get"] = { error: { message: "Fixture denied" } };
    fixture.queries["ai.predictionHistory"] = { error: { message: "Fixture denied" } };
    expect(render(AiSoh)).toContain("Battery data unavailable: Fixture denied");
    expect(render(AiSoh)).toContain("Estimate history unavailable: Fixture denied");
    fixture.queries["admin.listUsers"] = { error: { message: "Fixture denied" } };
    fixture.queries["admin.roleStats"] = { error: { message: "Fixture denied" } };
    const users = render(AdminUserManagement);
    expect(users).toContain("User records unavailable: Fixture denied");
    expect(users).toContain("User counts unavailable");
    expect(users).not.toContain("No users found");
    fixture.queries["dataSharing.listConsents"] = { error: { message: "Fixture denied" } };
    const consents = render(DataSharing);
    expect(consents).toContain("Agreement records unavailable: Fixture denied");
    expect(consents).not.toContain("No data sharing agreements yet");
  });

  it("missing administrator and consent responses are unknown, not false empty results", () => {
    const users = render(AdminUserManagement);
    expect(users).toContain("User records unknown; no response data returned");
    expect(users).not.toContain("No users found");
    const consents = render(DataSharing);
    expect(consents).toContain("Agreement records unknown; no response data returned");
    expect(consents).not.toContain("No data sharing agreements yet");
  });

  it("actual organization records and consent status are retained rather than scrubbed or certified", () => {
    fixture.queries["admin.listUsers"] = { data: { total: 1, items: [{ id: 12, name: "Fixture Person", email: "person@example.invalid", platformRole: "manufacturer", role: "user", organization: "Fixture Actual Organization" }] } };
    fixture.queries["admin.roleStats"] = { data: { total: 1, byRole: { admin: 0 } } };
    expect(render(AdminUserManagement)).toContain("Fixture Actual Organization");
    fixture.queries["dataSharing.listConsents"] = { data: [{ id: 12, scope: '["telemetry"]', status: "approved", requestMessage: "Org: Fixture Actual Organization (fixture)" }] };
    const html = render(DataSharing);
    expect(html).toContain("Fixture Actual Organization");
    expect(html).toContain("approved"); // actual internal status retained
    expect(html).toContain("A consent record alone does not prove");
    expect(pageSource("AdminUserManagement")).toContain('placeholder="e.g. Example Battery Organisation"');
    expect(pageSource("DataSharing")).toContain('placeholder="e.g. example-org or example.org"');
  });

  it("percentage chart widths are preserved; no broad percentage replacement", () => {
    expect(pageSource("Dashboard").match(/width="100%"/g)).toHaveLength(3);
    expect(pageSource("AiSoh")).toContain('width="100%"');
    expect(pageSource("Glossary")).toContain("100% means fully charged, 0% means fully discharged");
  });
});

describe("actual static wiki data — no service or database import", () => {
  it("article/category IDs and reference helpers remain available", () => {
    expect(WIKI_ARTICLES).toHaveLength(26);
    expect(new Set(WIKI_ARTICLES.map(article => article.id)).size).toBe(26);
    expect(WIKI_CATEGORIES).toHaveLength(6);
    expect(searchWiki("uncalibrated").length).toBeGreaterThan(0);
    expect(getArticlesByCategory("battery-science").map(article => article.id)).toContain("soh-prediction");
    expect(getRelatedArticles("platform-overview").map(article => article.id)).toContain("bpan-system");
    expect(searchWiki(" ")).toEqual([]);
    expect(getRelatedArticles("absent")).toEqual([]);
  });

  it.each(WIKI_ARTICLES)("$id no longer contains fabricated positive scientific, regulatory or execution claims", article => {
    const text = `${article.title}\n${article.summary}\n${article.content}`;
    expect(text).not.toMatch(brands);
    expect(text).not.toMatch(/RMSE < 2|enterprise-grade|fully agentic|prove recycling obligations have been met|seeking verified second-life|GHG Protocol compliant|None \(public\)|safe thresholds|Freely accessible|"success": true|"blockchainTxHash"/i);
    expect(article.lastUpdated).toBe("2026-11-18");
    expect(text).toMatch(/not |no |unknown|unverified|uncalibrated|require|review/i);
  });

  it("wiki prompt and technical definitions preserve unknown, measured/source and physical approval boundaries", () => {
    const prompt = getWikiSystemPrompt();
    expect(prompt).toContain("new local pilot is in development and not deployed");
    expect(prompt).toContain("Preserve unknown and error states, missing values and explicit zero");
    expect(prompt).toContain("Never approve safety, second-life, recycling");
    expect(prompt).not.toMatch(brands);
    expect(WIKI_ARTICLES.find(article => article.id === "battery-degradation")!.content).toContain("100% means fully charged");
    expect(WIKI_ARTICLES.find(article => article.id === "soh-prediction")!.content).toContain("Current measured capacity / Rated capacity × 100");
    expect(source("client/src/lib/wikiData.ts")).not.toMatch(/read_holding_registers|GPIO\d|mysql\.createConnection|curl -X POST|pip install|npx/);
  });
});


describe("remaining rendered operational claims — no fabricated success", () => {
  it("analytics retains verified zero counts but removes fabricated uptime and sustainability gains", async () => {
    const { default: Analytics } = await import("../client/src/pages/Analytics");
    fixture.queries["analytics.kpis"] = { data: { batteryStats: { total: 0 }, marketStats: { totalValueInr: 0, totalTransactions: 0 }, eprStats: { verified: 0, totalYieldKg: 0 } } };
    fixture.queries["analytics.monthlyActivity"] = { data: [] };
    fixture.queries["analytics.sohDistribution"] = { data: [] };
    fixture.queries["analytics.chemistryDistribution"] = { data: [] };
    const html = render(Analytics);
    expect(html).toContain("No measured monitor history is integrated");
    expect(html).toContain("Registration is not proof of landfill diversion");
    expect(html).not.toMatch(/99\.99|1,240|34%|Blockchain verified/);
    expect(fixture.charts).toEqual([]);
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("analytics query failures are unavailable rather than a manufactured zero fleet", async () => {
    const { default: Analytics } = await import("../client/src/pages/Analytics");
    fixture.queries["analytics.kpis"] = { error: new Error("synthetic unauthorized") };
    const html = render(Analytics);
    expect(html).toContain("unavailable data is not shown as zero");
    expect(html).not.toContain("Total Batteries");
  });
  it("the actual MQTT panel supplies no broker quickstart, test-publisher or credential form", async () => {
    const { default: MqttPanel } = await vi.importActual<any>("../client/src/components/MqttBrokerPanel");
    fixture.queries["mqtt.status"] = { data: { connected: false } };
    const html = render(MqttPanel);
    expect(html).toContain("Legacy MQTT ingestion and publishing are disabled");
    expect(html).toContain("Open local battery pilot");
    expect(html).not.toMatch(/hivemq|mqtt:\/\/|Publish Test|Password|Connect to Broker/);
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("the MQTT panel displays unavailable process status without pretending a device receipt", async () => {
    const { default: MqttPanel } = await vi.importActual<any>("../client/src/components/MqttBrokerPanel");
    fixture.queries["mqtt.status"] = { error: new Error("synthetic unreachable") };
    expect(render(MqttPanel)).toContain("No connection or reading acceptance is confirmed");
  });
  it("the actual health page does not claim all systems, provider configuration or session ratio is uptime", async () => {
    const { default: HealthPortal } = await import("../client/src/pages/HealthPortal");
    const html = render(HealthPortal);
    expect(html).toContain("Not verified");
    expect(html).toContain("snapshot; not uptime");
    expect(html).not.toMatch(/All Systems Operational|MySQL|TiDB|tamper-proof|Test sandbox active|Platform Availability/);
    expect(source("client/src/pages/HealthPortal.tsx")).toContain('fetch("/api/health"');
    expect(globalThis.fetch).not.toHaveBeenCalled(); // SSR does not execute the same-origin effect.
  });
  it("blockchain UI has no active anchor mutation or invented transaction result", async () => {
    const { default: ContentHash } = await import("../client/src/pages/BlockchainAudit");
    const html = render(ContentHash);
    expect(html).toContain("Blockchain anchoring is disabled");
    expect(html).toContain("does not prove authenticity");
    expect(html).not.toMatch(/polygon-mumbai|Anchored Successfully|Anchor to Blockchain|tamper-free/);
    expect(source("client/src/pages/BlockchainAudit.tsx")).not.toContain("blockchain.anchor");
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("the EPR page identifies legacy data and has matching tonne units instead of claiming an active network", async () => {
    const { default: EprCompliance } = await import("../client/src/pages/EprCompliance");
    const html = render(EprCompliance);
    expect(html).toContain("Legacy records");
    expect(html).toContain("Recorded Yield (t)");
    expect(html).not.toMatch(/Hyperledger Fabric v2\.5|EPRTokenCC|PBFT|automatically issued upon/);
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("logistics and terms no longer publish unmeasured SLA, model accuracy or uptime promises", () => {
    expect(source("client/src/pages/Logistics.tsx")).not.toMatch(/SLA BREACH|Pickup requested! SLA|Hazmat dispatch · GPS/);
    const terms = source("client/src/pages/Terms.tsx");
    expect(terms).not.toMatch(/RMSE of less than 2%|99\.5% platform uptime/);
    expect(terms).toContain("New checkout and settlement are disabled");
  });
});
