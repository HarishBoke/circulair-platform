import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import CirculairLogo from "@/components/CirculairLogo";
import { ArrowLeft, FileText, AlertTriangle, Database, Shield, Globe, Scale, Ban, RefreshCw, Mail } from "lucide-react";

function SectionHeader({ icon: Icon, number, title }: { icon: React.ElementType; number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h2 className="font-display text-lg font-semibold">
        <span className="text-muted-foreground font-mono text-sm mr-2">{number}.</span>
        {title}
      </h2>
    </div>
  );
}

export default function Terms() {
  usePageTitle("Terms of Service — Circul-AI-r");

  const lastUpdated = "2 April 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <CirculairLogo size={28} />
            <span className="font-display font-bold text-sm tracking-tight">Circul-AI-r</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">Terms of Service</h1>
          <p className="text-muted-foreground text-sm font-mono">
            Last updated: {lastUpdated} &nbsp;·&nbsp; Effective date: {lastUpdated}
          </p>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            These Terms of Service ("Terms") govern your access to and use of the <strong className="text-foreground">Circul-AI-r</strong> platform operated by <strong className="text-foreground">Setoo B.V.</strong> ("Company", "we", "us"). By accessing or using the platform, you agree to be bound by these Terms. If you do not agree, you must not use the platform.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1. Definitions */}
          <section>
            <SectionHeader icon={FileText} number="1" title="Definitions" />
            <div className="space-y-3 text-muted-foreground">
              <p>Throughout these Terms, the following definitions apply:</p>
              <div className="bg-card border border-border rounded-lg p-4 space-y-2 font-mono text-xs">
                <p><span className="text-foreground font-semibold">"Platform"</span> — the Circul-AI-r web application accessible at www.circulair.energy and associated APIs.</p>
                <p><span className="text-foreground font-semibold">"User"</span> — any individual or organisation that creates an account and accesses the Platform.</p>
                <p><span className="text-foreground font-semibold">"Battery Data"</span> — telemetry readings, state-of-health predictions, BPAN identifiers, and lifecycle records submitted to the Platform.</p>
                <p><span className="text-foreground font-semibold">"Services"</span> — all features provided by the Platform, including battery registry, AI SOH prediction, marketplace, compliance reporting, and logistics tracking.</p>
                <p><span className="text-foreground font-semibold">"Subscription"</span> — a paid or trial access plan that grants the User rights to use the Services.</p>
              </div>
            </div>
          </section>

          {/* 2. Acceptance and Eligibility */}
          <section>
            <SectionHeader icon={Shield} number="2" title="Acceptance and Eligibility" />
            <div className="space-y-3 text-muted-foreground">
              <p>By registering an account or using the Platform, you confirm that:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>You are at least 18 years of age or have the legal capacity to enter into a binding contract in your jurisdiction.</li>
                <li>You are authorised to act on behalf of the organisation you represent, if applicable.</li>
                <li>Your use of the Platform complies with all applicable laws and regulations in your jurisdiction, including battery waste management regulations (EU Battery Regulation 2023/1542, India BWMR 2022, China MIIT standards).</li>
                <li>You will not use the Platform for any unlawful purpose or in violation of these Terms.</li>
              </ul>
            </div>
          </section>

          {/* 3. Platform Usage */}
          <section>
            <SectionHeader icon={Globe} number="3" title="Platform Usage" />
            <div className="space-y-3 text-muted-foreground">
              <p>Subject to your compliance with these Terms, Setoo B.V. grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for your internal business purposes.</p>
              <p>You agree to use the Platform only for its intended purpose of battery lifecycle management, traceability, compliance reporting, and second-life marketplace operations. Specifically, you must not:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Reverse-engineer, decompile, or disassemble any part of the Platform or its underlying software.</li>
                <li>Scrape, crawl, or systematically extract data from the Platform without prior written consent.</li>
                <li>Use automated scripts or bots to interact with the Platform in ways that impose unreasonable load on infrastructure.</li>
                <li>Attempt to gain unauthorised access to other users' accounts, data, or systems.</li>
                <li>Submit false, misleading, or fraudulent battery data, compliance records, or marketplace listings.</li>
                <li>Use the Platform to transmit malware, viruses, or any other harmful code.</li>
                <li>Resell, sublicense, or white-label the Platform without a separate written agreement with Setoo B.V.</li>
              </ul>
            </div>
          </section>

          {/* 4. Data Ownership */}
          <section>
            <SectionHeader icon={Database} number="4" title="Data Ownership" />
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">Your data belongs to you.</strong> All Battery Data, telemetry readings, compliance records, and business information you submit to the Platform remain your exclusive property. Setoo B.V. does not claim any ownership over your data.</p>
              <p>By submitting data to the Platform, you grant Setoo B.V. a limited, worldwide, royalty-free licence to store, process, and display your data solely for the purpose of providing the Services to you. This licence terminates when you delete your data or close your account.</p>
              <p>Setoo B.V. may use anonymised, aggregated, and de-identified data derived from Platform usage to improve the Services, train AI models, and publish industry benchmarks. Such aggregated data will never identify you or your organisation individually.</p>
              <p>Upon account termination, you may request a full export of your data in machine-readable format (JSON/CSV) within 30 days. After 60 days following account closure, your data will be permanently deleted from our systems unless retention is required by applicable law.</p>
            </div>
          </section>

          {/* 5. Intellectual Property */}
          <section>
            <SectionHeader icon={Shield} number="5" title="Intellectual Property" />
            <div className="space-y-3 text-muted-foreground">
              <p>The Platform, including its software, algorithms, AI models, user interface, design, trademarks, and documentation, is the exclusive intellectual property of Setoo B.V. and is protected by copyright, patent, and other intellectual property laws.</p>
              <p>The BPAN (Battery Passport Alphanumeric Number) generation algorithm, AI SOH prediction models, and EPR compliance adapters are proprietary to Setoo B.V. You may not copy, reproduce, or create derivative works based on these components without prior written consent.</p>
              <p>Nothing in these Terms transfers any intellectual property rights to you. Your licence to use the Platform is strictly limited to accessing the Services as described in Section 3.</p>
            </div>
          </section>

          {/* 6. AI and Predictions */}
          <section>
            <SectionHeader icon={AlertTriangle} number="6" title="AI Predictions and Accuracy Disclaimer" />
            <div className="space-y-3 text-muted-foreground">
              <p>The Platform provides AI-generated State of Health (SOH) predictions, Remaining Useful Life (RUL) estimates, and triage recommendations. These are provided for informational and operational guidance purposes only.</p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-400/90 font-medium mb-2">Important Notice</p>
                <p>AI predictions are probabilistic estimates based on available data and should not be the sole basis for safety-critical decisions, regulatory submissions, or financial transactions. Setoo B.V. does not warrant that AI predictions will be accurate, complete, or free from errors. You are solely responsible for validating AI outputs against physical testing and applicable standards before acting on them.</p>
              </div>
              <p>The Platform targets a prediction RMSE of less than 2%, but actual accuracy will vary depending on data quality, battery chemistry, and operating conditions. No guarantee of specific accuracy levels is made.</p>
            </div>
          </section>

          {/* 7. Marketplace */}
          <section>
            <SectionHeader icon={Scale} number="7" title="Marketplace Transactions" />
            <div className="space-y-3 text-muted-foreground">
              <p>The Circul-AI-r Marketplace facilitates transactions between battery sellers and buyers for second-life battery assets. Setoo B.V. acts as a platform intermediary only and is not a party to any transaction between users.</p>
              <p>You are solely responsible for the accuracy of your marketplace listings, including battery specifications, health data, pricing, and availability. Fraudulent or misleading listings may result in immediate account suspension and legal action.</p>
              <p>Setoo B.V. charges a platform fee on completed transactions as specified in your Subscription plan. All fees are non-refundable unless otherwise agreed in writing. Disputes between buyers and sellers must be resolved directly between the parties; Setoo B.V. may provide mediation support but bears no financial liability for transaction disputes.</p>
            </div>
          </section>

          {/* 8. Compliance Reporting */}
          <section>
            <SectionHeader icon={FileText} number="8" title="Compliance Reporting Disclaimer" />
            <div className="space-y-3 text-muted-foreground">
              <p>The Platform generates compliance reports, EPR token records, and regulatory submissions (including CPCB Form BW-3 and EU Battery Passport data). These are provided as tools to assist your compliance workflows and do not constitute legal or regulatory advice.</p>
              <p>You are solely responsible for verifying that reports generated by the Platform meet the requirements of applicable regulations in your jurisdiction and for submitting accurate information to regulatory authorities. Setoo B.V. is not liable for regulatory penalties, fines, or enforcement actions arising from your use of Platform-generated reports.</p>
            </div>
          </section>

          {/* 9. Liability */}
          <section>
            <SectionHeader icon={Ban} number="9" title="Limitation of Liability" />
            <div className="space-y-3 text-muted-foreground">
              <p>To the fullest extent permitted by applicable law, Setoo B.V. shall not be liable for:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform.</li>
                <li>Loss of profits, revenue, data, business opportunities, or goodwill.</li>
                <li>Damages resulting from reliance on AI predictions, compliance reports, or marketplace data.</li>
                <li>Service interruptions, data loss, or security breaches caused by events outside our reasonable control (force majeure).</li>
                <li>Actions or omissions of third-party service providers, including MQTT brokers, cloud storage providers, or payment processors.</li>
              </ul>
              <p>In no event shall Setoo B.V.'s total aggregate liability to you exceed the greater of (a) the total fees paid by you to Setoo B.V. in the 12 months preceding the claim, or (b) EUR 500.</p>
              <p>Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability. In such cases, our liability is limited to the minimum extent permitted by applicable law.</p>
            </div>
          </section>

          {/* 10. Service Availability */}
          <section>
            <SectionHeader icon={RefreshCw} number="10" title="Service Availability and Modifications" />
            <div className="space-y-3 text-muted-foreground">
              <p>Setoo B.V. aims to maintain 99.5% platform uptime but does not guarantee uninterrupted access to the Services. Planned maintenance will be communicated with at least 24 hours' notice where practicable.</p>
              <p>We reserve the right to modify, suspend, or discontinue any feature of the Platform at any time. For material changes that significantly affect your use of the Services, we will provide at least 30 days' notice via email or in-platform notification.</p>
              <p>We reserve the right to update these Terms at any time. Continued use of the Platform after the effective date of updated Terms constitutes acceptance of the revised Terms. We will notify you of material changes via email.</p>
            </div>
          </section>

          {/* 11. Termination */}
          <section>
            <SectionHeader icon={Ban} number="11" title="Termination" />
            <div className="space-y-3 text-muted-foreground">
              <p>Either party may terminate the agreement at any time by providing 30 days' written notice. You may close your account at any time through the platform settings. Setoo B.V. may suspend or terminate your account immediately if:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>You breach these Terms and fail to remedy the breach within 7 days of notice.</li>
                <li>You engage in fraudulent, abusive, or illegal activity on the Platform.</li>
                <li>Your account poses a security risk to other users or the Platform infrastructure.</li>
                <li>Required by applicable law or regulatory authority.</li>
              </ul>
              <p>Upon termination, your licence to use the Platform ceases immediately. Sections 4 (Data Ownership — export rights), 5 (Intellectual Property), 9 (Limitation of Liability), and 12 (Governing Law) survive termination.</p>
            </div>
          </section>

          {/* 12. Governing Law */}
          <section>
            <SectionHeader icon={Scale} number="12" title="Governing Law and Dispute Resolution" />
            <div className="space-y-3 text-muted-foreground">
              <p>These Terms are governed by and construed in accordance with the laws of the Netherlands, without regard to conflict of law principles. The United Nations Convention on Contracts for the International Sale of Goods (CISG) does not apply.</p>
              <p>Any dispute arising from or in connection with these Terms shall first be subject to good-faith negotiation between the parties for a period of 30 days. If unresolved, disputes shall be submitted to the exclusive jurisdiction of the competent courts of Amsterdam, the Netherlands.</p>
              <p>For users located in the European Union, nothing in these Terms limits your rights under applicable EU consumer protection laws.</p>
            </div>
          </section>

          {/* 13. Contact */}
          <section>
            <SectionHeader icon={Mail} number="13" title="Contact" />
            <div className="space-y-3 text-muted-foreground">
              <p>For questions about these Terms, please contact:</p>
              <div className="bg-card border border-border rounded-lg p-4 font-mono text-xs space-y-1">
                <p><span className="text-muted-foreground">Company:</span> <span className="text-foreground">Setoo B.V.</span></p>
                <p><span className="text-muted-foreground">Email:</span> <a href="mailto:business@setoo.co" className="text-primary hover:underline">business@setoo.co</a></p>
                <p><span className="text-muted-foreground">Website:</span> <a href="https://www.setoo.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.setoo.co</a></p>
                <p><span className="text-muted-foreground">Platform:</span> <a href="https://www.circulair.energy" className="text-primary hover:underline">www.circulair.energy</a></p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>&copy; {new Date().getFullYear()} Setoo B.V. — Circul-AI-r Platform</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
