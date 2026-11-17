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
    a: "A battery passport is an identity and lifecycle information record. Circul-AI-r stores local battery identification and QR records; official BPAN enrollment not verified. A record here is not a government-issued passport, regulatory acceptance or proof of battery condition.",
  },
  {
    category: "Battery Passport",
    q: "How is a BPAN structured?",
    a: "Existing app records may use legacy local identifiers. A separate 21-character draft identifier is under review; issuer allocation and official enrollment are unconfirmed. Preserve existing identifiers and aliases during any approved mapping. Do not infer an official standard from an example or length check.",
  },
  {
    category: "Battery Passport",
    q: "Which battery chemistries does Circul-AI-r support?",
    a: "Records may describe chemistries such as LFP, NMC and NCA. A chemistry label is not evidence of a calibrated model, a working BMS adapter or suitability for a particular application. Confirm accepted registration fields and pack-specific documentation separately.",
  },
  {
    category: "Battery Passport",
    q: "Can I import existing batteries into Circul-AI-r?",
    a: "Registration and import source workflows exist, subject to authentication, ownership and validation. Review authorized offline fixtures before importing, preserve original serial numbers and report rejected rows honestly. Do not seed, overwrite or relabel production customer data as a pilot.",
  },
  // SOH Prediction
  {
    category: "SOH Prediction",
    q: "What is State of Health (SOH) in batteries?",
    a: "Capacity-based SOH is current measured capacity divided by rated capacity, expressed as a percentage; 100% means capacity equals the reference rating under the specified test conditions. SOH alone cannot establish safety, end-of-life or suitability for second-life use. Manufacturer limits, history, physical inspection and qualified review remain necessary.",
  },
  {
    category: "SOH Prediction",
    q: "How does Circul-AI-r's AI predict battery SOH?",
    a: "The current SOH path uses deterministic physics-based heuristics, not a validated trained neural network. SOH and Remaining Useful Life outputs are uncalibrated estimates. Confidence and error-like legacy metadata are not observed accuracy or validated uncertainty. No held-out accuracy claim or autonomous safety approval is made.",
  },
  {
    category: "SOH Prediction",
    q: "What is Remaining Useful Life (RUL)?",
    a: "RUL is an estimate of time or cycles until a specified performance threshold under stated conditions. The app's heuristic RUL is uncalibrated and is not a warranty, service-life guarantee, maintenance instruction or approved disposal decision. Verify units and assumptions for the particular output.",
  },
  {
    category: "SOH Prediction",
    q: "What triage paths does the AI recommend?",
    a: "Stored labels may describe reuse, refurbishment, repurposing or recycling candidates. They are uncalibrated review suggestions, not approved safety, second-life or recycling decisions. The app does not authorize redeployment, repairs, carrier dispatch or automated route approval.",
  },
  // EPR Compliance
  {
    category: "EPR Compliance",
    q: "What is Extended Producer Responsibility (EPR) for batteries?",
    a: "EPR is a policy approach assigning producers responsibilities for product end-of-life management. Obligations vary by jurisdiction, battery category and current rules. App records and draft reports are not evidence that a producer has fulfilled an obligation; obtain qualified jurisdiction-specific review.",
  },
  {
    category: "EPR Compliance",
    q: "What is CPCB BW-3 compliance?",
    a: "India's battery waste rules and regulator forms require current, category-specific review. BW-3 is a legacy label in this app, not proof of an official form mapping. Draft records are not approved submissions; no government portal acceptance or automated reporting is claimed.",
  },
  {
    category: "EPR Compliance",
    q: "Does Circul-AI-r support EU Battery Regulation compliance?",
    a: "The app can organize draft battery and lifecycle records. It has not established EU passport-format conformity, carbon-methodology acceptance, legal compliance or a government submission integration. Verify applicable requirements with qualified counsel and the relevant authority before using a report.",
  },
  {
    category: "EPR Compliance",
    q: "What is an EPR token in Circul-AI-r?",
    a: "It is an internal recycling-related record. Recorded yields may be self-declared; a local hash or status label is not a blockchain receipt, official certificate or fulfilled recycling obligation. Independent facility, mass-balance and regulatory evidence are still required.",
  },
  // Marketplace
  {
    category: "Marketplace",
    q: "What is the second-life battery marketplace?",
    a: "It is a listing and record-review workflow. Seller declarations and uncalibrated SOH estimates do not verify safety or suitability. Payments and private document publishing are disabled pending separate acceptance; no completed sale, matching, dispatch or inspection is promised.",
  },
  {
    category: "Marketplace",
    q: "How are battery prices determined on the marketplace?",
    a: "Displayed asking prices are seller-supplied records. No calibrated automated valuation, verified market trend or executed payment is established. A listing price is not a transaction receipt or guarantee of value.",
  },
  {
    category: "Marketplace",
    q: "How does Circul-AI-r verify battery condition before listing?",
    a: "It does not independently verify physical condition from a listing or heuristic estimate. Review source provenance, measurement quality and separately obtained qualified inspection evidence. Uploaded documents and status labels are not automatically verified certificates or permission to reuse a battery.",
  },
  // IoT & Telemetry
  {
    category: "IoT & Telemetry",
    q: "How does Circul-AI-r connect to battery management systems (BMS)?",
    a: "Gateway reference sources and device contracts exist, but generic wiring, register maps and compatibility are not approved. Legacy hardware ingestion is blocked with HTTP 503. A later isolated physical pilot needs separate operator approval, calibrated instruments, device-to-battery authorization and measured provenance; no physical test has been performed here.",
  },
  {
    category: "IoT & Telemetry",
    q: "What telemetry data does Circul-AI-r collect?",
    a: "The schema can represent supplied measurements such as voltage, current, temperature and cycle count. Actual availability depends on source and authorization; missing values remain unknown and explicit zero is retained. Stored data does not establish live collection, lifecycle-long retention or model training.",
  },
  {
    category: "IoT & Telemetry",
    q: "Does Circul-AI-r support offline or edge computing?",
    a: "Offline fixtures and recorded exports can be reviewed before an approved connection. Historical gateway code is reference material, not accepted firmware or a delivery guarantee. The new local pilot is in development and not deployed; no new route is advertised as ready.",
  },
  // Platform
  {
    category: "Platform",
    q: "What is Circul-AI-r?",
    a: "Circul-AI-r is a brand-agnostic battery lifecycle record application with bounded development workflows. It organizes local identities, supplied telemetry, uncalibrated estimates, listings and draft regulatory evidence. It is not a complete safety, regulatory, carrier or financial execution system.",
  },
  {
    category: "Platform",
    q: "Who uses Circul-AI-r?",
    a: "The role model includes manufacturers, battery owners, service providers, recyclers and reviewers. These role names do not prove customer adoption, professional qualification, government endorsement or access to another organization's data. Server-side authorization remains the controlling boundary.",
  },
  {
    category: "Platform",
    q: "Does Circul-AI-r have an API?",
    a: "REST, tRPC and MCP source interfaces exist with authentication, scope and ownership boundaries. Legacy paths may be unavailable; confirm the enabled contract rather than assuming every listed capability executes. Read-only query access is distinct from metadata-only execution and training, which are gated unavailable.",
  },
  {
    category: "Platform",
    q: "Is Circul-AI-r available as a white-label solution?",
    a: "Brand-independent workflows are a design goal. Dedicated infrastructure, custom deployments, pricing, support response times and uptime commitments are not verified offers here. Any future deployment requires separate approval and acceptance.",
  },
  // Regulations
  {
    category: "Regulations",
    q: "What is the EU Battery Regulation 2023/1542?",
    a: "It is an EU regulatory framework addressing batteries and their lifecycle. Requirements and timing depend on battery category, delegated measures and current law. This offline glossary is not legal advice; obtain current authoritative guidance. App records do not establish conformity.",
  },
  {
    category: "Regulations",
    q: "What are the battery recycling targets under CPCB BW-3?",
    a: "Targets vary with the applicable battery category, reporting period and current rules. No universal percentage schedule is asserted here. Consult current regulator materials and qualified reviewers; software estimates or internal token counts cannot demonstrate that an obligation is fulfilled.",
  },
  {
    category: "Regulations",
    q: "How does Circul-AI-r help with China's MEP battery regulations?",
    a: "It can organize draft provenance and recycling records. No approved authority-specific adapter, traceability format or government portal submission is established. Legacy jurisdiction labels require current legal and technical review.",
  },
  {
    category: "Regulations",
    q: "What is a Digital Product Passport (DPP)?",
    a: "A DPP is a structured product-information record covering identity, materials, supply chain and lifecycle data. Applicable requirements vary. An app-generated identity or QR record is not automatically an officially enrolled or compliant DPP.",
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
            Development boundaries for local battery records, uncalibrated SOH estimates,
            draft regulatory evidence and the Circul-AI-r platform.
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
            Review the development documentation and outstanding acceptance boundaries.
            Physical pilot work requires separate approval; no test or release is promised here.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Platform Overview
              </Link>
            <Link href="/wiki" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                Browse the Wiki
              </Link>
            <Link href="/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                Getting Started Guide
              </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
