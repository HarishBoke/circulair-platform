import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  Zap, Battery, Brain, Shield, ShoppingCart, BarChart3, ArrowRight,
  CheckCircle2, Globe, Cpu, Truck, FileText, Activity, Users,
  ChevronRight, Layers, Lock, Radio, Leaf, Award, ArrowUpRight,
  Building2, Factory, Recycle, Server, Landmark, CircuitBoard
} from "lucide-react";

/* ─── ANIMATED COUNTER ─────────────────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = "", prefix = "", duration = 2000 }: {
  end: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── DATA ─────────────────────────────────────────────────────────────────── */
const PLATFORM_STATS = [
  { value: 7, suffix: "+", label: "Jurisdictions Supported", sublabel: "EU, India, China, US, UK, Thailand, Indonesia" },
  { value: 10, suffix: "", label: "Currencies", sublabel: "USD, EUR, INR, CNY, GBP, JPY & more" },
  { value: 21, suffix: "-char", label: "BPAN Standard", sublabel: "MoRTH Battery Pack Aadhaar Number" },
  { value: 5, suffix: "", label: "Languages", sublabel: "EN, DE, FR, ZH, HI" },
];

const CAPABILITIES = [
  {
    icon: Battery, title: "Battery Identity & Registry",
    desc: "Generate and manage 21-character Battery Pack Aadhaar Numbers (BPAN) with QR codes, NFC tags, and full lifecycle tracking from manufacturing through recycling.",
    tag: "BPAN Registry"
  },
  {
    icon: Activity, title: "Real-Time IoT Telemetry",
    desc: "High-frequency MQTT ingestion processing voltage, current, temperature, SOC, and cycle data with sub-second latency. Automatic thermal anomaly detection and alert generation.",
    tag: "MQTT + WebSocket"
  },
  {
    icon: Brain, title: "AI-Powered SOH Prediction",
    desc: "CNN-LSTM deep learning models achieving less than 2% RMSE for State of Health estimation and Remaining Useful Life prediction. Intelligent triage routing for second-life decisions.",
    tag: "Machine Learning"
  },
  {
    icon: ShoppingCart, title: "Second-Life Marketplace",
    desc: "Dynamic spot pricing engine with multi-currency support across 10 currencies. Smart matching connects BESS developers with certified second-life battery inventory.",
    tag: "Multi-Currency"
  },
  {
    icon: Shield, title: "Regulatory Compliance Engine",
    desc: "Pluggable jurisdiction adapters for EU Battery Passport, India BWMR/EPR, China MIIT, and more. Automated CPCB Form BW-3 generation and carbon footprint declarations.",
    tag: "7 Jurisdictions"
  },
  {
    icon: BarChart3, title: "Analytics & Reporting",
    desc: "Real-time KPI dashboards with role-specific views for OEMs, recyclers, BESS developers, and government regulators. CSV export, PDF reports, and compliance audit trails.",
    tag: "Role-Based"
  },
];

const STAKEHOLDERS = [
  {
    icon: Factory, role: "OEM / Manufacturer",
    desc: "Register batteries at production, generate BPANs, track warranty obligations, and prove domestic value addition for PLI scheme compliance.",
    features: ["BPAN Generation", "Production QR Codes", "Warranty Tracking", "PLI DVA Proof"],
    color: "from-emerald-500/20 to-emerald-500/5"
  },
  {
    icon: Recycle, role: "Recycler",
    desc: "Manage end-of-life intake, verify black mass yields against theoretical targets, earn EPR credit tokens, and generate CPCB compliance reports.",
    features: ["EOL Intake", "Yield Verification", "EPR Tokens", "CPCB Form BW-3"],
    color: "from-amber-500/20 to-amber-500/5"
  },
  {
    icon: Server, role: "BESS Developer",
    desc: "Source certified second-life batteries through the marketplace, evaluate health passports, and procure inventory with AI-powered matching and dynamic pricing.",
    features: ["Marketplace Access", "Health Passports", "Smart Matching", "Spot Pricing"],
    color: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: Landmark, role: "Government / Regulator",
    desc: "Monitor EPR compliance across producers, verify recycling yields, access immutable audit trails, and review platform-wide sustainability metrics.",
    features: ["EPR Monitoring", "Audit Trails", "Compliance Reports", "Sustainability KPIs"],
    color: "from-purple-500/20 to-purple-500/5"
  },
];

const COMPLIANCE_FRAMEWORKS = [
  { name: "EU Battery Regulation", region: "European Union", code: "EU 2023/1542", status: "Full Compliance" },
  { name: "Battery Waste Management Rules", region: "India", code: "BWMR 2022", status: "Full Compliance" },
  { name: "MoRTH BPAN Guidelines", region: "India", code: "Sept 2025", status: "Full Compliance" },
  { name: "Extended Producer Responsibility", region: "India", code: "EPR Mandate", status: "Full Compliance" },
  { name: "MIIT Battery Traceability", region: "China", code: "GB/T 34014", status: "Adapter Ready" },
  { name: "Carbon Footprint Declaration", region: "EU", code: "Art. 7 EU BR", status: "Full Compliance" },
];

const TECH_STACK = [
  { name: "React 19", category: "Frontend" },
  { name: "TypeScript", category: "Language" },
  { name: "tRPC v11", category: "API Layer" },
  { name: "TiDB", category: "Database" },
  { name: "MQTT v5", category: "IoT Protocol" },
  { name: "WebSocket", category: "Real-Time" },
  { name: "Drizzle ORM", category: "Data Layer" },
  { name: "Tailwind CSS 4", category: "Styling" },
];

/* ─── COMPONENT ────────────────────────────────────────────────────────────── */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [activeStakeholder, setActiveStakeholder] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-4 border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0">
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
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#capabilities" className="hover:text-primary transition-colors">Capabilities</a>
          <a href="#stakeholders" className="hover:text-primary transition-colors">Stakeholders</a>
          <a href="#compliance" className="hover:text-primary transition-colors">Compliance</a>
          <a href="#technology" className="hover:text-primary transition-colors">Technology</a>
        </nav>
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
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )
          )}
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 lg:pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Multinational Battery Lifecycle Platform</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold mb-6 leading-[1.1] tracking-tight">
              The Operating System for{" "}
              <span className="text-primary">Battery Circular Economy</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mb-8 leading-relaxed">
              End-to-end traceability from cell manufacturing to material recovery. AI-driven health prediction, real-time IoT telemetry, regulatory compliance across 7 jurisdictions, and a second-life marketplace — all in one unified platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-12"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Launch Platform <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link href="/marketplace">
                <Button size="lg" variant="outline" className="border-border hover:border-primary px-8 h-12">
                  Explore Marketplace <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-primary" />
                <span>Carbon footprint tracking</span>
              </div>
            </div>
          </div>

          {/* Hero Visual — Animated Battery Lifecycle */}
          <div className="hidden lg:block animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-3xl blur-3xl" />
              <div className="relative bg-card/80 border border-border rounded-2xl p-8 backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Factory, label: "Manufacture", step: "01" },
                    { icon: Battery, label: "Deploy", step: "02" },
                    { icon: Activity, label: "Monitor", step: "03" },
                    { icon: Brain, label: "Predict", step: "04" },
                    { icon: ShoppingCart, label: "Remarket", step: "05" },
                    { icon: Recycle, label: "Recycle", step: "06" },
                  ].map((item, i) => (
                    <div key={item.label} className="text-center group" style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="font-mono text-[9px] text-primary/60 mb-0.5">{item.step}</div>
                      <div className="text-xs font-medium text-foreground/80">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Full lifecycle coverage</span>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="font-mono">6 stages</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full animate-pulse" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl lg:text-4xl font-bold text-primary mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="font-medium text-sm text-foreground mb-0.5">{stat.label}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES ───────────────────────────────────────────────────── */}
      <section id="capabilities" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Platform Capabilities</span>
          </div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
            Complete Battery Lifecycle Management
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Six integrated modules covering identity, real-time monitoring, AI analytics, marketplace operations, regulatory compliance, and enterprise reporting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap, i) => (
            <div key={cap.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <cap.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-mono text-[9px] text-primary/60 bg-primary/5 border border-primary/10 rounded-full px-2.5 py-0.5">{cap.tag}</span>
              </div>
              <h3 className="font-display text-base font-bold mb-2">{cap.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STAKEHOLDERS ───────────────────────────────────────────────────── */}
      <section id="stakeholders" className="relative z-10 bg-card/30 border-y border-border/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Role-Based Access</span>
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
              Built for Every Stakeholder
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Purpose-built dashboards and workflows for each participant in the battery value chain, with role-based access control and jurisdiction-aware data governance.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {STAKEHOLDERS.map((sh, i) => (
              <div
                key={sh.role}
                className={`bg-card border rounded-xl p-6 transition-all cursor-pointer ${
                  activeStakeholder === i ? "border-primary/40 shadow-lg shadow-primary/5" : "border-border hover:border-primary/20"
                }`}
                onClick={() => setActiveStakeholder(i)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sh.color} border border-border flex items-center justify-center flex-shrink-0`}>
                    <sh.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold mb-2">{sh.role}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{sh.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {sh.features.map((f) => (
                        <span key={f} className="font-mono text-[10px] text-primary/80 bg-primary/5 border border-primary/10 rounded-full px-2.5 py-1">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE ─────────────────────────────────────────────────────── */}
      <section id="compliance" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Regulatory Compliance</span>
          </div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
            Multinational Regulatory Coverage
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pluggable jurisdiction adapters ensure compliance with battery regulations across the EU, India, China, and beyond. One platform, multiple regulatory frameworks.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-3 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-wider">
            <span>Framework</span>
            <span className="hidden sm:block">Region</span>
            <span className="hidden md:block">Reference</span>
            <span>Status</span>
          </div>
          {COMPLIANCE_FRAMEWORKS.map((fw) => (
            <div key={fw.name} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors items-center">
              <div>
                <div className="text-sm font-medium">{fw.name}</div>
                <div className="text-xs text-muted-foreground sm:hidden">{fw.region}</div>
              </div>
              <div className="hidden sm:block text-sm text-muted-foreground">{fw.region}</div>
              <div className="hidden md:block font-mono text-xs text-muted-foreground">{fw.code}</div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${fw.status === "Full Compliance" ? "text-primary" : "text-amber-500"}`} />
                <span className={`font-mono text-[10px] ${fw.status === "Full Compliance" ? "text-primary" : "text-amber-500"}`}>{fw.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TECHNOLOGY ─────────────────────────────────────────────────────── */}
      <section id="technology" className="relative z-10 bg-card/30 border-y border-border/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
                <CircuitBoard className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Technology Stack</span>
              </div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
                Enterprise Architecture, Modern Stack
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Built with the latest web technologies for performance, type safety, and developer experience. End-to-end TypeScript with real-time capabilities and pluggable regulatory adapters for multinational deployment.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Lock, text: "Helmet security headers + rate limiting on all API endpoints" },
                  { icon: Radio, text: "MQTT v5 with TLS for secure IoT telemetry ingestion" },
                  { icon: Globe, text: "Multi-region data residency (India, EU, China, US, Global)" },
                  { icon: Cpu, text: "AI/LLM integration for SOH prediction and intelligent triage" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-3">
                {TECH_STACK.map((tech) => (
                  <div key={tech.name} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                    <div className="font-mono text-[9px] text-primary/60 uppercase tracking-wider mb-1">{tech.category}</div>
                    <div className="font-display text-sm font-bold">{tech.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AGENTIC READY ──────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-primary/10 via-card to-chart-2/10 border border-primary/20 rounded-2xl p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-[10px] text-primary tracking-widest uppercase">Agentic-Ready Architecture</span>
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4 max-w-2xl">
              Every Action is Agent-Executable
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              Circul-AI-r is built from the ground up for autonomous operation. Every platform action — from battery registration to compliance reporting — can be triggered, monitored, and audited by AI agents through structured tRPC procedures with full action logging.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Agent Action Log", desc: "Every operation tracked with actor, intent, parameters, and outcome" },
                { title: "Structured APIs", desc: "Type-safe tRPC procedures with Zod validation for agent consumption" },
                { title: "Super Admin Oversight", desc: "Real-time monitoring of all agent and human actions from one panel" },
              ].map((item) => (
                <div key={item.title} className="bg-card/60 border border-border/50 rounded-xl p-4">
                  <h4 className="font-display text-sm font-bold mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20 text-center">
        <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
          Ready to Transform Battery Lifecycle Management?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Join the platform powering the circular economy for electric vehicle batteries across multiple jurisdictions and regulatory frameworks.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10 h-12"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <a href="#capabilities">
            <Button size="lg" variant="outline" className="border-border hover:border-primary px-8 h-12">
              View Capabilities
            </Button>
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="font-display text-sm font-bold">
                  Circul<span className="text-primary">-AI-</span>r
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The unified battery intelligence platform for circular economy operations, regulatory compliance, and second-life marketplace.
              </p>
            </div>
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider mb-3 text-foreground/80">Platform</h4>
              <div className="space-y-2">
                {["Battery Registry", "IoT Telemetry", "AI SOH Prediction", "Marketplace", "Compliance"].map((item) => (
                  <div key={item} className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">{item}</div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider mb-3 text-foreground/80">Compliance</h4>
              <div className="space-y-2">
                {["EU Battery Passport", "India BWMR 2022", "MoRTH BPAN", "EPR Mandate", "CPCB Form BW-3"].map((item) => (
                  <div key={item} className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">{item}</div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider mb-3 text-foreground/80">Resources</h4>
              <div className="space-y-2">
                <a href="/wiki" className="block text-xs text-muted-foreground hover:text-primary transition-colors">CirculWiki Knowledge Base</a>
                <a href="/api/docs" className="block text-xs text-muted-foreground hover:text-primary transition-colors">API Documentation</a>
                <a href="/wiki?category=integration" className="block text-xs text-muted-foreground hover:text-primary transition-colors">Integration Guide</a>
                <a href="/wiki?category=compliance" className="block text-xs text-muted-foreground hover:text-primary transition-colors">Security & Compliance</a>
                <a href="/wiki?category=architecture" className="block text-xs text-muted-foreground hover:text-primary transition-colors">Architecture</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="font-mono text-[10px] text-muted-foreground tracking-wider">
              Circul-AI-r Platform · Battery Intelligence · Circular Economy · 2026
            </div>
            <div className="flex items-center gap-4">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                <span key={item} className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
