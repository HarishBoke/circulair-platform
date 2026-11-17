import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertClaimsFeatureAvailable } from "./claimsFeatureGate";

const captured = vi.hoisted(() => ({ structuredData: [] as unknown[], navigate: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false, loading: false }) }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("@/hooks/useStructuredData", () => ({ useStructuredData: (data: unknown) => captured.structuredData.push(data) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { invalidate: captured.invalidate } } }) } }));
vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => createElement("a", props, children),
  useLocation: () => ["/login", captured.navigate],
}));
vi.mock("@/components/CirculairLogo", () => ({ default: () => createElement("span", { "aria-label": "Circul-AI-r" }) }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, variant, size, ...props }: any) => createElement("button", props, children) }));
vi.mock("@/components/ui/input", () => ({ Input: (props: any) => createElement("input", props) }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: any) => createElement("textarea", props) }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: any) => createElement("label", props, children) }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children, variant, ...props }: any) => createElement("span", props, children) }));

import Home from "../client/src/pages/Home";
import HowItWorks from "../client/src/pages/HowItWorks";
import Login from "../client/src/pages/Login";
import Register from "../client/src/pages/Register";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

beforeEach(() => {
  captured.structuredData.length = 0;
  vi.clearAllMocks();
  // Vitest's existing config uses classic JSX, unlike the app's Vite JSX plugin.
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", () => { throw new Error("Network forbidden in offline claim tests"); });
});
afterEach(() => vi.unstubAllGlobals());

describe("offline public claim boundaries", () => {
  it.each([["Home", Home], ["HowItWorks", HowItWorks], ["Login", Login], ["Register", Register]] as const)(
    "%s renders without unsupported neural, availability or certification promises", (_name, Page) => {
      const html = renderToStaticMarkup(createElement(Page));
      expect(html).not.toMatch(/CNN-LSTM|less than 2%|RMSE\s*(?:&lt;|<)\s*2|Full Compliance|99\.99|Multi-Region|compliant from day one|trained on millions/i);
      expect(html).not.toContain("100%");
      expect(html).toMatch(/pilot/i);
      expect(html).toMatch(/unvalidated|accuracy not validated/i);
      expect(html).toMatch(/draft|not certified|no certification|no ISO certification/i);
    },
  );

  it.each(["Home", "HowItWorks", "Login", "Register"])("%s contains no vendor runtime or specific battery/fleet brand", (name) => {
    expect(source(`client/src/pages/${name}.tsx`)).not.toMatch(/\b(?:manus|tata|tesla|byd|catl|nissan|toyota|panasonic|mahindra)\b/i);
    expect(source(`client/src/pages/${name}.tsx`)).toContain("Local battery identification and QR records");
    expect(source(`client/src/pages/${name}.tsx`)).toContain("official BPAN enrollment not verified");
  });

  it("Home contact rendering is disabled and cannot call an unverified success endpoint", () => {
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>/);
    expect(html).toContain("Sending unavailable");
    expect(html).toContain("Local draft only");
    const text = source("client/src/pages/Home.tsx");
    expect(text).not.toMatch(/useMutation|\.mutate\(|fetch\(|Message sent|Message Received|1 business day/);
    expect(text).toContain("Nothing has been sent or saved.");
  });

  it("Home structured metadata has factual states and no free offer or coverage certification", () => {
    renderToStaticMarkup(createElement(Home));
    const metadata = JSON.stringify(captured.structuredData);
    expect(metadata).toContain("unvalidated accuracy");
    expect(metadata).toContain("hardware acceptance pending");
    expect(metadata).toContain("no verified carrier dispatch");
    expect(metadata).not.toMatch(/CNN-LSTM|7 jurisdictions|offers|priceCurrency|www\.circulair/);
  });

  it("HowItWorks structured metadata makes no free-cost or setup-duration promise", () => {
    renderToStaticMarkup(createElement(HowItWorks));
    const metadata = JSON.stringify(captured.structuredData);
    expect(metadata).toContain("bounded");
    expect(metadata).not.toMatch(/totalTime|estimatedCost|PT2H|www\.circulair/);
  });

  it("HowItWorks preserves pilot safety, synthetic-data and unanchored-evidence notices", () => {
    const html = renderToStaticMarkup(createElement(HowItWorks));
    for (const phrase of ["not an emergency cutoff", "Synthetic telemetry", "No real blockchain anchoring", "qualified supervision", "no autonomous approval"]) {
      expect(html).toContain(phrase);
    }
    expect(source("client/src/pages/HowItWorks.tsx")).not.toMatch(/<Link[^>]*>\s*<a/);
  });

  it.each([["Login", "login"], ["Register", "register"]])("%s native credential submission and validation remain unchanged", (name, endpoint) => {
    const text = source(`client/src/pages/${name}.tsx`);
    expect(text).toContain(`fetch("/api/auth/${endpoint}"`);
    expect(text).toContain('credentials: "include"');
    expect(text).toContain('await utils.auth.me.invalidate()');
    expect(text).toContain('navigate("/dashboard")');
    expect(text).toContain('type="submit"');
    expect(text).toContain('disabled={loading}');
    if (name === "Register") {
      expect(text).toContain('password !== confirmPassword');
      expect(text).toContain('password.length < 8');
      expect(text).toContain('name: name.trim() || undefined, email, password');
    } else {
      expect(text).toContain('JSON.stringify({ email, password })');
    }
  });

  it("compliance guide distinguishes implementation, draft evidence and acceptance", () => {
    const text = source("docs/COMPLIANCE_GUIDE.md");
    for (const phrase of ["no weight-delta training", "generated transaction-like values are demo/unanchored", "not downloaded", "not service uptime", "no physical tests were run", "new source corrections have not been deployed"]) {
      expect(text).toContain(phrase);
    }
    expect(text).not.toContain("Input validation on all API endpoints");
  });
});

describe("offline proposed execution/training gate helper", () => {
  it.each(["agentExecution", "federatedTraining"] as const)("%s fails closed with no external or persistence dependency", (feature) => {
    const network = vi.fn(() => { throw new Error("network forbidden"); });
    vi.stubGlobal("fetch", network);
    try {
      expect(() => assertClaimsFeatureAvailable(feature)).toThrow(/unavailable/);
      try { assertClaimsFeatureAvailable(feature); } catch (error: any) {
        expect(error.code).toBe("PRECONDITION_FAILED");
        expect(error.message).toMatch(/No .* performed|No model weights/);
      }
      expect(network).not.toHaveBeenCalled();
      expect(source("server/claimsFeatureGate.ts")).not.toMatch(/getDb\(|fetch\(|process\.env|import .*\.\/db/);
    } finally { vi.unstubAllGlobals(); }
  });
});
