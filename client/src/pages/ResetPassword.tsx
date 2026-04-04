import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, ArrowLeft, Lock, Shield, CheckCircle2,
  AlertCircle, Eye, EyeOff, Loader2,
} from "lucide-react";
import CirculairLogo from "@/components/CirculairLogo";

type TokenState = "validating" | "valid" | "invalid";

export default function ResetPassword() {
  usePageTitle("Reset Password");

  const [, navigate] = useLocation();

  // Extract token from query string
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [tokenState, setTokenState] = useState<TokenState>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        setTokenState(data.valid ? "valid" : "invalid");
      })
      .catch(() => setTokenState("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: "", color: "bg-muted", width: "w-0" };
    if (pw.length < 8) return { label: "Too short", color: "bg-destructive", width: "w-1/4" };
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSpec = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length;
    if (score <= 1) return { label: "Weak", color: "bg-destructive", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-chart-2", width: "w-3/4" };
    return { label: "Strong", color: "bg-primary", width: "w-full" };
  };
  const strength = getStrength(password);

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
            Set a New{" "}
            <span className="text-primary">Password</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            Choose a strong password to protect your Circul-AI-r account. Your
            reset link is valid for 15 minutes and can only be used once.
          </p>

          <div className="space-y-4">
            {[
              { icon: Lock, title: "Minimum 8 Characters", desc: "Use a mix of letters, numbers, and symbols for best security" },
              { icon: Shield, title: "Bcrypt Hashed", desc: "Passwords are hashed with bcrypt before storage — never stored in plain text" },
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

      {/* Right side — form */}
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

              {/* ── Validating ── */}
              {tokenState === "validating" && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Validating reset link…</p>
                </div>
              )}

              {/* ── Invalid token ── */}
              {tokenState === "invalid" && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2">Link Expired</h2>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    This password reset link is invalid or has expired. Reset links are
                    valid for 15 minutes and can only be used once.
                  </p>
                  <Link href="/forgot-password">
                    <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mb-3">
                      Request New Reset Link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="w-full h-11 rounded-xl">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              )}

              {/* ── Success ── */}
              {tokenState === "valid" && success && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2">Password Updated</h2>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    Your password has been reset successfully. Redirecting you to sign in…
                  </p>
                  <Link href="/login">
                    <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                      Sign In Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* ── Reset form ── */}
              {tokenState === "valid" && !success && (
                <>
                  <h2 className="font-display text-2xl font-bold mb-2">Set New Password</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Choose a strong password for your account.
                  </p>

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
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
                      {/* Strength bar */}
                      {password.length > 0 && (
                        <div className="space-y-1">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{strength.label}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          className="h-11 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && password !== confirmPassword && (
                        <p className="text-[11px] text-destructive">Passwords do not match</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {loading ? "Updating Password..." : "Update Password"}
                      {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Sign In
                    </Link>
                  </div>
                </>
              )}
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
