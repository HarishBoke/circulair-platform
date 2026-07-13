import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  QrCode, Cpu, BarChart3, ShoppingCart, Recycle, Shield,
  ArrowRight, CheckCircle2
} from "lucide-react";

/* ─── STEPS DATA ────────────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: QrCode,
    step: 1,
    title: "Register Your Battery",
    description:
      "Generate a unique Battery Passport Alphanumeric Number (BPAN) for each battery. Upload battery specifications — chemistry, capacity, voltage, manufacturer, and production date — via the web interface, CSV bulk import, or REST API. Each battery receives a digital identity that persists for its entire lifecycle.",
    details: [
      "Generate BPAN from battery specifications",
      "Bulk import via CSV or API",
      "Attach manufacturer certificates and test reports",
      "Set warranty terms and service intervals",
    ],
    duration: "5 minutes per battery or bulk in seconds",
    tool: "Battery Registry",
  },
  {
    icon: Cpu,
    step: 2,
    title: "Connect IoT Telemetry",
    description:
      "Connect your Battery Management System (BMS) to Circul-AI-r via MQTT over TLS. The platform provisions IoT gateways and provides firmware for common hardware platforms. Real-time telemetry — voltage, current, temperature, SOC, cycle count — streams to the platform and is stored with millisecond timestamps.",
    details: [
      "MQTT over TLS for secure data transmission",
      "REST API for batch telemetry upload",
      "Support for CAN bus, UART, and Modbus BMS protocols",
      "Edge gateway firmware for offline scenarios",
    ],
    duration: "30 minutes for first gateway setup",
    tool: "IoT Telemetry",
  },
  {
    icon: BarChart3,
    step: 3,
    title: "Predict Battery Health with AI",
    description:
      "Run AI-powered State of Health (SOH) predictions on any registered battery using its BPAN. The CNN-LSTM model analyses telemetry history to predict current SOH, Remaining Useful Life (RUL), confidence intervals, and a triage path. Predictions are stored and used to power the marketplace and compliance workflows.",
    details: [
      "CNN-LSTM model trained on millions of battery cycles",
      "SOH prediction with RMSE < 2%",
      "RUL prediction in cycles",
      "Triage path: Direct Reuse, Refurbish, Repurpose, or Recycle",
    ],
    duration: "Under 30 seconds per prediction",
    tool: "AI SOH Prediction",
  },
  {
    icon: ShoppingCart,
    step: 4,
    title: "List on the Second-Life Marketplace",
    description:
      "When a battery reaches end-of-first-life (SOH ≈ 80%), list it on the Circul-AI-r marketplace. Listings include AI-verified SOH, BPAN traceability, compliance documentation, and multi-currency pricing. Buyers — stationary storage operators, telecom companies, microgrid developers — can purchase with confidence.",
    details: [
      "AI-verified SOH included in every listing",
      "Multi-currency pricing (USD, EUR, INR, CNY, GBP, THB, IDR)",
      "Logistics and chain-of-custody tracking",
      "Stripe-powered secure payments",
    ],
    duration: "10 minutes to create a listing",
    tool: "Marketplace",
  },
  {
    icon: Shield,
    step: 5,
    title: "Automate EPR Compliance",
    description:
      "Generate EPR compliance reports for 7 jurisdictions — EU, India (CPCB BW-3), China (MEP), USA, UK, Thailand, and Indonesia — directly from the platform. Track collection and recycling targets, manage EPR tokens, and submit reports to regulatory authorities. Automated alerts notify you of upcoming deadlines.",
    details: [
      "Pre-built report templates for each jurisdiction",
      "Real-time compliance dashboards",
      "EPR token issuance upon yield verification",
      "Automated deadline alerts",
    ],
    duration: "Continuous — automated compliance monitoring",
    tool: "EPR Compliance",
  },
  {
    icon: Recycle,
    step: 6,
    title: "Verify Recycling Yield",
    description:
      "When a battery reaches end-of-life, send it to a registered recycler. The recycler records the actual material yield — lithium, cobalt, nickel, manganese — in Circul-AI-r. Upon verification, EPR tokens are issued to the producer, closing the circular economy loop and fulfilling regulatory obligations.",
    details: [
      "Recycler registration and verification",
      "Material yield recording by element",
      "EPR token issuance upon yield confirmation",
      "Blockchain-based audit trail",
    ],
    duration: "15 minutes per batch",
    tool: "Yield Verification",
  },
];

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function HowItWorks() {
  usePageTitle("How It Works — Battery Lifecycle Management with Circul-AI-r");

  useStructuredData({
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Manage Battery Lifecycle with Circul-AI-r",
    "description":
      "Step-by-step guide to registering batteries, connecting IoT telemetry, predicting SOH with AI, listing on the second-life marketplace, automating EPR compliance, and verifying recycling yield.",
    "url": "https://www.circulair.energy/how-it-works",
    "image": "https://d2xsxph8kpxj0f.cloudfront.net/310519663256112242/Su7XGBwDj2SqiggDTNrQPe/og-image-CMmQGxVgPUy53dDEotsvLk.png",
    "totalTime": "PT2H",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": "0",
    },
    "step": STEPS.map((s) => ({
      "@type": "HowToStep",
      "position": s.step,
      "name": s.title,
      "text": s.description,
      "url": `https://www.circulair.energy/how-it-works#step-${s.step}`,
    })),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-xs font-mono">HOW IT WORKS</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Battery Lifecycle Management in 6 Steps
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            From first registration to end-of-life recycling — Circul-AI-r covers the complete battery
            lifecycle with AI-powered intelligence, IoT connectivity, and automated compliance.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
            <Link href="/getting-started">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                View Documentation
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-16">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isEven = i % 2 === 0;
              return (
                <div
                  key={s.step}
                  id={`step-${s.step}`}
                  className={`flex flex-col lg:flex-row gap-8 items-start ${
                    isEven ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Icon + Step Number */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Step {s.step}/6</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-2xl font-bold">{s.title}</h2>
                      <Badge variant="secondary" className="text-xs">{s.tool}</Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">{s.description}</p>

                    <ul className="space-y-2 mb-4">
                      {s.details.map((d, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{d}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <span className="text-primary">⏱</span> {s.duration}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="border-t border-border py-16 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            What You Get with Circul-AI-r
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Full Traceability",
                desc: "Every battery has a BPAN — a permanent digital identity that follows it from manufacture to recycling.",
              },
              {
                title: "AI-Powered Decisions",
                desc: "CNN-LSTM SOH prediction with RMSE < 2% tells you exactly when to reuse, refurbish, repurpose, or recycle.",
              },
              {
                title: "Automated Compliance",
                desc: "EPR reports for 7 jurisdictions generated automatically — no manual data entry, no missed deadlines.",
              },
              {
                title: "Second-Life Revenue",
                desc: "Monetise end-of-first-life batteries through the marketplace instead of sending them directly to recycling.",
              },
              {
                title: "Real-Time Monitoring",
                desc: "MQTT-based IoT telemetry gives you live visibility into every battery in your fleet.",
              },
              {
                title: "Closed-Loop Recycling",
                desc: "Yield verification and EPR token issuance close the circular economy loop and prove compliance.",
              },
            ].map((item, i) => (
              <div key={i} className="p-5 border border-border rounded-xl bg-background">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Register your first battery for free. No credit card required.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <a className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Create Free Account <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
            <Link href="/faq">
              <a className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted/50 transition-colors">
                Read the FAQ
              </a>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
