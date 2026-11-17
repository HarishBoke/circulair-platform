import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { Link } from "wouter";

/* ─── GLOSSARY DATA ─────────────────────────────────────────────────────── */
const TERMS = [
  { letter: "A", term: "AEO (Answer Engine Optimisation)", def: "Strategies to make content discoverable and citable by AI-powered answer engines such as Perplexity, ChatGPT, and Google SGE." },
  { letter: "B", term: "Battery Circular Economy", def: "An economic model aiming to preserve battery and material value through responsible use and recovery. Traceability and listing records may support review; the app does not certify safe reuse or recycling compliance." },
  { letter: "B", term: "Battery Management System (BMS)", def: "An electronic system that monitors and manages a rechargeable battery pack. A BMS measures cell voltages, temperatures, current, and State of Charge, and communicates this data to external systems via CAN bus, UART, or MQTT." },
  { letter: "B", term: "Battery Passport", def: "A digital identity and lifecycle information record. Official requirements vary by jurisdiction and category. Local identification and QR records in this app are not an officially enrolled passport; official BPAN enrollment not verified." },
  { letter: "B", term: "BPAN (Battery Passport Alphanumeric Number)", def: "A local battery identifier in the app. Legacy formats and a separate 21-character draft require approved mapping and preserved aliases. Neither a length check nor a generated value establishes official issuer allocation or enrollment." },
  { letter: "C", term: "C-Rate", def: "A measure of the rate at which a battery is charged or discharged relative to its maximum capacity. A 1C rate means the battery is fully charged or discharged in one hour. Higher C-rates accelerate battery degradation." },
  { letter: "C", term: "Calendar Ageing", def: "The degradation of a battery's capacity and performance over time, independent of usage. Calendar ageing is caused by electrolyte decomposition, lithium plating, and SEI layer growth. It is a key input to Circul-AI-r's SOH prediction model." },
  { letter: "C", term: "Carbon Footprint Declaration", def: "A disclosure of greenhouse gas emissions under an applicable methodology and reporting boundary. App calculations are estimates and draft evidence, not approved declarations or verified methodology conformity." },
  { letter: "C", term: "CPCB BW-3", def: "A legacy app label related to Indian battery waste reporting. Current forms, rules, targets and category applicability require regulator and qualified legal review. No approved submission or automatic fulfillment is established." },
  { letter: "C", term: "CNN-LSTM", def: "Convolutional Neural Network plus Long Short-Term Memory: a general neural architecture combining feature extraction and temporal sequence modeling. It is not the current app's deterministic SOH heuristic and is not evidence of a trained or validated app model." },
  { letter: "C", term: "Cycle Count", def: "A count of equivalent full charge-discharge cycles under a specified convention. Availability and accuracy depend on the source; a missing cycle count is unknown, not zero." },
  { letter: "D", term: "Depth of Discharge (DoD)", def: "The fraction of reference battery capacity discharged, expressed as a percentage. Depth of discharge can influence degradation; a generic range is not an approved pack operating limit." },
  { letter: "D", term: "Digital Product Passport (DPP)", def: "A structured product-information record covering identity, materials, supply chain and lifecycle. Requirements vary by product and jurisdiction; an app record does not establish official enrollment or conformity." },
  { letter: "E", term: "End-of-First-Life (EoFL)", def: "The point at which a battery no longer meets the requirements of its original application. It is application- and condition-specific; no universal SOH threshold approves second-life use." },
  { letter: "E", term: "End-of-Life (EoL)", def: "An application- and condition-specific lifecycle assessment requiring qualified review. SOH alone cannot authorize disposal or recycling, and a heuristic forecast is not an approved decision." },
  { letter: "E", term: "EPR (Extended Producer Responsibility)", def: "A policy assigning producers responsibilities for product end-of-life management. Requirements vary; draft app reports do not establish legal compliance or fulfilled obligations." },
  { letter: "E", term: "EPR Token", def: "An internal recycling-related record. Self-declared yields, local hashes and status labels are not official certificates, independently verified recovery or blockchain receipts." },
  { letter: "E", term: "EU Battery Regulation (2023/1542)", def: "An EU regulatory framework addressing batteries and their lifecycle. Category-specific requirements, timing and delegated measures need current authoritative and qualified review; this glossary is not legal advice." },
  { letter: "F", term: "Federated Learning", def: "A general technique for distributed model training without centrally collecting raw training data. The app's metadata-only round/version records do not perform weight aggregation or improve a trained model; training is gated unavailable." },
  { letter: "I", term: "IoT Gateway", def: "A device that bridges documented sensor or BMS interfaces to a data system. Historical gateway sources are not accepted physical integrations. Separate operator approval, isolation and source authorization are required." },
  { letter: "L", term: "LFP (Lithium Iron Phosphate)", def: "A lithium-ion battery chemistry known for long cycle life, thermal stability, and safety. LFP batteries are used in stationary storage and electric vehicles. Chemistry labels do not establish pack-specific safety or calibrated model support." },
  { letter: "L", term: "Lithium-Ion Battery", def: "A rechargeable technology based on lithium-ion movement between electrodes. Chemistry labels and software records do not establish safe operation or lifecycle suitability for a particular pack." },
  { letter: "M", term: "MQTT (Message Queuing Telemetry Transport)", def: "A lightweight publish-subscribe protocol often used for IoT. TLS and device/topic access controls require separate configuration and acceptance. No public broker production use or working physical connection is established here." },
  { letter: "N", term: "NMC (Nickel Manganese Cobalt)", def: "A lithium-ion battery chemistry offering high energy density and good cycle life. NMC compositions are used in electric vehicles and other applications. Pack-specific characteristics and model support require separate evidence." },
  { letter: "R", term: "RMSE (Root Mean Square Error)", def: "The square root of mean squared prediction residuals against measured reference values on a specified dataset, in the target's units. It is an aggregate error measure, not a bound on every prediction. App legacy RMSE-like metadata is not observed validation error; accuracy is unknown." },
  { letter: "R", term: "RUL (Remaining Useful Life)", def: "An estimate of time or cycles to a stated performance threshold under specified conditions. App outputs are uncalibrated heuristics, not warranty terms, remaining-life guarantees or approved maintenance decisions." },
  { letter: "S", term: "Second-Life Battery", def: "A battery evaluated for a different application after its original use. Qualification requires evidence beyond SOH, including history, inspection, manufacturer limits and applicable requirements; a marketplace listing is not approval." },
  { letter: "S", term: "SEI Layer (Solid Electrolyte Interphase)", def: "A passivation layer that forms on the anode surface of lithium-ion batteries during the first few charge cycles. The SEI layer grows over time, consuming lithium and contributing to capacity fade. SEI growth is a key mechanism of battery ageing." },
  { letter: "S", term: "SOC (State of Charge)", def: "The current charge level expressed as a percentage of reference full capacity. SOC is analogous to a fuel gauge — 100% means fully charged, 0% means fully discharged under the stated reference conditions. Estimation and measurement uncertainty depend on the BMS and method; SOC is not SOH or a safety certificate." },
  { letter: "S", term: "SOH (State of Health)", def: "Capacity-based SOH is current measured capacity divided by rated capacity, expressed as a percentage. SOH = 100% when capacity equals the reference rating under the test conditions. App SOH estimates are uncalibrated and do not authorize safety, second-life or recycling decisions." },
  { letter: "S", term: "SSB (Solid-State Battery)", def: "A battery technology using a solid electrolyte. Potential performance and safety depend on design and validation; a chemistry code does not prove hardware compatibility or calibrated prediction support." },
  { letter: "T", term: "Triage Path", def: "A stored candidate lifecycle label for qualified human review. Uncalibrated heuristics are not approved safety, second-life or recycling decisions. The app does not dispatch carriers or automatically approve routes." },
  { letter: "Y", term: "Yield Verification", def: "An evidence-based review of recovered material quantities and mass balance. App-recorded declarations or ratios are not independently verified recovery, regulatory certification or fulfilled obligations." },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Glossary() {
  usePageTitle("Battery Industry Glossary — BPAN, SOH, EPR, RUL, BMS and More");

  useStructuredData({
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "Battery Circular Economy Glossary",
    "description": "Comprehensive glossary of battery industry terms including BPAN, SOH, EPR, RUL, BMS, and more.",
    "url": "https://www.circulair.energy/glossary",
    "hasDefinedTerm": TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "name": t.term,
      "description": t.def,
      "inDefinedTermSet": "https://www.circulair.energy/glossary",
    })),
  });

  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = TERMS.filter((t) => {
    const matchLetter = !activeLetter || t.letter === activeLetter;
    const matchSearch =
      !search ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.def.toLowerCase().includes(search.toLowerCase());
    return matchLetter && matchSearch;
  });

  const usedLetters = new Set(TERMS.map((t) => t.letter));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-xs font-mono">GLOSSARY</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Battery Industry Glossary
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            General technical definitions and explicit development boundaries.
            Not legal advice, certification or physical safety approval.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Alphabet Nav */}
      <section className="border-b border-border py-3 px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-1 justify-center">
          <button
            onClick={() => setActiveLetter(null)}
            className={`w-8 h-8 rounded text-sm font-mono font-medium transition-colors ${
              !activeLetter ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            All
          </button>
          {ALPHABET.map((l) => (
            <button
              key={l}
              disabled={!usedLetters.has(l)}
              onClick={() => setActiveLetter(activeLetter === l ? null : l)}
              className={`w-8 h-8 rounded text-sm font-mono font-medium transition-colors ${
                activeLetter === l
                  ? "bg-primary text-primary-foreground"
                  : usedLetters.has(l)
                  ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No terms match your search.</p>
          ) : (
            <dl className="space-y-6">
              {filtered.map((t, i) => (
                <div key={i} className="border-b border-border pb-6 last:border-0">
                  <dt className="font-bold text-lg text-foreground mb-2">{t.term}</dt>
                  <dd className="text-muted-foreground leading-relaxed">{t.def}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border py-12 px-4 bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Learn more in the Circul-AI-r Wiki</h2>
          <p className="text-muted-foreground mb-6">
            Deep-dive articles on battery lifecycle management, EPR compliance, AI prediction models,
            and circular economy best practices.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/wiki" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Browse the Wiki
              </Link>
            <Link href="/faq" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                View FAQ
              </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
