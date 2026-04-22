/**
 * CookieConsent — GDPR-compliant cookie consent banner.
 *
 * Behaviour:
 * - Appears on first visit (no stored preference).
 * - Stores choice in localStorage under "cookie_consent".
 * - Logs consent to the server via tRPC for GDPR Article 7 accountability.
 * - Fires a custom "cookieConsentChange" window event so analytics scripts
 *   can react without polling localStorage.
 * - Exposes "openCookieConsent" window event to re-open from any footer link.
 */

import { useState, useEffect } from "react";
import { X, Cookie, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";

export type ConsentLevel = "all" | "essential" | null;

const CONSENT_KEY = "cookie_consent";

export function getConsentLevel(): ConsentLevel {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "all" || stored === "essential") return stored;
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return getConsentLevel() === "all";
}

function dispatchConsentEvent(level: ConsentLevel) {
  window.dispatchEvent(
    new CustomEvent("cookieConsentChange", { detail: { level } })
  );
}

/** Simple SHA-256 fingerprint of IP+UA for anonymous tracking (no PII stored) */
async function buildFingerprint(): Promise<string> {
  try {
    const raw = navigator.userAgent.slice(0, 200);
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 64);
  } catch {
    return "";
  }
}

interface CookieConsentProps {
  onConsentChange?: (level: ConsentLevel) => void;
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const logConsent = trpc.consent.log.useMutation();

  useEffect(() => {
    if (!getConsentLevel()) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("openCookieConsent", handler);
    return () => window.removeEventListener("openCookieConsent", handler);
  }, []);

  const save = async (level: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, level);
    dispatchConsentEvent(level);
    onConsentChange?.(level);
    setVisible(false);

    // Log consent to server for GDPR Article 7 accountability
    try {
      const fingerprint = await buildFingerprint();
      await logConsent.mutateAsync({
        level: level === "all" ? "all" : "essential",
        analytics: level === "all",
        marketing: false,
        source: "banner",
        userAgent: navigator.userAgent.slice(0, 512),
        fingerprint,
      });
    } catch {
      // Non-blocking — consent is still saved locally even if server log fails
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
            <Cookie className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white leading-snug">
              We use cookies
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              We use essential cookies to keep the platform running and, with your
              permission, analytics cookies to understand how it's used so we can
              improve it. We never sell your data.{" "}
              <a
                href="/privacy"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>
          <button
            onClick={() => save("essential")}
            aria-label="Dismiss and use essential cookies only"
            className="shrink-0 p-1 text-muted-foreground/70 hover:text-foreground transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expandable cookie details */}
        <div className="px-5">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors py-1"
          >
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {showDetails ? "Hide details" : "Show cookie details"}
          </button>

          {showDetails && (
            <div className="mt-2 mb-3 space-y-2 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/40">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Essential cookies</p>
                  <p className="text-muted-foreground mt-0.5">
                    Authentication session, CSRF protection, and platform
                    preferences. Always active — cannot be disabled.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full self-start">
                  Always on
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/40">
                <Cookie className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Analytics cookies</p>
                  <p className="text-muted-foreground mt-0.5">
                    Anonymised page-view and interaction data via Umami Analytics
                    (self-hosted, no cross-site tracking, no personal data
                    collected).
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-secondary/70/40 px-2 py-0.5 rounded-full self-start">
                  Optional
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 px-5 pb-5 pt-2">
          <button
            onClick={() => save("essential")}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-lg transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={() => save("all")}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            Accept all cookies
          </button>
          <p className="text-[10px] text-muted-foreground/60 sm:ml-auto text-center sm:text-right">
            You can change your preference at any time via the footer.
          </p>
        </div>
      </div>
    </div>
  );
}
