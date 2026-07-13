import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, Lock, Globe, Shield, Battery, Brain,
  ShoppingCart, Eye, EyeOff, Loader2, Sun, Moon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import CirculairLogo from "@/components/CirculairLogo";
import { useTheme } from "@/contexts/ThemeContext";

export default function Login() {
  usePageTitle("Login");

  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Invalidate auth cache so useAuth picks up the new session
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />
      {/* Theme toggle — top right corner */}
      <button
        onClick={(e) => toggleTheme?.(e)}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Left side — branding & features */}
      <div className="hidden lg:flex flex-col justify-center flex-1 relative z-10 px-12 xl:px-20">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <CirculairLogo size={36} />
            <div>
              <div className="font-display text-2xl font-bold leading-tight">
                Circul<span className="text-primary">-AI-</span>r
              </div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                Battery Intelligence Platform
              </div>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold mb-4 leading-tight">
            The Operating System for{" "}
            <span className="text-primary">Battery Circular Economy</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            End-to-end traceability, AI-driven health prediction, and regulatory
            compliance across 7 jurisdictions.
          </p>

          <div className="space-y-4">
            {[
              { icon: Battery, title: "Battery Registry", desc: "19-character BPAN generation with QR codes and lifecycle tracking" },
              { icon: Brain, title: "AI SOH Prediction", desc: "CNN-LSTM models with less than 2% RMSE for health estimation" },
              { icon: Shield, title: "Regulatory Compliance", desc: "EU Battery Passport, India BWMR, China MIIT adapters" },
              { icon: ShoppingCart, title: "Second-Life Marketplace", desc: "Multi-currency marketplace with dynamic spot pricing" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-0.5">{feature.title}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />

            <div className="p-8">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <CirculairLogo size={30} />
                <div>
                  <div className="font-display text-lg font-bold leading-tight">
                    Circul<span className="text-primary">-AI-</span>r
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
                    Battery Intelligence
                  </div>
                </div>
              </div>

              <h2 className="font-display text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Sign in to access the battery intelligence platform.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Signing In..." : "Sign In"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Create Account
                  </Link>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-6 text-muted-foreground">
                  {[
                    { icon: Lock, label: "Encrypted" },
                    { icon: Globe, label: "Multi-Region" },
                    { icon: Shield, label: "RBAC" },
                  ].map((badge) => (
                    <div key={badge.label} className="flex items-center gap-1.5">
                      <badge.icon className="w-3 h-3 text-primary/60" />
                      <span className="font-mono text-[9px] tracking-wider uppercase">
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4 font-mono">
            Role-based access for OEM, Manufacturer, Recycler, BESS Developer, Government
          </p>
        </div>
      </div>
    </div>
  );
}
