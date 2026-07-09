import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";

import { Button } from "@/components/ui/button";
import CirculairLogo from "@/components/CirculairLogo";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  Battery, Brain, Shield, ShoppingCart, BarChart3, ArrowRight,
  CheckCircle2, Truck, Activity, Users,
  ChevronRight, Layers, Lock, Leaf, Award, ArrowUpRight,
  Factory, Recycle, Server, Landmark, CircuitBoard, Play,
  Sparkles, TrendingUp, Database, Wifi, FileCheck, Sun, Moon
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/* ─── ANIMATED COUNTER ─────────────────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = "", prefix = "", duration = 2000 }: {
  end: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If the element is already visible in the viewport on mount, trigger immediately
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setVisible(true);
        return;
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
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
  { value: 7, suffix: "+", label: "Jurisdictions", sublabel: "EU, India, China, US, UK, Thailand, Indonesia" },
  { value: 10, suffix: "", label: "Currencies", sublabel: "USD, EUR, INR, CNY, GBP, JPY & more" },
  { value: 21, suffix: "-char", label: "BPAN Standard", sublabel: "MoRTH Battery Pack Aadhaar Number" },
  { value: 5, suffix: "", label: "Languages", sublabel: "EN, DE, FR, ZH, HI" },
];

const LIFECYCLE_STEPS = [
  { icon: Factory, label: "Manufacture", step: "01", desc: "Cell-to-pack registration" },
  { icon: Battery, label: "Deploy", step: "02", desc: "Field installation tracking" },
  { icon: Activity, label: "Monitor", step: "03", desc: "Real-time IoT telemetry" },
  { icon: Brain, label: "Predict", step: "04", desc: "AI health forecasting" },
  { icon: ShoppingCart, label: "Remarket", step: "05", desc: "Second-life marketplace" },
  { icon: Recycle, label: "Recycle", step: "06", desc: "Material recovery" },
];

const CAPABILITIES = [
  {
    icon: Database, title: "Battery Identity & Registry",
    desc: "Generate and manage 21-character Battery Pack Aadhaar Numbers (BPAN) with QR codes, NFC tags, and full lifecycle tracking from manufacturing through recycling.",
    tag: "BPAN Registry"
  },
  {
    icon: Wifi, title: "Real-Time IoT Telemetry",
    desc: "High-frequency MQTT ingestion processing voltage, current, temperature, SOC, and cycle data with sub-second latency. Automatic thermal anomaly detection.",
    tag: "MQTT + WebSocket"
  },
  {
    icon: Brain, title: "AI-Powered SOH Prediction",
    desc: "CNN-LSTM deep learning models achieving <2% RMSE for State of Health estimation and Remaining Useful Life prediction. Intelligent triage routing.",
    tag: "Machine Learning"
  },
  {
    icon: TrendingUp, title: "Second-Life Marketplace",
    desc: "Dynamic spot pricing engine with multi-currency support across 10 currencies. Smart matching connects BESS developers with certified second-life inventory.",
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
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400"
  },
  {
    icon: Recycle, role: "Recycler",
    desc: "Manage end-of-life intake, verify black mass yields against theoretical targets, earn EPR credit tokens, and generate CPCB compliance reports.",
    features: ["EOL Intake", "Yield Verification", "EPR Tokens", "CPCB Form BW-3"],
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-400"
  },
  {
    icon: Server, role: "BESS Developer",
    desc: "Source certified second-life batteries through the marketplace, evaluate health passports, and procure inventory with AI-powered matching.",
    features: ["Marketplace Access", "Health Passports", "Smart Matching", "Spot Pricing"],
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400"
  },
  {
    icon: Landmark, role: "Government / Regulator",
    desc: "Monitor EPR compliance across producers, verify recycling yields, access immutable audit trails, and review platform-wide sustainability metrics.",
    features: ["EPR Monitoring", "Audit Trails", "Compliance Reports", "Sustainability KPIs"],
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-400"
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
  usePageTitle("Battery Circular Economy Platform");
  useStructuredData([
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Circul-AI-r",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.circulair.energy",
      "description": "End-to-end battery lifecycle intelligence platform — traceability, AI-driven SOH prediction, EPR compliance across 7 jurisdictions, and a second-life marketplace.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Battery Passport (BPAN) generation and tracking",
        "AI-powered State of Health (SOH) prediction",
        "Real-time IoT telemetry monitoring",
        "EPR compliance across EU, India, China, US, UK, Thailand, Indonesia",
        "Second-life battery marketplace",
        "Yield verification and recycler workflows",
        "Logistics and chain-of-custody tracking"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Circul-AI-r — Battery Circular Economy Platform",
      "url": "https://www.circulair.energy/",
      "description": "End-to-end battery lifecycle intelligence: traceability, AI health prediction, EPR compliance across 7 jurisdictions, and a second-life marketplace.",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.circulair.energy/" }
        ]
      }
    }
  ]);

  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeStakeholder, setActiveStakeholder] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-grid" />
      <div className="bg-glow1" />
      <div className="bg-glow2" />

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      {/* position:fixed is used instead of sticky because any ancestor with
          overflow-x:hidden creates a new scroll container and breaks sticky.
          A padding-top on the first section compensates for the fixed header height. */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 border-b border-border/50 bg-background/90 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <CirculairLogo size={30} />
          <div>
            <div className="text-lg font-extrabold leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Circul<span className="text-primary">-AI-</span>r
            </div>
            <div className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
              Battery Intelligence
            </div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground transition-colors duration-200">Capabilities</a>
          <a href="#stakeholders" className="hover:text-foreground transition-colors duration-200">Stakeholders</a>
          <a href="#compliance" className="hover:text-foreground transition-colors duration-200">Compliance</a>
          <a href="#technology" className="hover:text-foreground transition-colors duration-200">Technology</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-blink" />
            <span className="text-[10px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>LIVE</span>
          </div>
          <button
            onClick={(e) => toggleTheme?.(e)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {!loading && (
            isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-md shadow-primary/20">
                  Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-md shadow-primary/20"
                onClick={() => window.location.href = "/login"}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )
          )}
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────────────────────────────── */}
      {/* pt-[68px] compensates for the fixed header so hero content is not hidden beneath it */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-[92px] lg:pt-[100px] pb-24">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-0.5 h-5 bg-primary rounded-full" />
              <span className="text-[11px] font-medium text-muted-foreground tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                Multinational Battery Lifecycle Platform
              </span>
            </div>

            <h1 className="text-[2.75rem] sm:text-[3.25rem] lg:text-[3.75rem] font-extrabold leading-[1.08] tracking-[-0.03em] mb-7" style={{ fontFamily: "var(--font-display)" }}>
              The Operating{" "}
              <br className="hidden sm:block" />
              System for{" "}
              <span className="text-primary relative">
                Battery Circular
                <br />
                Economy
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/30" viewBox="0 0 300 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 5.5C50 2 100 1 150 3C200 5 250 2 299 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mb-10" style={{ fontFamily: "var(--font-body)" }}>
              End-to-end traceability from cell manufacturing to material recovery.
              AI-driven health prediction, real-time IoT telemetry, regulatory
              compliance across 7 jurisdictions, and a second-life marketplace -
              all in one unified platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-13 text-[15px] rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                onClick={() => window.location.href = "/login"}
              >
                Launch Platform <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link href="/marketplace">
                <Button size="lg" variant="outline" className="border-border/60 hover:border-primary/40 hover:bg-primary/5 px-8 h-13 text-[15px] rounded-xl transition-all">
                  Explore Marketplace <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">Carbon footprint tracking</span>
              </div>
            </div>
          </div>

          {/* Hero Visual — Battery Lifecycle */}
          <div className="hidden lg:block animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/8 to-chart-2/8 rounded-[2rem] blur-3xl" />
              <div className="relative bg-card/60 border border-border/60 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold tracking-wide uppercase text-foreground/70" style={{ fontFamily: "var(--font-display)" }}>
                      Battery Lifecycle
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-primary bg-primary/8 border border-primary/15 rounded-full px-2.5 py-1" style={{ fontFamily: "var(--font-mono)" }}>
                    6 stages
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {LIFECYCLE_STEPS.map((item, i) => (
                    <div
                      key={item.label}
                      className="text-center group p-3 rounded-xl hover:bg-primary/5 transition-all duration-300 cursor-default"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      <div className="w-12 h-12 mx-auto rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-2.5 group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-[10px] font-bold text-primary/50 mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>{item.step}</div>
                      <div className="text-[13px] font-semibold text-foreground/90 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>{item.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{item.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-border/40">
                  <div className="flex items-center justify-between text-[12px] mb-2.5">
                    <span className="text-muted-foreground font-medium">Full lifecycle coverage</span>
                    <span className="text-primary font-bold" style={{ fontFamily: "var(--font-mono)" }}>100%</span>
                  </div>
                  <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-chart-2 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-border/40 bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl lg:text-5xl font-extrabold text-primary mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-semibold text-foreground/90 mb-1" style={{ fontFamily: "var(--font-display)" }}>{stat.label}</div>
                <div className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES ───────────────────────────────────────────────────── */}
      <section id="capabilities" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Platform Capabilities</span>
          </div>
          <h2 className="text-3xl lg:text-[2.5rem] font-extrabold mb-5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Complete Battery Lifecycle Management
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Six integrated modules covering identity, real-time monitoring, AI analytics,
            marketplace operations, regulatory compliance, and enterprise reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="group bg-card/60 border border-border/50 rounded-2xl p-7 hover:border-primary/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center group-hover:bg-primary/15 group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                  <cap.icon className="w-5.5 h-5.5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1" style={{ fontFamily: "var(--font-mono)" }}>{cap.tag}</span>
              </div>
              <h3 className="text-[15px] font-bold mb-2.5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{cap.title}</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STAKEHOLDERS ───────────────────────────────────────────────────── */}
      <section id="stakeholders" className="relative z-10 bg-card/20 border-y border-border/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Role-Based Access</span>
            </div>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold mb-5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Built for Every Stakeholder
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
              Purpose-built dashboards and workflows for each participant in the battery
              value chain, with role-based access control and jurisdiction-aware data governance.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {STAKEHOLDERS.map((sh, i) => (
              <div
                key={sh.role}
                className={`bg-card/60 border rounded-2xl p-7 transition-all duration-300 cursor-pointer ${
                  activeStakeholder === i
                    ? "border-primary/30 shadow-xl shadow-primary/5 bg-card/80"
                    : "border-border/50 hover:border-primary/15 hover:shadow-lg hover:shadow-primary/3"
                }`}
                onClick={() => setActiveStakeholder(i)}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-13 h-13 rounded-xl ${sh.iconBg} border flex items-center justify-center flex-shrink-0`}>
                    <sh.icon className={`w-6 h-6 ${sh.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{sh.role}</h3>
                    <p className="text-muted-foreground text-[13px] leading-relaxed mb-4">{sh.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {sh.features.map((f) => (
                        <span key={f} className="text-[10px] font-semibold text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1" style={{ fontFamily: "var(--font-mono)" }}>{f}</span>
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
      <section id="compliance" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-5">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Regulatory Compliance</span>
          </div>
          <h2 className="text-3xl lg:text-[2.5rem] font-extrabold mb-5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Multinational Regulatory Coverage
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Pluggable jurisdiction adapters ensure compliance with battery regulations
            across the EU, India, China, and beyond. One platform, multiple regulatory frameworks.
          </p>
        </div>

        <div className="bg-card/60 border border-border/50 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 px-7 py-4 border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
            <span>Framework</span>
            <span className="hidden sm:block">Region</span>
            <span className="hidden md:block">Reference</span>
            <span>Status</span>
          </div>
          {COMPLIANCE_FRAMEWORKS.map((fw) => (
            <div key={fw.name} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 px-7 py-5 border-b border-border/30 last:border-0 hover:bg-primary/3 transition-colors items-center">
              <div>
                <div className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>{fw.name}</div>
                <div className="text-[12px] text-muted-foreground sm:hidden mt-0.5">{fw.region}</div>
              </div>
              <div className="hidden sm:block text-[13px] text-muted-foreground">{fw.region}</div>
              <div className="hidden md:block text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{fw.code}</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${fw.status === "Full Compliance" ? "text-primary" : "text-amber-400"}`} />
                <span className={`text-[11px] font-semibold ${fw.status === "Full Compliance" ? "text-primary" : "text-amber-400"}`} style={{ fontFamily: "var(--font-mono)" }}>
                  {fw.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TECHNOLOGY ─────────────────────────────────────────────────────── */}
      <section id="technology" className="relative z-10 bg-card/20 border-y border-border/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-5">
                <CircuitBoard className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Technology Stack</span>
              </div>
              <h2 className="text-3xl lg:text-[2.5rem] font-extrabold mb-5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Enterprise-Grade Architecture
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8">
                Built on a modern, type-safe stack designed for reliability, performance,
                and developer experience. Every layer is optimized for battery lifecycle
                data at scale.
              </p>
              <div className="space-y-3">
                {[
                  { icon: FileCheck, text: "ISO 27001 & SOC 2 compliance-ready with full audit logging" },
                  { icon: Shield, text: "End-to-end encryption with role-based access control" },
                  { icon: Activity, text: "99.9% uptime SLA with automated failover and monitoring" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[14px] text-foreground/80 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TECH_STACK.map((tech) => (
                <div key={tech.name} className="bg-card/60 border border-border/50 rounded-xl p-5 hover:border-primary/20 transition-all duration-300 group">
                  <div className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>{tech.category}</div>
                  <div className="text-[15px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{tech.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-chart-2/5 rounded-3xl blur-3xl" />
            <div className="relative bg-card/40 border border-border/40 rounded-3xl p-12 lg:p-16 backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Get Started Today</span>
              </div>
              <h2 className="text-3xl lg:text-[2.75rem] font-extrabold mb-5 tracking-tight leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Ready to Transform Your<br />
                <span className="text-primary">Battery Value Chain?</span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto mb-10">
                Join the platform that is defining the standard for battery circular economy.
                From cell manufacturing to material recovery - every stage, every stakeholder, one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-10 h-13 text-[15px] rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                  onClick={() => window.location.href = "/login"}
                >
                  Start Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Link href="/wiki">
                  <Button size="lg" variant="outline" className="border-border/60 hover:border-primary/40 hover:bg-primary/5 px-10 h-13 text-[15px] rounded-xl">
                    Read Documentation <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border/40 bg-card/20">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <CirculairLogo size={24} />
                <span className="text-base font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Circul<span className="text-primary">-AI-</span>r
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
                The operating system for battery circular economy. End-to-end traceability, AI intelligence, and regulatory compliance.
              </p>
            </div>

            <div>
              <h4 className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-mono)" }}>Platform</h4>
              <div className="space-y-2.5">
                <Link href="/dashboard" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                <Link href="/marketplace" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link>
                <Link href="/bpan/register" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Register Battery</Link>
                <Link href="/warranty/check" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Check Warranty</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-mono)" }}>Resources</h4>
              <div className="space-y-2.5">
                <Link href="/wiki" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">CirculWiki</Link>
                <Link href="/getting-started" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Getting Started</Link>
                <a href="/api/docs" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">API Docs</a>
                <Link href="/compliance" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Compliance</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-mono)" }}>Compliance</h4>
              <div className="space-y-2.5">
                <span className="block text-[13px] text-muted-foreground">ISO 27001 Ready</span>
                <span className="block text-[13px] text-muted-foreground">SOC 2 Type II Ready</span>
                <span className="block text-[13px] text-muted-foreground">EU Battery Regulation</span>
                <span className="block text-[13px] text-muted-foreground">India BWMR 2022</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              <span>&copy; {new Date().getFullYear()} Circul-AI-r Platform. All rights reserved.</span>
              <span className="w-px h-3 bg-border/40" />
              <span>By{" "}<a href="https://www.setoo.co" target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 hover:text-emerald-400 transition-colors font-medium">www.setoo.co</a></span>
            </div>
            <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <span>Terms of Service</span>
              <span>Security</span>
              <button
                onClick={() => window.dispatchEvent(new Event("openCookieConsent"))}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                Manage Cookies
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
