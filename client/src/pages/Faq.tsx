import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { Link } from "wouter";

/* ─── FAQ DATA ──────────────────────────────────────────────────────────── */
const FAQ_CATEGORIES = [
  "All",
  "Battery Passport",
  "SOH Prediction",
  "EPR Compliance",
  "Marketplace",
  "IoT & Telemetry",
  "Platform",
  "Regulations",
];

const FAQS = [
  // Battery Passport
  {
    category: "Battery Passport",
    q: "What is a Battery Passport (BPAN)?",
    a: "A Battery Passport is a digital identity record for each battery, encoded as a unique Battery Passport Alphanumeric Number (BPAN). It contains the battery's chemistry, capacity, voltage, country of origin, manufacturer, production date, and lifecycle history. The EU Battery Regulation (2023/1542) mandates digital battery passports for EV batteries from 2027. Circul-AI-r generates and manages BPANs for batteries across all supported jurisdictions.",
  },
  {
    category: "Battery Passport",
    q: "How is a BPAN structured?",
    a: "A BPAN is a 19-character alphanumeric code encoding: country code (2 chars), manufacturer code (3 chars), capacity class (1 char), chemistry code (1 char), voltage class (2 chars), origin code (2 chars), extended type (1 char), year (2 chars), month (2 chars), day (2 chars), and factory code (1 char). Example: NLBYM2L48JP22101200 represents a Netherlands-manufactured NMC battery from a specific factory.",
  },
  {
    category: "Battery Passport",
    q: "Which battery chemistries does Circul-AI-r support?",
    a: "Circul-AI-r supports all major lithium battery chemistries: LFP (Lithium Iron Phosphate), NMC (Nickel Manganese Cobalt), NCA (Nickel Cobalt Aluminium), Solid-State (SSB), and emerging chemistries. Each chemistry is encoded in the BPAN and tracked throughout the battery's lifecycle.",
  },
  {
    category: "Battery Passport",
    q: "Can I import existing batteries into Circul-AI-r?",
    a: "Yes. Circul-AI-r supports bulk onboarding via CSV upload, API integration, and manual registration. Each battery receives a BPAN upon registration. For batteries already deployed in the field, you can register them with their existing serial numbers and map them to BPANs retroactively.",
  },
  // SOH Prediction
  {
    category: "SOH Prediction",
    q: "What is State of Health (SOH) in batteries?",
    a: "State of Health (SOH) is a measure of a battery's current capacity relative to its rated capacity, expressed as a percentage. A new battery has SOH = 100%. As a battery ages through charge-discharge cycles, temperature stress, and calendar aging, its SOH decreases. An EV battery is typically considered end-of-first-life at SOH ≈ 80%, making it suitable for second-life applications such as stationary energy storage.",
  },
  {
    category: "SOH Prediction",
    q: "How does Circul-AI-r's AI predict battery SOH?",
    a: "Circul-AI-r uses a CNN-LSTM (Convolutional Neural Network + Long Short-Term Memory) hybrid model trained on telemetry data including voltage, current, temperature, and cycle count. The model predicts current SOH, Remaining Useful Life (RUL) in cycles, confidence intervals, and a triage path (Direct Reuse, Refurbish, Repurpose, or Recycle). The model achieves RMSE < 2% on validation datasets.",
  },
  {
    category: "SOH Prediction",
    q: "What is Remaining Useful Life (RUL)?",
    a: "Remaining Useful Life (RUL) is the estimated number of charge-discharge cycles a battery can complete before its SOH drops below the end-of-life threshold (typically 70-80%). Circul-AI-r's AI model predicts RUL alongside SOH, enabling proactive maintenance scheduling and second-life planning.",
  },
  {
    category: "SOH Prediction",
    q: "What triage paths does the AI recommend?",
    a: "The AI triage system recommends one of four paths: (1) Direct Reuse — battery SOH is high enough for direct redeployment; (2) Refurbish — battery needs cell balancing or minor repair before reuse; (3) Repurpose — battery is suitable for second-life stationary storage (SOH 70-80%); (4) Recycle — battery has reached end-of-life and should be sent for material recovery.",
  },
  // EPR Compliance
  {
    category: "EPR Compliance",
    q: "What is Extended Producer Responsibility (EPR) for batteries?",
    a: "Extended Producer Responsibility (EPR) is a policy framework that makes battery producers financially and physically responsible for the end-of-life management of their products. EPR regulations require producers to register, report, and fund the collection and recycling of batteries. Circul-AI-r supports EPR compliance across 7 jurisdictions: EU, India (CPCB BW-3), China (MEP), USA (state-level), UK (BPR), Thailand, and Indonesia.",
  },
  {
    category: "EPR Compliance",
    q: "What is CPCB BW-3 compliance?",
    a: "CPCB BW-3 refers to the Central Pollution Control Board's Battery Waste Management Rules 2022 in India. Under BW-3, battery producers must register with CPCB, achieve collection and recycling targets (starting at 70% in 2024-25, rising to 90% by 2026-27), and submit quarterly compliance reports. Circul-AI-r automates BW-3 reporting with pre-built templates and real-time compliance dashboards.",
  },
  {
    category: "EPR Compliance",
    q: "Does Circul-AI-r support EU Battery Regulation compliance?",
    a: "Yes. Circul-AI-r supports the EU Battery Regulation (2023/1542), including digital battery passport requirements, carbon footprint declaration, recycled content reporting, and supply chain due diligence. The platform generates Battery Passport data in the format required by the EU Battery Regulation, ready for submission to national competent authorities.",
  },
  {
    category: "EPR Compliance",
    q: "What is an EPR token in Circul-AI-r?",
    a: "An EPR token in Circul-AI-r is a digital certificate representing a unit of recycling obligation fulfilled. When a battery is recycled by a registered recycler, a yield-verified EPR token is issued. Producers can use these tokens to demonstrate compliance with their EPR obligations. Tokens are immutably recorded and auditable.",
  },
  // Marketplace
  {
    category: "Marketplace",
    q: "What is the second-life battery marketplace?",
    a: "The Circul-AI-r marketplace is a B2B platform for trading second-life batteries — batteries that have completed their first-life use in EVs or industrial applications but still have significant capacity remaining (typically SOH 70-85%). Buyers include stationary energy storage operators, telecom tower operators, and microgrid developers. All listings include AI-verified SOH, BPAN traceability, and compliance documentation.",
  },
  {
    category: "Marketplace",
    q: "How are battery prices determined on the marketplace?",
    a: "Battery prices on the Circul-AI-r marketplace are set by sellers and reflect factors including SOH, chemistry, capacity, age, and market demand. The platform supports multi-currency pricing (USD, EUR, INR, CNY, GBP, THB, IDR). AI-powered price suggestions are available based on comparable listings and market trends.",
  },
  {
    category: "Marketplace",
    q: "How does Circul-AI-r verify battery condition before listing?",
    a: "All marketplace listings require a valid BPAN and AI-predicted SOH from the Circul-AI-r platform. Sellers must upload telemetry data or allow the platform to pull live IoT readings. The AI model validates the SOH claim and flags discrepancies. Optional third-party physical inspection certificates can also be attached to listings.",
  },
  // IoT & Telemetry
  {
    category: "IoT & Telemetry",
    q: "How does Circul-AI-r connect to battery management systems (BMS)?",
    a: "Circul-AI-r connects to Battery Management Systems (BMS) via MQTT protocol over TLS. The platform provides a device provisioning workflow to register IoT gateways and battery packs. Supported data points include cell voltage, pack voltage, current, temperature, SOC, cycle count, and fault codes. The platform also supports REST API ingestion for systems that cannot use MQTT.",
  },
  {
    category: "IoT & Telemetry",
    q: "What telemetry data does Circul-AI-r collect?",
    a: "Circul-AI-r collects real-time telemetry including: pack voltage (V), current (A), temperature (°C), State of Charge (SOC %), cycle count, individual cell voltages, fault codes, and GPS location (optional). Data is stored with millisecond timestamps and retained for the full battery lifecycle. Historical telemetry is used to train and improve SOH prediction models.",
  },
  {
    category: "IoT & Telemetry",
    q: "Does Circul-AI-r support offline or edge computing?",
    a: "Yes. Circul-AI-r supports edge computing via MQTT with QoS levels 1 and 2, which enable reliable message delivery even with intermittent connectivity. The platform also supports batch telemetry upload via REST API for offline scenarios. Edge gateway firmware is available for common hardware platforms.",
  },
  // Platform
  {
    category: "Platform",
    q: "What is Circul-AI-r?",
    a: "Circul-AI-r is an end-to-end battery lifecycle intelligence platform that enables battery manufacturers, EV OEMs, fleet operators, recyclers, and regulators to track, predict, trade, and comply across the entire battery lifecycle. The platform combines IoT telemetry, AI-powered health prediction, digital battery passports, EPR compliance automation, and a second-life marketplace in a single integrated solution.",
  },
  {
    category: "Platform",
    q: "Who uses Circul-AI-r?",
    a: "Circul-AI-r serves five stakeholder groups: (1) Battery Manufacturers — register batteries, generate BPANs, manage warranty; (2) EV OEMs & Fleet Operators — monitor battery health, predict maintenance, plan second-life; (3) Recyclers — receive batteries, verify yield, issue EPR tokens; (4) Regulators — access compliance dashboards, audit trails, and EPR reports; (5) Second-Life Buyers — purchase verified second-life batteries from the marketplace.",
  },
  {
    category: "Platform",
    q: "Does Circul-AI-r have an API?",
    a: "Yes. Circul-AI-r provides a RESTful API and a tRPC API for programmatic access to all platform features. An OpenAPI 3.1 specification is available at /api/v1/openapi.json. The platform also provides an MCP (Model Context Protocol) server for AI agent integration, enabling LLMs to query battery data, run SOH predictions, and check compliance status.",
  },
  {
    category: "Platform",
    q: "Is Circul-AI-r available as a white-label solution?",
    a: "Yes. Circul-AI-r is available as a white-label SaaS solution for battery manufacturers, recyclers, and national EPR compliance bodies. Enterprise plans include custom branding, dedicated infrastructure, on-premise deployment options, and SLA-backed support. Contact business@setoo.co for enterprise pricing.",
  },
  // Regulations
  {
    category: "Regulations",
    q: "What is the EU Battery Regulation 2023/1542?",
    a: "The EU Battery Regulation (Regulation 2023/1542) is the European Union's comprehensive framework for sustainable batteries. It mandates digital battery passports for EV batteries from 2027, carbon footprint declarations from 2025, recycled content requirements from 2028, and collection/recycling targets. Circul-AI-r is designed to help companies comply with all phases of the EU Battery Regulation.",
  },
  {
    category: "Regulations",
    q: "What are the battery recycling targets under CPCB BW-3?",
    a: "Under India's Battery Waste Management Rules 2022 (CPCB BW-3), producers must achieve the following collection and recycling targets: 70% in 2024-25, 80% in 2025-26, and 90% from 2026-27 onwards. Targets apply to all battery categories including EV batteries, portable batteries, and industrial batteries. Non-compliance attracts penalties and can result in suspension of import/manufacturing licenses.",
  },
  {
    category: "Regulations",
    q: "How does Circul-AI-r help with China's MEP battery regulations?",
    a: "Circul-AI-r supports China's Ministry of Ecology and Environment (MEP) battery regulations, including the New Energy Vehicle Battery Recycling Management Measures. The platform tracks battery provenance, generates recycling certificates, and supports the China Battery Traceability Platform (CATL-compatible) data format for regulatory reporting.",
  },
  {
    category: "Regulations",
    q: "What is a Digital Product Passport (DPP)?",
    a: "A Digital Product Passport (DPP) is a standardised digital record that contains information about a product's materials, components, supply chain, and end-of-life instructions. For batteries, the EU Battery Regulation mandates DPPs that include SOH data, carbon footprint, recycled content, and supply chain due diligence information. Circul-AI-r generates EU-compliant DPPs for every registered battery.",
  },
];

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function Faq() {
  usePageTitle("FAQ — Battery Circular Economy, BPAN, SOH, EPR Compliance");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a,
      },
    })),
  };
  useStructuredData(faqSchema);

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = FAQS.filter((faq) => {
    const matchCat = activeCategory === "All" || faq.category === activeCategory;
    const matchSearch =
      !search ||
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-xs font-mono">FAQ</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Everything you need to know about battery lifecycle management, BPAN traceability,
            AI-powered SOH prediction, EPR compliance, and the Circul-AI-r platform.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b border-border py-4 px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-2 justify-center">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              No questions match your search. Try different keywords.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((faq, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    aria-expanded={openIndex === i}
                  >
                    <div className="flex-1">
                      <span className="text-xs font-mono text-muted-foreground mb-1 block">
                        {faq.category}
                      </span>
                      <span className="font-semibold text-foreground">{faq.q}</span>
                    </div>
                    {openIndex === i ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                  {openIndex === i && (
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed border-t border-border pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-12 px-4 bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is happy to walk you through the platform, discuss your compliance requirements,
            or set up a pilot for your battery fleet.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Contact Us
              </a>
            </Link>
            <Link href="/wiki">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                Browse the Wiki
              </a>
            </Link>
            <Link href="/getting-started">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                Getting Started Guide
              </a>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
