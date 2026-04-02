import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, Lock, Globe, Shield, Eye, EyeOff, Loader2, UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import CirculairLogo from "@/components/CirculairLogo";

export default function Register() {
  usePageTitle("Sign Up");

  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
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

      {/* Left side — branding */}
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
            Join the{" "}
            <span className="text-primary">Battery Intelligence</span>{" "}
            Revolution
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            Create your account to access battery lifecycle management, AI-powered
            health predictions, and compliance tools across 7 jurisdictions.
          </p>

          <div className="space-y-3">
            {[
              "Full BPAN registry with QR codes",
              "Real-time IoT telemetry monitoring",
              "AI-powered SOH prediction (< 2% RMSE)",
              "Multi-currency second-life marketplace",
              "ISO 27001 / SOC 2 compliance framework",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — register form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
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

              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">Create Account</h2>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Set up your account to get started with the platform.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="h-11 rounded-xl"
                  />
                </div>

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
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Creating Account..." : "Create Account"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign In
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
        </div>
      </div>
    </div>
  );
}
