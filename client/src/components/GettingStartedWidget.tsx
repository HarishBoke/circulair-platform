import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowRight,
  Rocket, X, ExternalLink,
} from "lucide-react";

/* ─── Step category groupings for visual clarity ─── */
const STEP_GROUPS: { label: string; color: string; keys: string[] }[] = [
  {
    label: "Platform Basics",
    color: "text-chart-2",
    keys: ["explore_dashboard", "register_battery", "view_telemetry", "check_soh"],
  },
  {
    label: "Operations",
    color: "text-chart-4",
    keys: ["register_warranty", "check_warranty", "explore_marketplace", "view_compliance"],
  },
  {
    label: "AI & Knowledge",
    color: "text-chart-3",
    keys: ["explore_wiki", "try_ai_assistant"],
  },
  {
    label: "Developer Setup",
    color: "text-primary",
    keys: ["issue_api_key", "explore_api_reference", "register_webhook", "configure_mcp"],
  },
];

type Step = {
  key: string;
  title: string;
  description: string;
  href: string;
  order: number;
  completed: boolean;
};

/* ─── Individual step row ─── */
function StepRow({ step, onComplete }: { step: Step; onComplete: (key: string) => void }) {
  return (
    <div className={`flex items-start gap-3 py-2 group ${step.completed ? "opacity-60" : ""}`}>
      <button
        onClick={() => !step.completed && onComplete(step.key)}
        aria-label={step.completed ? `${step.title} - completed` : `Mark "${step.title}" as complete`}
        className="mt-0.5 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-primary rounded-full"
      >
        {step.completed
          ? <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
          : <Circle className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" aria-hidden="true" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <Link href={step.href}>
          <span className={`text-sm font-medium leading-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-1 ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {step.title}
            {!step.completed && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" aria-hidden="true" />}
          </span>
        </Link>
        {!step.completed && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main widget ─── */
export default function GettingStartedWidget() {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("cai_gs_dismissed") === "1"; } catch { return false; }
  });
  const [activeGroup, setActiveGroup] = useState(0);

  const { data: steps, isLoading } = trpc.tutorial.progress.useQuery(undefined, {
    staleTime: 30_000,
  });

  const utils = trpc.useUtils();
  const completeMutation = trpc.tutorial.complete.useMutation({
    onSuccess: () => utils.tutorial.progress.invalidate(),
  });

  if (dismissed || isLoading || !steps) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  // Find the first incomplete step to highlight as "next action"
  const nextStep = steps.find((s) => !s.completed);

  function handleDismiss() {
    try { localStorage.setItem("cai_gs_dismissed", "1"); } catch { /* noop */ }
    setDismissed(true);
  }

  function handleComplete(key: string) {
    completeMutation.mutate({ stepKey: key });
  }

  // Filter steps for the active group
  const groupKeys = STEP_GROUPS[activeGroup]?.keys ?? [];
  const groupSteps = groupKeys
    .map((k) => steps.find((s) => s.key === k))
    .filter((s): s is NonNullable<typeof s> & Step => s != null);

  return (
    <div
      className="bg-card border border-border/60 rounded-xl shadow-[0_1px_4px_oklch(0_0_0/0.25)] overflow-hidden"
      role="region"
      aria-label="Getting Started progress"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Getting Started</h2>
            {allDone && (
              <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                Complete!
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${completedCount} of ${totalCount} steps completed`}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span
              className="font-mono text-[10px] text-muted-foreground flex-shrink-0"
              aria-live="polite"
              aria-atomic="true"
            >
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse getting started widget" : "Expand getting started widget"}
            aria-expanded={expanded}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
              : <ChevronDown className="w-4 h-4" aria-hidden="true" />
            }
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss getting started widget"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collapsed summary — show next step only */}
      {!expanded && nextStep && (
        <div className="px-5 py-3 flex items-center gap-3">
          <Circle className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
            Next: <span className="text-foreground font-medium">{nextStep.title}</span>
          </span>
          <Link href={nextStep.href}>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary text-xs gap-1 flex-shrink-0">
              Go <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      )}

      {/* Collapsed all-done state */}
      {!expanded && allDone && (
        <div className="px-5 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          <span>All steps complete - you're ready to go!</span>
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 py-4">
          {/* Group tabs */}
          <div className="flex gap-1 mb-4 flex-wrap" role="tablist" aria-label="Step categories">
            {STEP_GROUPS.map((group, idx) => {
              const groupCompleted = group.keys.every(
                (k) => steps.find((s) => s.key === k)?.completed
              );
              return (
                <button
                  key={group.label}
                  role="tab"
                  aria-selected={activeGroup === idx}
                  onClick={() => setActiveGroup(idx)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${activeGroup === idx
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }
                  `}
                >
                  {groupCompleted && (
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{group.label}</span>
                </button>
              );
            })}
          </div>

          {/* Steps list for active group */}
          <div role="tabpanel" aria-label={STEP_GROUPS[activeGroup]?.label}>
            <div className="divide-y divide-border/30">
              {groupSteps.map((step) => (
                <StepRow key={step.key} step={step} onComplete={handleComplete} />
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {allDone
                ? "All steps complete - great work!"
                : `${totalCount - completedCount} step${totalCount - completedCount !== 1 ? "s" : ""} remaining`
              }
            </span>
            <Link href="/getting-started">
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5">
                Full Guide <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
