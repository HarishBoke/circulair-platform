/**
 * OnboardingWizard — A first-login walkthrough that introduces the platform.
 * Shows once per user (tracked via localStorage). Dismissed permanently on completion or skip.
 */
import { useState } from "react";
import {
  Battery, ShoppingCart, BarChart3, Shield, Globe, Leaf, ArrowRight, ArrowLeft, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "circularir_onboarding_complete";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Welcome to Circul-AI-r",
    description:
      "A unified platform for battery lifecycle management - from registration and real-time monitoring to second-life marketplace and regulatory compliance. Let us show you around.",
    color: "text-primary",
  },
  {
    icon: <Battery className="w-8 h-8" />,
    title: "Battery Registry",
    description:
      "Register battery packs with BPAN IDs, track chemistry, capacity, and manufacturer details. Each battery gets a unique digital identity that follows it through its entire lifecycle.",
    color: "text-emerald-400",
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Live Telemetry & SOH",
    description:
      "Monitor voltage, current, temperature, and State of Health in real time via MQTT. AI-powered predictions flag degradation early so you can act before failures happen.",
    color: "text-blue-400",
  },
  {
    icon: <ShoppingCart className="w-8 h-8" />,
    title: "Second-Life Marketplace",
    description:
      "List batteries for reuse, repurposing, or recycling. Multi-currency support lets you trade globally. Every listing includes verified SOH data for transparent pricing.",
    color: "text-amber-400",
  },
  {
    icon: <Leaf className="w-8 h-8" />,
    title: "Carbon & Recycled Content",
    description:
      "Declare carbon footprint across 4 lifecycle stages and recycled content for Co, Li, Ni, and Pb. Automatic A–E performance class calculation per EU Battery Regulation.",
    color: "text-green-400",
  },
  {
    icon: <Globe className="w-8 h-8" />,
    title: "Multinational Compliance",
    description:
      "Built for EU Battery Passport, India BPAN, China MIIT, and US IRA. Configure jurisdictions, currencies, and data residency per your operating region.",
    color: "text-violet-400",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Role-Based Access",
    description:
      "Seven platform roles (OEM, Manufacturer, Recycler, BESS Developer, Government, Service Provider, Admin) control what each user sees and can do. Your admin manages roles from the User Management page.",
    color: "text-rose-400",
  },
];

export default function OnboardingWizard() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });
  const [step, setStep] = useState(0);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-8 pt-10 pb-6 text-center">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary border border-border mb-6 ${current.color}`}>
            {current.icon}
          </div>

          {/* Step indicator */}
          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {current.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "bg-primary w-4" : i < step ? "bg-primary/40" : "bg-secondary/70"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-8 pb-8">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Skip tour
            </button>
          )}

          {isLast ? (
            <Button onClick={dismiss} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6">
              Get Started
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => s + 1)}
              size="sm"
              variant="outline"
              className="text-xs px-4 border-border text-foreground hover:bg-secondary"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
