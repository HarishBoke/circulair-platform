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
    icon: QrCode, step: 1, title: "Prepare a Canonical Battery Record",
    description: "Local battery identification and QR records; official BPAN enrollment not verified. Link the local record to the physical label and verify chemistry, rated capacity, voltage and manufacture date from controlled records. Preserve legacy local aliases; official issuance, canonical mapping and ownership need separate acceptance.",
    details: ["Local battery identification and QR record paths exist", "Compare the physical label with canonical identity", "Retain authorized specifications and test evidence", "Reject missing or mismatched identifiers"],
    duration: "Pilot acceptance required", tool: "Registry / Pilot",
  },
  {
    icon: Cpu, step: 2, title: "Validate a Read-Only Telemetry Connection",
    description: "MQTT, REST API and WebSocket source paths exist, with gateway reference code. Installation is manual; no remote hardware has been commissioned here. First prove payload units, timestamps, source labels and device-to-BPAN binding offline, then obtain separate approval for an isolated physical connection.",
    details: ["Gateway code is reference code, not installed firmware", "Broker TLS, ACLs and credential lifecycle remain unverified", "CAN, UART or Modbus compatibility is hardware-specific", "Telemetry is not an emergency cutoff or control system"],
    duration: "Hardware setup time unknown", tool: "Telemetry / Pilot",
  },
  {
    icon: BarChart3, step: 3, title: "Review Heuristic Battery Health Estimates",
    description: "The implemented SOH path uses a deterministic physics-based model. Its remaining-life and triage outputs are estimates, not validated neural-network inference. Use authorized real-source data and compare results with qualified measurements before making a lifecycle decision.",
    details: ["Accuracy unvalidated; no training dataset established", "Confidence and error fields are heuristic, not measured RMSE", "Synthetic telemetry must not be treated as measured evidence", "Qualified human review is required; no autonomous approval"],
    duration: "Calibration and acceptance pending", tool: "Health / Estimate",
  },
  {
    icon: ShoppingCart, step: 4, title: "Review Listings without Real Settlement",
    description: "Listing, offer and indicative pricing workflows exist. A listed SOH or document is declared evidence, not battery qualification. Real purchases, settlement, refunds and payouts require separate authorization, integrity and provider acceptance; a local test is not payment verification.",
    details: ["Manual inventory qualification required", "Currency display does not prove currency settlement", "Logistics records do not confirm carrier dispatch", "Do not use the pilot for real transactions"],
    duration: "Commercial acceptance pending", tool: "Marketplace / Review",
  },
  {
    icon: Shield, step: 5, title: "Prepare Draft Regulatory Records",
    description: "Jurisdiction metadata, declaration forms and report templates support evidence preparation. Government submission adapters, period and organization scoping, legal obligations and regulator acceptance are not established. Treat all generated outputs as draft or self-declared until reviewed.",
    details: ["Templates are not compliance certification", "No verified government synchronization", "Missing obligation evidence means status unknown", "Qualified jurisdiction-specific review required"],
    duration: "Regulatory sign-off pending", tool: "Regulatory / Draft",
  },
  {
    icon: Recycle, step: 6, title: "Record Declared Recovery Evidence",
    description: "Yield forms capture declared material recovery and internal EPR records. They do not independently verify recycler measurements, issue recognized regulatory credits or prove obligations fulfilled. No real blockchain anchoring is established; generated transaction-like values are demo data.",
    details: ["Independent mass measurement and event identity required", "Finite nonnegative quantities and replay controls required", "Internal records are not regulatory credits", "Hash comparison is not blockchain receipt verification"],
    duration: "Recovery assurance pending", tool: "Recovery / Declared",
  },
];

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function HowItWorks() {
  usePageTitle("How It Works — Bounded Battery Pilot with Circul-AI-r");

  useStructuredData({
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Prepare a Bounded Battery Pilot with Circul-AI-r",
    "description":
      "A bounded pilot preparation guide for battery records, telemetry validation, heuristic estimates, listing review and draft regulatory evidence. Physical, safety, payment and legal acceptance remain pending.",
    "url": "https://circulair.energy/how-it-works",
    "step": STEPS.map((s) => ({
      "@type": "HowToStep",
      "position": s.step,
      "name": s.title,
      "text": s.description,
      "url": `https://circulair.energy/how-it-works#step-${s.step}`,
    })),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-xs font-mono">HOW IT WORKS</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Battery Pilot Preparation in 6 Steps
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Circul-AI-r brings battery records and review workflows together.
            These steps describe a bounded pilot, not verified hardware operation or launch acceptance.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Sign In for Pilot <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                View Documentation
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
                title: "Identity Records",
                desc: "Registry and QR paths exist. Canonical identity, physical labeling and complete history require acceptance.",
              },
              {
                title: "Heuristic Estimates",
                desc: "Physics-based SOH and triage suggestions are uncalibrated estimates for human review, not battery safety decisions.",
              },
              {
                title: "Draft Regulatory Evidence",
                desc: "Metadata and templates support preparation. Legal conformity, deadlines and government submission remain unverified.",
              },
              {
                title: "Listing Review",
                desc: "Listings and indicative pricing support manual review. No accepted payment, matching or payout workflow is implied.",
              },
              {
                title: "Telemetry Pilot",
                desc: "Ingest source paths require broker, device, payload and physical acceptance. Connectivity and latency are not guaranteed.",
              },
              {
                title: "Declared Recovery Records",
                desc: "Internal yield records are self-declared. Independent assurance and regulatory recognition are not established.",
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
            Use an authorized pilot identity and isolated data only. Real battery tests need qualified supervision and a separately approved protocol.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Sign In for Pilot <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/faq" className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted/50 transition-colors">
                Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
