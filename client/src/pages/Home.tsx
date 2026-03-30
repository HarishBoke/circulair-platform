import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Zap, Battery, Brain, Shield, ShoppingCart, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  { icon: Battery, title: "BPAN Registry", desc: "21-character Battery Pack Aadhaar Number generation, QR codes, and lifecycle tracking." },
  { icon: Brain, title: "AI SOH Prediction", desc: "CNN-LSTM models with <2% RMSE for State of Health and Remaining Useful Life estimation." },
  { icon: Shield, title: "EPR Compliance", desc: "Blockchain-based audit trails, EPR smart contracts, and CPCB Form BW-3 reporting." },
  { icon: ShoppingCart, title: "Marketplace", desc: "Dynamic spot pricing, smart matching, and health passport certification for second-life batteries." },
  { icon: BarChart3, title: "Analytics", desc: "Real-time KPI dashboards for OEMs, recyclers, BESS developers, and government regulators." },
  { icon: Zap, title: "IoT Telemetry", desc: "High-frequency MQTT ingestion with thermal anomaly detection and real-time alerts." },
];

const STATS = [
  { value: "99.99%", label: "Platform Uptime" },
  { value: "<2%", label: "SOH Prediction RMSE" },
  { value: "100K+", label: "Msgs/sec Throughput" },
  { value: "100%", label: "EPR Compliance Rate" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center animate-pulse-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-tight">
              Circul<span className="text-primary">-AI-</span>r
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Battery Intelligence Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-blink" />
            <span className="font-mono text-[10px] text-primary">LIVE</span>
          </div>
          {!loading && (
            isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign In
              </Button>
            )
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
          <span className="font-mono text-[10px] text-primary tracking-widest uppercase">MoRTH Battery Pack Aadhaar Compliant</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          India's Battery<br />
          <span className="text-primary">Circular Economy</span><br />
          Intelligence Platform
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          End-to-end traceability, AI-driven health prediction, blockchain EPR compliance, and marketplace operations for electric vehicle battery reuse and recycling.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Launch Platform <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Link href="/marketplace">
            <Button size="lg" variant="outline" className="border-border hover:border-primary px-8">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-5 text-center hover:border-primary/30 transition-colors">
              <div className="font-display text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl font-bold mb-3">Complete Battery Lifecycle Management</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">Seven integrated modules covering identity, AI analytics, compliance, marketplace, logistics, and reporting.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5 group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-sm font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Regulatory Compliance</h2>
              <p className="text-muted-foreground text-sm">Built for India's battery regulatory framework</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Battery Waste Management Rules (BWMR) 2022",
              "MoRTH Battery Pack Aadhaar Guidelines (Sept 2025)",
              "Extended Producer Responsibility (EPR) Mandate",
              "CPCB Form BW-3 Annual Return Reporting",
              "PLI Scheme Domestic Value Addition (DVA) Proof",
              "Hyperledger Fabric Immutable Audit Trail",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-6 text-center">
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          Circul-AI-r Platform · Battery Intelligence · Circular Economy · India 2026
        </p>
      </footer>
    </div>
  );
}
