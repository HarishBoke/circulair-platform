/**
 * GettingStarted — Interactive guided walkthrough that tracks progress
 * via backend (tutorial.progress / tutorial.complete).
 * Each step links to a real platform page and can be marked complete.
 */
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import {
  Rocket,
  CheckCircle2,
  Circle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Sparkles,
  ChevronRight,
  Battery,
  Activity,
  Brain,
  ShieldCheck,
  ShoppingCart,
  BookOpen,
  Bot,
  BarChart3,
  Loader2,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── STEP ICON MAP ──────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  explore_dashboard: BarChart3,
  register_battery: Battery,
  view_telemetry: Activity,
  check_soh: Brain,
  register_warranty: ShieldCheck,
  check_warranty: ShieldCheck,
  explore_marketplace: ShoppingCart,
  view_compliance: ShieldCheck,
  explore_wiki: BookOpen,
  try_ai_assistant: Bot,
};

const STEP_COLORS: Record<string, string> = {
  explore_dashboard: "#3b82f6",
  register_battery: "#10b981",
  view_telemetry: "#06b6d4",
  check_soh: "#8b5cf6",
  register_warranty: "#f59e0b",
  check_warranty: "#f97316",
  explore_marketplace: "#ec4899",
  view_compliance: "#6366f1",
  explore_wiki: "#14b8a6",
  try_ai_assistant: "#a855f7",
};

export default function GettingStarted() {
  usePageTitle("Getting Started");
  useStructuredData({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Getting Started with Circul-AI-r",
    "url": "https://www.circulair.energy/getting-started",
    "description": "Quick start guide for battery manufacturers, OEMs, recyclers, and fleet operators to onboard batteries, generate passports, and leverage AI-driven lifecycle intelligence.",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.circulair.energy/" },
        { "@type": "ListItem", "position": 2, "name": "Getting Started", "item": "https://www.circulair.energy/getting-started" }
      ]
    }
  });

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [celebrateStep, setCelebrateStep] = useState<string | null>(null);

  const { data: progress, isLoading, refetch } = trpc.tutorial.progress.useQuery(
    undefined,
    { enabled: !!user }
  );

  const completeMutation = trpc.tutorial.complete.useMutation({
    onSuccess: () => refetch(),
  });

  const resetMutation = trpc.tutorial.reset.useMutation({
    onSuccess: () => refetch(),
  });

  const handleComplete = (stepKey: string) => {
    setCelebrateStep(stepKey);
    completeMutation.mutate({ stepKey });
    setTimeout(() => setCelebrateStep(null), 1500);
  };

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Getting Started</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to begin your guided tour of the Circul-AI-r platform. We'll walk you through
            every key feature step by step.
          </p>
          <Button
            onClick={() => (window.location.href = "/login")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Sign In to Start
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !progress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const completedCount = progress.filter((s) => s.completed).length;
  const totalSteps = progress.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allComplete = completedCount === totalSteps;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-zinc-950 to-violet-900/10" />
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-12 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Getting Started</h1>
              <p className="text-sm text-muted-foreground">Your guided tour of the Circul-AI-r platform</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {allComplete ? (
                  <Trophy className="w-5 h-5 text-amber-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-sm font-medium text-white">
                  {allComplete
                    ? "Congratulations! You've completed the tour!"
                    : `${completedCount} of ${totalSteps} steps completed`}
                </span>
              </div>
              <span className="text-sm font-mono text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: allComplete
                    ? "linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981)"
                    : "linear-gradient(90deg, #10b981, #14b8a6)",
                }}
              />
            </div>
            {allComplete && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground/70">
                  You've explored all key features. Feel free to revisit any step or reset to start over.
                </p>
                <button
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground/90 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-3">
          {progress.map((step, index) => {
            const StepIcon = STEP_ICONS[step.key] || Circle;
            const color = STEP_COLORS[step.key] || "#6b7280";
            const isCelebrating = celebrateStep === step.key;
            const isNext = !step.completed && index === progress.findIndex((s) => !s.completed);

            return (
              <div
                key={step.key}
                className={`relative flex items-start gap-4 p-5 rounded-xl border transition-all duration-300 ${
                  step.completed
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : isNext
                    ? "bg-white/[0.04] border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                } ${isCelebrating ? "scale-[1.02] shadow-xl shadow-emerald-500/20" : ""}`}
              >
                {/* Step number / check */}
                <div className="relative shrink-0">
                  {step.completed ? (
                    <div className={`w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center ${isCelebrating ? "animate-bounce" : ""}`}>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <StepIcon className="w-5 h-5 text-current" />
                    </div>
                  )}
                  {/* Connector line */}
                  {index < progress.length - 1 && (
                    <div className={`absolute left-5 top-12 w-px h-6 ${step.completed ? "bg-emerald-500/30" : "bg-white/5"}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                      Step {index + 1}
                    </span>
                    {isNext && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Next
                      </span>
                    )}
                    {step.completed && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  <h3 className={`font-medium ${step.completed ? "text-emerald-300" : "text-white"}`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!step.completed && (
                    <button
                      onClick={() => handleComplete(step.key)}
                      disabled={completeMutation.isPending}
                      className="px-3 py-1.5 text-xs border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      Mark Done
                    </button>
                  )}
                  <button
                    onClick={() => handleNavigate(step.href)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isNext
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-white/5 hover:bg-white/10 text-foreground/90"
                    }`}
                  >
                    {step.completed ? "Revisit" : "Go"}
                    {isNext ? <ArrowRight className="w-3.5 h-3.5" /> : <ExternalLink className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick tips */}
        <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Pro Tips</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-blue-400 font-bold">1</span>
              </div>
              <div>
                <p className="text-sm text-foreground/90 font-medium">Start with Battery Registration</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Register a test battery to see how BPAN generation, telemetry, and warranty all connect.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-violet-400 font-bold">2</span>
              </div>
              <div>
                <p className="text-sm text-foreground/90 font-medium">Use the AI Assistant</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Ask the AI about any platform feature - it understands batteries, compliance, and APIs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-emerald-400 font-bold">3</span>
              </div>
              <div>
                <p className="text-sm text-foreground/90 font-medium">Explore CirculWiki</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  The knowledge base has 24 articles covering everything from battery chemistry to API integration.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-amber-400 font-bold">4</span>
              </div>
              <div>
                <p className="text-sm text-foreground/90 font-medium">Check Compliance Status</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Review your EPR compliance dashboard to understand regulatory obligations across jurisdictions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
