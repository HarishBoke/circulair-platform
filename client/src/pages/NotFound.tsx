import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function NotFound() {
  usePageTitle("Page Not Found");

  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="bg-grid" />
      <ThemeToggle />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      <div className="relative z-10 text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="font-display text-6xl font-bold text-foreground mb-2">404</h1>

        <h2 className="text-lg font-semibold text-foreground mb-3">
          Page Not Found
        </h2>

        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground/40">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/30 to-chart-2/30 flex items-center justify-center">
            <Zap className="w-3 h-3" />
          </div>
          <span className="font-mono text-[10px] tracking-widest uppercase">Circul-AI-r</span>
        </div>
      </div>
    </div>
  );
}
