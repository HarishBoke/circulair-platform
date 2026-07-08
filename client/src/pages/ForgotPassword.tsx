import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Mail, Lock, Shield, CheckCircle2, Loader2 } from "lucide-react";
import CirculairLogo from "@/components/CirculairLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function ForgotPassword() {
  usePageTitle("Forgot Password");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send reset link");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="bg-grid" />
      <ThemeToggle />
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
            Account{" "}
            <span className="text-primary">Recovery</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            Enter your registered email address and we will send you a secure link
            to reset your password within 15 minutes.
          </p>

          <div className="space-y-4">
            {[
              { icon: Mail, title: "Email Verification", desc: "A secure reset link is sent to your registered email address" },
              { icon: Lock, title: "15-Minute Expiry", desc: "Reset links expire automatically for your account security" },
              { icon: Shield, title: "Single Use", desc: "Each reset link can only be used once to prevent replay attacks" },
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

              {sent ? (
                /* ── Success state ── */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2">Check Your Email</h2>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    If <span className="font-medium text-foreground">{email}</span> is registered,
                    a reset link has been sent. It expires in 15 minutes.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Didn't receive it? Check your spam folder or{" "}
                    <button
                      onClick={() => { setSent(false); setEmail(""); }}
                      className="text-primary hover:underline font-medium"
                    >
                      try again
                    </button>
                    .
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="w-full h-11 rounded-xl">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                /* ── Request form ── */
                <>
                  <h2 className="font-display text-2xl font-bold mb-2">Forgot Password?</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Enter your email and we'll send you a reset link.
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

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {loading ? "Sending..." : "Send Reset Link"}
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
