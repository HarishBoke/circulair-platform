/**
 * PlatformSettingsContext
 *
 * Provides locale, currency, timezone, and active jurisdictions
 * to the entire React tree. Settings are loaded from the backend
 * (trpc.platformSettings.get) and cached in context.
 *
 * Usage:
 *   const { displayCurrency, formatCurrency, locale, activeJurisdictions } = usePlatformSettings();
 */
import React, { createContext, useContext, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { CURRENCIES } from "@shared/currencies";
import { JURISDICTIONS } from "@shared/jurisdictions";

export interface PlatformSettingsContextValue {
  /** BCP-47 locale string, e.g. "en-IN", "de-DE" */
  locale: string;
  /** ISO 4217 currency code, e.g. "INR", "EUR" */
  displayCurrency: string;
  /** IANA timezone, e.g. "Asia/Kolkata" */
  timezone: string;
  /** Active jurisdiction codes the user has enabled, e.g. ["IN", "EU"] */
  activeJurisdictions: string[];
  /** Data residency region */
  dataResidencyRegion: string;
  /** Organisation name */
  organisationName: string | null;
  /** ISO 3166-1 alpha-2 country code */
  organisationCountry: string | null;

  /** Format a number as currency in the user's display currency */
  formatCurrency: (amount: number, currency?: string) => string;
  /** Format a UTC timestamp as a localised date string */
  formatDate: (ts: number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  /** Whether settings are still loading */
  isLoading: boolean;
}

const defaultSettings: PlatformSettingsContextValue = {
  locale: "en-IN",
  displayCurrency: "INR",
  timezone: "Asia/Kolkata",
  activeJurisdictions: ["IN"],
  dataResidencyRegion: "in",
  organisationName: null,
  organisationCountry: null,
  formatCurrency: (amount, currency = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount),
  formatDate: (ts, opts) =>
    new Date(ts).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts }),
  isLoading: false,
};

const PlatformSettingsContext = createContext<PlatformSettingsContextValue>(defaultSettings);

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.platformSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const value = useMemo<PlatformSettingsContextValue>(() => {
    const locale = data?.locale ?? "en-IN";
    const displayCurrency = data?.displayCurrency ?? "INR";
    const timezone = data?.timezone ?? "Asia/Kolkata";

    const formatCurrency = (amount: number, currency?: string): string => {
      const cur = currency ?? displayCurrency;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: cur,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${cur} ${amount.toFixed(2)}`;
      }
    };

    const formatDate = (ts: number | Date, opts?: Intl.DateTimeFormatOptions): string => {
      try {
        return new Date(ts).toLocaleDateString(locale, { timeZone: timezone, ...opts });
      } catch {
        return new Date(ts).toLocaleDateString();
      }
    };

    return {
      locale,
      displayCurrency,
      timezone,
      activeJurisdictions: (data?.activeJurisdictions as string[]) ?? ["IN"],
      dataResidencyRegion: data?.dataResidencyRegion ?? "in",
      organisationName: data?.organisationName ?? null,
      organisationCountry: data?.organisationCountry ?? null,
      formatCurrency,
      formatDate,
      isLoading,
    };
  }, [data, isLoading]);

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettingsContextValue {
  return useContext(PlatformSettingsContext);
}
