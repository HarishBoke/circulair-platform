import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";

import { Button } from "@/components/ui/button";
import CirculairLogo from "@/components/CirculairLogo";
import { Link } from "wouter";
import { useState } from "react";
import {
  Battery, Brain, Shield, ShoppingCart, BarChart3, ArrowRight,
  CircleHelp, Truck, Activity, Users,
  ChevronRight, Layers, Lock, Leaf, Award, ArrowUpRight,
  Factory, Recycle, Server, Landmark, Play,
  Sparkles, TrendingUp, Database, Wifi, FileCheck, Sun, Moon,
  Mail, Send, CheckCircle, Menu, X
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/* ─── PUBLIC CAPABILITY STATES ────────────────────────────────────────────── */
const PLATFORM_STATS = [
  { value: "Pilot", label: "Battery identity", sublabel: "Official BPAN enrollment not verified" },
  { value: "Estimate", label: "Health model", sublabel: "Physics-based; accuracy not validated" },
  { value: "Draft", label: "Regulatory records", sublabel: "No certification or government submission" },
  { value: "Unknown", label: "Availability", sublabel: "No independently measured uptime" },
];

const LIFECYCLE_STEPS = [
  { icon: Factory, label: "Manufacture", step: "01", desc: "Registry records" },
  { icon: Battery, label: "Deploy", step: "02", desc: "Installation records" },
  { icon: Activity, label: "Monitor", step: "03", desc: "Telemetry pilot" },
  { icon: Brain, label: "Predict", step: "04", desc: "Heuristic estimates" },
  { icon: ShoppingCart, label: "Remarket", step: "05", desc: "Listing workflow" },
  { icon: Recycle, label: "Recycle", step: "06", desc: "Recovery records" },
];

const CAPABILITIES = [
  {
    icon: Database, title: "Battery Identity & Registry",
    desc: "Local battery identification and QR records; official BPAN enrollment not verified. Canonical mapping, physical label attachment, NFC hardware and lifecycle evidence require pilot acceptance.",
    tag: "BPAN Registry"
  },
  {
    icon: Wifi, title: "Telemetry Connection Pilot",
    desc: "MQTT, API and WebSocket source paths exist. Real battery ingest, units, device authorization, broker ACLs and end-to-end latency require verification; telemetry is not a safety interlock.",
    tag: "MQTT + WebSocket"
  },
  {
    icon: Brain, title: "Battery Health Estimates",
    desc: "A deterministic physics-based model provides SOH and remaining-life estimates. No validated accuracy or neural-model training is established. Triage suggestions require qualified human review.",
    tag: "Heuristic Model"
  },
  {
    icon: TrendingUp, title: "Second-Life Marketplace",
    desc: "Listing, offer and indicative pricing workflows exist. Inventory certification, automated matching, settlement, refunds and payouts are not accepted for real transactions.",
    tag: "Multi-Currency"
  },
  {
    icon: Shield, title: "Regulatory Record Templates",
    desc: "Jurisdiction metadata, declaration forms and report templates support preparation. Government adapters, legal conformity, obligation calculations and regulator acceptance remain unverified.",
    tag: "Review Required"
  },
  {
    icon: BarChart3, title: "Analytics & Reporting",
    desc: "Dashboard and export source paths support record review. Metric accuracy, tenant scoping, private storage, PDF runtime and audit coverage require separate acceptance.",
    tag: "Role-Based"
  },
];

const STAKEHOLDERS = [
  {
    icon: Factory, role: "OEM / Manufacturer",
    desc: "Record specifications and warranty information for review. Identity validation and eligibility evidence must be checked; records do not prove incentive-scheme compliance.",
    features: ["BPAN Generation", "Production QR Codes", "Warranty Tracking", "DVA Records"],
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400"
  },
  {
    icon: Recycle, role: "Recycler",
    desc: "Record intake and declared recovery yields. Internal EPR records and draft reports are not independently verified credits or proof that legal obligations are met.",
    features: ["EOL Intake", "Declared Yields", "Internal EPR Records", "Draft CPCB Report"],
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-400"
  },
  {
    icon: Server, role: "BESS Developer",
    desc: "Review listings, declared battery data and indicative pricing. Qualification, human procurement approval and transaction safeguards are required; automated matching is not implemented.",
    features: ["Marketplace Access", "Health Passports", "Manual Review", "Spot Pricing"],
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400"
  },
  {
    icon: Landmark, role: "Government / Regulator",
    desc: "Review authorized declared records and selected audit entries. Legal compliance, independent yield assurance, immutable storage and complete sustainability metrics are not established.",
    features: ["EPR Monitoring", "Audit Trails", "Compliance Reports", "Sustainability KPIs"],
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-400"
  },
];

const EMPTY_CONTACT_FORM = { name: "", email: "", company: "", role: "", message: "" };

const COMPLIANCE_FRAMEWORKS = [
  { name: "EU Battery Regulation", region: "European Union", code: "Reference only", status: "Review required" },
  { name: "Battery Waste Management Rules", region: "India", code: "Reference only", status: "Review required" },
  { name: "BPAN identity requirements", region: "Pilot scope", code: "Canonical mapping gate", status: "Pilot validation" },
  { name: "Extended Producer Responsibility", region: "India", code: "Internal records", status: "Not certified" },
  { name: "Battery traceability requirements", region: "China", code: "Metadata only", status: "Adapter unavailable" },
  { name: "Carbon Footprint Declaration", region: "EU", code: "Estimate / declaration", status: "Review required" },
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
      "url": "https://circulair.energy",
      "description": "Battery circular-economy software with registry, heuristic health estimates, listing workflows and draft regulatory records. Real battery and provider acceptance is pending.",
      "featureList": [
        "Local battery identification and QR records — official BPAN enrollment not verified",
        "Physics-based State of Health (SOH) estimates — unvalidated accuracy",
        "Telemetry source paths — hardware acceptance pending",
        "Jurisdiction metadata and draft EPR records — not certification",
        "Second-life battery marketplace",
        "Declared yield and recycler record workflows",
        "Logistics records — no verified carrier dispatch"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Circul-AI-r — Battery Circular Economy Platform",
      "url": "https://circulair.energy/",
      "description": "Battery circular-economy software for bounded pilots: registry records, heuristic health estimates, listing workflows and draft regulatory records.",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://circulair.energy/" }
        ]
      }
    }
  ]);

  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeStakeholder, setActiveStakeholder] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});

  function validateContact() {
    const errs: Record<string, string> = {};
    if (!contactForm.name || contactForm.name.length < 2) errs.name = "Name must be at least 2 characters";
    if (!contactForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) errs.email = "Please enter a valid email address";
    if (!contactForm.message || contactForm.message.length < 10) errs.message = "Message must be at least 10 characters";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateContact()) return;
    setContactErrors({ submit: "Sending is disabled until delivery and privacy controls are verified. Nothing has been sent or saved." });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ contain: "paint" }} aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-glow1" />
        <div className="bg-glow2" />
      </div>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      {/* position:fixed is used instead of sticky because any ancestor with
          overflow-x:hidden creates a new scroll container and breaks sticky.
          A padding-top on the first section compensates for the fixed header height. */}
      {/* ─── MOBILE NAV DRAWER — rendered outside header so fixed positioning is viewport-relative ─── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <nav className="absolute top-0 right-0 bottom-0 w-72 bg-background border-l border-border/60 flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <CirculairLogo size={24} />
                <span className="text-[15px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Circul<span className="text-primary">-AI-</span>r</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Nav links */}
            <div className="flex flex-col px-3 py-4 gap-0.5 flex-1">
              {[
                { href: '#capabilities', label: 'Capabilities' },
                { href: '#stakeholders', label: 'Stakeholders' },
                { href: '#compliance', label: 'Compliance' },
                { href: '/how-it-works', label: 'How It Works' },
                { href: '/faq', label: 'FAQ' },
                { href: '/glossary', label: 'Glossary' },
                { href: '/marketplace', label: 'Marketplace' },
              ].map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-foreground/70 hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
            {/* CTA at bottom */}
            <div className="px-5 py-5 border-t border-border/40">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-12 text-[15px]"
                onClick={() => { setMobileNavOpen(false); window.location.href = '/login'; }}
              >
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </nav>
        </div>
      )}

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
        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground transition-colors duration-200">Capabilities</a>
          <a href="#stakeholders" className="hover:text-foreground transition-colors duration-200">Stakeholders</a>
          <a href="#compliance" className="hover:text-foreground transition-colors duration-200">Compliance</a>
          <Link href="/how-it-works" className="hover:text-foreground transition-colors duration-200">How It Works</Link>
          <Link href="/faq" className="hover:text-foreground transition-colors duration-200">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-blink" />
            <span className="text-[10px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>PILOT</span>
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
                <Button size="sm" className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-md shadow-primary/20">
                  Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-md shadow-primary/20"
                onClick={() => window.location.href = "/login"}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )
          )}
          {/* Hamburger — visible on md and below (< 1024px) */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
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
                Battery Circular Economy Pilot Platform
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
              Registry, telemetry connection paths, physics-based health estimates,
              listing workflows and draft regulatory records in one platform.
              Real battery connectivity, safety, payments and legal conformity
              require separate pilot acceptance.
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

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">Native email/password sign-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">Carbon estimates — review required</span>
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
                    <span className="text-muted-foreground font-medium">Workflow scope — not acceptance</span>
                    <span className="text-amber-400 font-bold" style={{ fontFamily: "var(--font-mono)" }}>Pilot</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Hardware, safety and regulatory gates remain open.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-border/40 bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-primary mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {stat.value}
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
            Battery Lifecycle Workflows for Review
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Source workflows cover identity, telemetry, heuristic analytics, listings,
            regulatory records and reporting. Implemented code is not end-to-end acceptance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Role-Oriented Workflows</span>
            </div>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold mb-5 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Designed for Battery Value-Chain Roles
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
              Role-oriented dashboards support value-chain workflows. Resource authorization,
              tenant boundaries and jurisdiction-specific governance need separate verification.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
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
            Regulatory Preparation — Not Certification
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Metadata, forms and report templates help organize declared evidence.
            They do not ensure legal compliance, government submission or regulatory approval.
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
                <CircleHelp className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-amber-400" style={{ fontFamily: "var(--font-mono)" }}>
                  {fw.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ─── CTA + CONTACT FORM ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-chart-2/5 rounded-3xl blur-3xl" />
            <div className="relative bg-card/40 border border-border/40 rounded-3xl p-10 lg:p-14 backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                {/* Left: headline + buttons */}
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 mb-6 w-fit">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>Get Started Today</span>
                  </div>
                  <h2 className="text-3xl lg:text-[2.6rem] font-extrabold mb-5 tracking-tight leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                    Ready to Transform Your<br />
                    <span className="text-primary">Battery Value Chain?</span>
                  </h2>
                  <p className="text-muted-foreground text-base leading-relaxed mb-8">
                    Begin with a bounded battery connection pilot and evidence review.
                    Software estimates are not battery safety advice or a compliance certificate.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-12 text-[15px] rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                      onClick={() => window.location.href = "/login"}
                    >
                      Sign In for Pilot <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Link href="/wiki">
                      <Button size="lg" variant="outline" className="border-border/60 hover:border-primary/40 hover:bg-primary/5 px-8 h-12 text-[15px] rounded-xl">
                        Read Documentation <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-8 flex flex-col gap-2.5">
                    {[
                      "Bounded pilot acceptance required",
                      "Regulatory records require qualified review",
                      "Real hardware and provider integrations remain unverified",
                    ].map((point) => (
                      <div key={point} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: contact form */}
                <div className="bg-background/60 border border-border/50 rounded-2xl p-7 backdrop-blur-sm">
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">Get in Touch</h3>
                          <p className="text-[12px] text-muted-foreground">Local draft only — sending is disabled; nothing is stored</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-name" className="text-[12px] font-semibold">Full Name <span className="text-destructive">*</span></Label>
                          <Input
                            id="contact-name"
                            placeholder="Jane Smith"
                            value={contactForm.name}
                            onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                            className={`h-9 text-sm ${contactErrors.name ? "border-destructive" : ""}`}
                          />
                          {contactErrors.name && <p className="text-[11px] text-destructive">{contactErrors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-email" className="text-[12px] font-semibold">Work Email <span className="text-destructive">*</span></Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="jane@company.com"
                            value={contactForm.email}
                            onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                            className={`h-9 text-sm ${contactErrors.email ? "border-destructive" : ""}`}
                          />
                          {contactErrors.email && <p className="text-[11px] text-destructive">{contactErrors.email}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-company" className="text-[12px] font-semibold">Company</Label>
                          <Input
                            id="contact-company"
                            placeholder="Acme Energy Co."
                            value={contactForm.company}
                            onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-role" className="text-[12px] font-semibold">Your Role</Label>
                          <Input
                            id="contact-role"
                            placeholder="CTO, Compliance Officer…"
                            value={contactForm.role}
                            onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-message" className="text-[12px] font-semibold">Message <span className="text-destructive">*</span></Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us about your use case, fleet size, or any questions you have…"
                          rows={4}
                          value={contactForm.message}
                          onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                          className={`text-sm resize-none ${contactErrors.message ? "border-destructive" : ""}`}
                        />
                        {contactErrors.message && <p className="text-[11px] text-destructive">{contactErrors.message}</p>}
                      </div>

                      {contactErrors.submit && (
                        <p className="text-[12px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">{contactErrors.submit}</p>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 rounded-xl"
                        disabled
                        title="Contact delivery and privacy controls are not yet verified"
                      >
                        <span className="flex items-center gap-2"><Send className="w-4 h-4" />Sending unavailable</span>
                      </Button>
                    </form>
                </div>

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
                Battery circular-economy software for registry, heuristic estimates and draft regulatory records. Pilot acceptance remains required.
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
                <Link href="/faq" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
                <Link href="/how-it-works" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
                <Link href="/glossary" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Glossary</Link>
                <Link href="/wiki" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">CirculWiki</Link>
                <Link href="/getting-started" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Getting Started</Link>
                <a href="/api/docs" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">API Docs</a>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-mono)" }}>Compliance</h4>
              <div className="space-y-2.5">
                <span className="block text-[13px] text-muted-foreground">ISO 27001 — not certified</span>
                <span className="block text-[13px] text-muted-foreground">SOC 2 — no attestation</span>
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
