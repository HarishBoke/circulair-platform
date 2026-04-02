/**
 * CookieConsent — GDPR-compliant cookie consent banner.
 *
 * Behaviour:
 * - Appears on first visit (no stored preference).
 * - Stores choice in localStorage under "cookie_consent" as:
 *     "all"       — analytics + functional cookies accepted
 *     "essential" — only strictly necessary cookies
 * - Exposes a "Manage Cookies" link in the footer to re-open the banner.
 * - Fires a custom "cookieConsentChange" window event so analytics scripts
 *   can react without polling localStorage.
 */

import { useState, useEffect } from "react";
import { X, Cookie, ChevronDown, ChevronUp, Shield } from "lucide-react";

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

interface CookieConsentProps {
  onConsentChange?: (level: ConsentLevel) => void;
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show banner only if no preference has been stored yet
    if (!getConsentLevel()) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Allow external trigger (e.g. "Manage Cookies" footer link)
  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("openCookieConsent", handler);
    return () => window.removeEventListener("openCookieConsent", handler);
  }, []);

  const save = (level: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, level);
    dispatchConsentEvent(level);
    onConsentChange?.(level);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
            <Cookie className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white leading-snug">
              We use cookies
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
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
            className="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expandable cookie details */}
        <div className="px-5">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/40">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Essential cookies</p>
                  <p className="text-zinc-400 mt-0.5">
                    Authentication session, CSRF protection, and platform
                    preferences. Always active — cannot be disabled.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full self-start">
                  Always on
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/40">
                <Cookie className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Analytics cookies</p>
                  <p className="text-zinc-400 mt-0.5">
                    Anonymised page-view and interaction data via Umami Analytics
                    (self-hosted, no cross-site tracking, no personal data
                    collected).
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-zinc-400 bg-zinc-700/40 px-2 py-0.5 rounded-full self-start">
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
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={() => save("all")}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            Accept all cookies
          </button>
          <p className="text-[10px] text-zinc-600 sm:ml-auto text-center sm:text-right">
            You can change your preference at any time via the footer.
          </p>
        </div>
      </div>
    </div>
  );
}
