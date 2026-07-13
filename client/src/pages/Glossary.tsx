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
  { letter: "B", term: "Battery Circular Economy", def: "An economic model in which batteries are designed, manufactured, used, and recovered in closed loops — maximising material value and minimising waste. Circul-AI-r enables the battery circular economy through traceability, second-life trading, and recycling compliance." },
  { letter: "B", term: "Battery Management System (BMS)", def: "An electronic system that monitors and manages a rechargeable battery pack. A BMS measures cell voltages, temperatures, current, and State of Charge, and communicates this data to external systems via CAN bus, UART, or MQTT." },
  { letter: "B", term: "Battery Passport", def: "A digital record containing a battery's identity, composition, performance history, and end-of-life instructions. Mandated by the EU Battery Regulation (2023/1542) for EV batteries from 2027. Circul-AI-r generates battery passports encoded as BPANs." },
  { letter: "B", term: "BPAN (Battery Passport Alphanumeric Number)", def: "A 19-character unique identifier for each battery registered on the Circul-AI-r platform. The BPAN encodes country of origin, manufacturer, chemistry, capacity, voltage, production date, and factory code." },
  { letter: "C", term: "C-Rate", def: "A measure of the rate at which a battery is charged or discharged relative to its maximum capacity. A 1C rate means the battery is fully charged or discharged in one hour. Higher C-rates accelerate battery degradation." },
  { letter: "C", term: "Calendar Ageing", def: "The degradation of a battery's capacity and performance over time, independent of usage. Calendar ageing is caused by electrolyte decomposition, lithium plating, and SEI layer growth. It is a key input to Circul-AI-r's SOH prediction model." },
  { letter: "C", term: "Carbon Footprint Declaration", def: "A mandatory disclosure under the EU Battery Regulation (from 2025) stating the total greenhouse gas emissions associated with a battery's production, expressed in kg CO₂ equivalent per kWh. Circul-AI-r automates carbon footprint calculations and declaration generation." },
  { letter: "C", term: "CPCB BW-3", def: "Central Pollution Control Board Battery Waste Management Rules 2022 (India). Requires battery producers to register, achieve collection and recycling targets (70% in 2024-25, rising to 90% by 2026-27), and submit quarterly compliance reports. Circul-AI-r provides automated BW-3 reporting." },
  { letter: "C", term: "CNN-LSTM", def: "Convolutional Neural Network + Long Short-Term Memory — a hybrid deep learning architecture used by Circul-AI-r for battery SOH prediction. CNNs extract spatial features from telemetry data; LSTMs capture temporal patterns in charge-discharge cycles." },
  { letter: "C", term: "Cycle Count", def: "The number of complete charge-discharge cycles a battery has undergone. Cycle count is a primary indicator of battery ageing and is tracked by Circul-AI-r for every registered battery." },
  { letter: "D", term: "Depth of Discharge (DoD)", def: "The percentage of a battery's capacity that has been discharged relative to its total capacity. Higher DoD per cycle accelerates battery degradation. Circul-AI-r tracks average DoD as part of its SOH prediction inputs." },
  { letter: "D", term: "Digital Product Passport (DPP)", def: "A standardised digital record mandated by EU regulations for products including batteries. Contains materials, supply chain, performance, and end-of-life data. Circul-AI-r generates EU-compliant DPPs for all registered batteries." },
  { letter: "E", term: "End-of-First-Life (EoFL)", def: "The point at which a battery is no longer suitable for its original application (typically EV propulsion) but still has significant capacity for second-life use. EoFL is typically defined as SOH ≈ 80% for EV batteries." },
  { letter: "E", term: "End-of-Life (EoL)", def: "The point at which a battery can no longer be used in any application and must be recycled. EoL is typically defined as SOH ≈ 70% or below. Circul-AI-r's AI model predicts when a battery will reach EoL." },
  { letter: "E", term: "EPR (Extended Producer Responsibility)", def: "A policy approach that makes producers responsible for the end-of-life management of their products. For batteries, EPR requires producers to fund collection, sorting, and recycling. Circul-AI-r supports EPR compliance across 7 jurisdictions." },
  { letter: "E", term: "EPR Token", def: "A digital certificate issued by Circul-AI-r when a battery is recycled and yield is verified. EPR tokens represent fulfilled recycling obligations and can be used by producers to demonstrate EPR compliance to regulators." },
  { letter: "E", term: "EU Battery Regulation (2023/1542)", def: "The European Union's comprehensive regulation for sustainable batteries, covering the entire lifecycle from raw material sourcing to end-of-life recycling. Key requirements include digital battery passports (2027), carbon footprint declarations (2025), and recycled content targets (2028)." },
  { letter: "F", term: "Federated Learning", def: "A machine learning approach in which models are trained across multiple decentralised devices or servers without sharing raw data. Circul-AI-r uses federated learning to improve SOH prediction models across battery fleets while preserving data privacy." },
  { letter: "I", term: "IoT Gateway", def: "A hardware device that connects battery management systems to the Circul-AI-r cloud platform via MQTT. IoT gateways collect telemetry data from battery packs and transmit it securely to the platform for real-time monitoring and AI analysis." },
  { letter: "L", term: "LFP (Lithium Iron Phosphate)", def: "A lithium-ion battery chemistry known for long cycle life, thermal stability, and safety. LFP batteries are widely used in stationary energy storage and commercial EVs. Circul-AI-r tracks LFP batteries with chemistry code 'L' in the BPAN." },
  { letter: "L", term: "Lithium-Ion Battery", def: "A rechargeable battery technology that uses lithium ions moving between anode and cathode to store and release energy. Lithium-ion batteries power most EVs, consumer electronics, and grid storage systems. Circul-AI-r manages the full lifecycle of lithium-ion batteries." },
  { letter: "M", term: "MQTT (Message Queuing Telemetry Transport)", def: "A lightweight publish-subscribe messaging protocol used for IoT communication. Circul-AI-r uses MQTT over TLS for real-time telemetry ingestion from battery management systems and IoT gateways." },
  { letter: "N", term: "NMC (Nickel Manganese Cobalt)", def: "A lithium-ion battery chemistry offering high energy density and good cycle life. NMC batteries are the most common chemistry in EV applications. Circul-AI-r tracks NMC batteries with chemistry code 'N' in the BPAN." },
  { letter: "R", term: "RMSE (Root Mean Square Error)", def: "A statistical measure of prediction accuracy. Circul-AI-r's SOH prediction model achieves RMSE < 2%, meaning predictions are within 2 percentage points of actual SOH values on validation datasets." },
  { letter: "R", term: "RUL (Remaining Useful Life)", def: "The estimated number of charge-discharge cycles a battery can complete before reaching its end-of-life threshold. Circul-AI-r's AI model predicts RUL alongside SOH, enabling proactive battery management and second-life planning." },
  { letter: "S", term: "Second-Life Battery", def: "A battery that has completed its first-life application (typically EV propulsion) but still has sufficient capacity (SOH 70-85%) for less demanding applications such as stationary energy storage, telecom backup, or microgrid support. Circul-AI-r's marketplace connects second-life battery sellers and buyers." },
  { letter: "S", term: "SEI Layer (Solid Electrolyte Interphase)", def: "A passivation layer that forms on the anode surface of lithium-ion batteries during the first few charge cycles. The SEI layer grows over time, consuming lithium and contributing to capacity fade. SEI growth is a key mechanism of battery ageing." },
  { letter: "S", term: "SOC (State of Charge)", def: "The current charge level of a battery expressed as a percentage of its full capacity. SOC is analogous to a fuel gauge — 100% means fully charged, 0% means fully discharged. SOC is measured in real-time by the BMS and transmitted to Circul-AI-r." },
  { letter: "S", term: "SOH (State of Health)", def: "A measure of a battery's current capacity relative to its rated capacity, expressed as a percentage. SOH = 100% for a new battery. SOH decreases with cycling and ageing. Circul-AI-r's AI model predicts SOH from telemetry data with RMSE < 2%." },
  { letter: "S", term: "SSB (Solid-State Battery)", def: "A next-generation battery technology that replaces the liquid electrolyte with a solid electrolyte, offering higher energy density, improved safety, and longer cycle life. Circul-AI-r supports SSB tracking with chemistry code 'S' in the BPAN." },
  { letter: "T", term: "Triage Path", def: "Circul-AI-r's AI-recommended disposition for a battery at end-of-first-life: Direct Reuse (redeploy as-is), Refurbish (repair and redeploy), Repurpose (second-life stationary storage), or Recycle (material recovery). Triage paths are based on SOH, RUL, chemistry, and market conditions." },
  { letter: "Y", term: "Yield Verification", def: "The process of verifying the actual material yield recovered from recycling a battery. Circul-AI-r's yield verification module allows recyclers to record and certify the lithium, cobalt, nickel, and manganese recovered from each battery, which triggers EPR token issuance." },
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
            Authoritative definitions for battery lifecycle management, circular economy, EPR compliance,
            and AI-powered battery intelligence terms.
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
            <Link href="/wiki">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Browse the Wiki
              </a>
            </Link>
            <Link href="/faq">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors">
                View FAQ
              </a>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
