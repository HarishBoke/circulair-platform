import { useState, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Lock, Eye, EyeOff, ArrowRight, Shield, Globe, Battery, Cpu, ChevronRight } from "lucide-react";
import CirculairLogo from "@/components/CirculairLogo";

const ACCESS_KEY = "circulair_access_granted";

// Target launch date — configurable
const LAUNCH_DATE = new Date("2026-06-01T00:00:00Z");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useCountdown(targetDate: Date): TimeLeft {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetDate.getTime() - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calc);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [calc]);

  return timeLeft;
}

export function isAccessGranted(): boolean {
  return localStorage.getItem(ACCESS_KEY) === "true";
}

export function revokeAccess(): void {
  localStorage.removeItem(ACCESS_KEY);
}

export default function LaunchingSoon({ onAccessGranted }: { onAccessGranted: () => void }) {
  usePageTitle("Circul-AI-r — Battery Circular Economy Platform");

  // SEO: Set description and keywords dynamically for the pre-launch page
  useEffect(() => {
    // Update description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', 'End-to-end battery lifecycle intelligence: traceability, AI health prediction, EPR compliance across 7 jurisdictions, and a second-life marketplace.');

    // Update keywords
    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', 'battery circular economy, battery lifecycle management, EV battery traceability, battery passport, BPAN, SOH prediction, EPR compliance, second-life battery marketplace, battery intelligence');
  }, []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const timeLeft = useCountdown(LAUNCH_DATE);

  const expectedUsername = import.meta.env.VITE_ACCESS_USERNAME || "admin";
  const expectedPassword = import.meta.env.VITE_ACCESS_PASSWORD || "password";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (username === expectedUsername && password === expectedPassword) {
        localStorage.setItem(ACCESS_KEY, "true");
        onAccessGranted();
      } else {
        setError("Invalid credentials. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
      setIsLoading(false);
    }, 800);
  };

  const features = [
    { icon: Battery, label: "Battery Passport", desc: "BPAN digital identity" },
    { icon: Cpu, label: "AI Predictions", desc: "SOH & RUL forecasting" },
    { icon: Shield, label: "Compliance", desc: "ISO 27001 & SOC 2" },
    { icon: Globe, label: "Marketplace", desc: "Second-life trading" },
  ];

  return (
    <div className="min-h-screen bg-[#060d0d] text-white relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)" }} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-emerald-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-15px); opacity: 0.3; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.5; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6" style={{ animation: "fade-in 0.8s ease-out" }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <CirculairLogo size={30} />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Circul<span className="text-emerald-400">-AI-</span>r
              </span>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                Battery Intelligence
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-400" style={{ fontFamily: "var(--font-mono)" }}>PRE-LAUNCH</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12 pb-12">
          <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 md:gap-16 items-center">

            {/* Left — Branding & Countdown */}
            <div style={{ animation: "slide-up 0.8s ease-out" }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-0.5 h-5 bg-emerald-400 rounded-full" />
                <span className="text-[11px] font-medium text-zinc-400 tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                  Multinational Battery Lifecycle Platform
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Something
                <br />
                <span className="text-emerald-400">Powerful</span> is
                <br />
                Coming
              </h1>

              <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-10 max-w-md">
                The operating system for battery circular economy. End-to-end traceability, AI-driven health prediction, and regulatory compliance — all in one platform.
              </p>

              {/* Countdown */}
              <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 mb-4 font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                  Launching In
                </p>
                <div className="flex gap-3">
                  {[
                    { value: timeLeft.days, label: "Days" },
                    { value: timeLeft.hours, label: "Hours" },
                    { value: timeLeft.minutes, label: "Min" },
                    { value: timeLeft.seconds, label: "Sec" },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="w-16 h-16 md:w-18 md:h-18 rounded-xl bg-zinc-900/80 border border-zinc-800/60 flex items-center justify-center mb-1.5">
                        <span className="text-2xl md:text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                          {String(item.value).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature pills */}
              <div className="grid grid-cols-2 gap-2.5">
                {features.map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
                    <f.icon className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate">{f.label}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Access Form */}
            <div style={{ animation: "slide-up 1s ease-out 0.2s both" }}>
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute -inset-4 rounded-3xl bg-emerald-500/[0.03] blur-2xl" />

                <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                        Early Access
                      </h2>
                      <p className="text-xs text-zinc-500">Authorized personnel only</p>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-800/60 my-6" />

                  <form onSubmit={handleSubmit} className={shake ? "animate-[shake_0.6s_ease-in-out]" : ""}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(""); }}
                          placeholder="Enter your username"
                          className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                          autoComplete="off"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 pr-11 bg-zinc-950/60 border border-zinc-800/60 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || !username || !password}
                      className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Access Platform
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="h-px bg-zinc-800/60 my-6" />

                  <div className="flex items-center justify-between text-[10px] text-zinc-600">
                    <span>Secured with enterprise-grade encryption</span>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>ISO 27001</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-6 text-center">
                <p className="text-xs text-zinc-600">
                  Need access? Contact{" "}
                  <a href="mailto:business@setoo.co" className="text-emerald-500/60 hover:text-emerald-400 transition-colors">
                    business@setoo.co
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-zinc-900/60" style={{ animation: "fade-in 1.2s ease-out" }}>
          <div className="flex items-center gap-4 text-[11px] text-zinc-600">
            <span>&copy; 2026 Circul-AI-r</span>
            <span className="w-px h-3 bg-zinc-800" />
            <span>Battery Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-600">
            <span>By{" "}<a href="https://www.setoo.co" target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 hover:text-emerald-400 transition-colors font-medium">www.setoo.co</a></span>
            <span className="w-px h-3 bg-zinc-800" />
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <span className="w-px h-3 bg-zinc-800" />
            <button
              onClick={() => window.dispatchEvent(new Event("openCookieConsent"))}
              className="hover:text-zinc-400 transition-colors cursor-pointer"
            >
              Manage Cookies
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
