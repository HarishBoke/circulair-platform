import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import CirculairLogo from "@/components/CirculairLogo";
import { ArrowLeft, Shield, Mail, Globe, Lock, Database, UserCheck, Trash2, Clock } from "lucide-react";

export default function Privacy() {
  usePageTitle("Privacy Policy");

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
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm font-mono">
            Last updated: {lastUpdated} &nbsp;·&nbsp; Effective date: {lastUpdated}
          </p>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            This Privacy Policy explains how <strong className="text-foreground">Setoo B.V.</strong> ("we", "us", "our"), operating the <strong className="text-foreground">Circul-AI-r</strong> platform at <strong className="text-foreground">www.circulair.energy</strong>, collects, uses, stores, and protects your personal data in accordance with the EU General Data Protection Regulation (GDPR), the UK GDPR, and India's Digital Personal Data Protection Act 2023 (DPDPA).
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1. Who we are */}
          <section>
            <SectionHeader icon={Globe} number="1" title="Who We Are (Data Controller)" />
            <div className="prose-section">
              <p>The data controller responsible for your personal data is:</p>
              <div className="mt-3 bg-card border border-border rounded-lg p-4 font-mono text-xs space-y-1">
                <p><span className="text-muted-foreground">Company:</span> Setoo B.V.</p>
                <p><span className="text-muted-foreground">Address:</span> Netherlands (EU)</p>
                <p><span className="text-muted-foreground">Email:</span>{" "}
                  <a href="mailto:business@setoo.co" className="text-primary hover:underline">business@setoo.co</a>
                </p>
                <p><span className="text-muted-foreground">Website:</span>{" "}
                  <a href="https://www.circulair.energy" className="text-primary hover:underline">www.circulair.energy</a>
                </p>
              </div>
              <p className="mt-3">For GDPR purposes, Setoo B.V. acts as the data controller. For users in India, Setoo B.V. acts as the data fiduciary under the DPDPA 2023.</p>
            </div>
          </section>

          {/* 2. What data we collect */}
          <section>
            <SectionHeader icon={Database} number="2" title="What Personal Data We Collect" />
            <div className="prose-section space-y-4">
              <p>We collect the following categories of personal data:</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Category</th>
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Data Elements</th>
                    <th className="text-left py-2 font-mono text-muted-foreground font-normal">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["Account data", "Name, email address, password (hashed)", "Authentication and account management"],
                    ["Profile data", "Organisation name, platform role", "Role-based access control"],
                    ["Usage data", "Pages visited, features used, timestamps", "Platform improvement and analytics"],
                    ["Technical data", "IP address (hashed), browser type, device type", "Security, fraud prevention"],
                    ["Cookie consent", "Consent level, timestamp, user agent", "GDPR accountability (Article 7)"],
                    ["Battery data", "BPAN codes, telemetry readings, SOH predictions", "Core platform functionality"],
                    ["Communications", "Support emails, feedback submissions", "Customer support"],
                  ].map(([cat, data, purpose]) => (
                    <tr key={cat}>
                      <td className="py-2.5 pr-4 font-medium text-foreground align-top">{cat}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{data}</td>
                      <td className="py-2.5 text-muted-foreground align-top">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Legal basis */}
          <section>
            <SectionHeader icon={UserCheck} number="3" title="Legal Basis for Processing (GDPR Article 6)" />
            <div className="prose-section space-y-3">
              <p>We process your personal data on the following legal bases:</p>
              <ul className="space-y-2 list-none">
                {[
                  ["Contract performance (Art. 6(1)(b))", "Processing necessary to provide the Circul-AI-r platform services you have signed up for, including battery registration, telemetry, and marketplace features."],
                  ["Legitimate interests (Art. 6(1)(f))", "Security monitoring, fraud prevention, platform stability, and aggregated analytics to improve our services."],
                  ["Consent (Art. 6(1)(a))", "Analytics cookies and marketing communications. You may withdraw consent at any time via the cookie settings in the footer."],
                  ["Legal obligation (Art. 6(1)(c))", "Compliance with EPR regulations, CPCB reporting requirements, and applicable tax and financial laws."],
                ].map(([basis, desc]) => (
                  <li key={basis as string} className="bg-card border border-border/50 rounded-lg p-3.5">
                    <p className="font-medium text-foreground text-xs mb-1">{basis}</p>
                    <p className="text-muted-foreground text-xs">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 4. Cookies */}
          <section>
            <SectionHeader icon={Lock} number="4" title="Cookies and Tracking Technologies" />
            <div className="prose-section space-y-3">
              <p>We use the following categories of cookies:</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Category</th>
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Examples</th>
                    <th className="text-left py-2 font-mono text-muted-foreground font-normal">Consent required?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["Essential", "Session cookie, CSRF token, auth JWT", "No — strictly necessary"],
                    ["Analytics", "Umami (self-hosted, privacy-first, no cross-site tracking)", "Yes — opt-in"],
                    ["Marketing", "None currently deployed", "Yes — opt-in"],
                  ].map(([cat, ex, req]) => (
                    <tr key={cat}>
                      <td className="py-2.5 pr-4 font-medium text-foreground align-top">{cat}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{ex}</td>
                      <td className="py-2.5 text-muted-foreground align-top">{req}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>You can manage your cookie preferences at any time using the <button
                onClick={() => window.dispatchEvent(new Event("openCookieConsent"))}
                className="text-primary hover:underline cursor-pointer font-medium"
              >Cookie Settings</button> link.</p>
            </div>
          </section>

          {/* 5. Data retention */}
          <section>
            <SectionHeader icon={Clock} number="5" title="Data Retention" />
            <div className="prose-section space-y-3">
              <p>We retain personal data only for as long as necessary for the purposes described in this policy:</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Data type</th>
                    <th className="text-left py-2 font-mono text-muted-foreground font-normal">Retention period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["Account data", "Duration of account + 90 days after deletion request"],
                    ["Battery telemetry", "7 years (EPR regulatory requirement)"],
                    ["Consent logs", "5 years (GDPR accountability)"],
                    ["Audit logs", "5 years"],
                    ["Support communications", "3 years"],
                    ["Analytics data", "13 months rolling window"],
                  ].map(([type, period]) => (
                    <tr key={type}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{type}</td>
                      <td className="py-2.5 text-muted-foreground">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. Your rights */}
          <section>
            <SectionHeader icon={UserCheck} number="6" title="Your Rights Under GDPR" />
            <div className="prose-section space-y-3">
              <p>As a data subject under the GDPR, you have the following rights. To exercise any of them, contact us at <a href="mailto:business@setoo.co" className="text-primary hover:underline">business@setoo.co</a>. We will respond within 30 days.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["Right of access (Art. 15)", "Request a copy of all personal data we hold about you."],
                  ["Right to rectification (Art. 16)", "Correct inaccurate or incomplete personal data."],
                  ["Right to erasure (Art. 17)", "Request deletion of your personal data ('right to be forgotten')."],
                  ["Right to restriction (Art. 18)", "Restrict processing of your data in certain circumstances."],
                  ["Right to portability (Art. 20)", "Receive your data in a machine-readable format."],
                  ["Right to object (Art. 21)", "Object to processing based on legitimate interests."],
                  ["Right to withdraw consent", "Withdraw analytics/marketing consent at any time without affecting prior processing."],
                  ["Right to lodge a complaint", "File a complaint with your national supervisory authority (e.g., Dutch AP, UK ICO)."],
                ].map(([right, desc]) => (
                  <div key={right as string} className="bg-card border border-border/50 rounded-lg p-3">
                    <p className="font-medium text-foreground text-xs mb-0.5">{right}</p>
                    <p className="text-muted-foreground text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 7. Data transfers */}
          <section>
            <SectionHeader icon={Globe} number="7" title="International Data Transfers" />
            <div className="prose-section">
              <p>The Circul-AI-r platform operates infrastructure in the EU (Netherlands) and Singapore. When data is transferred outside the European Economic Area, we ensure adequate safeguards are in place through Standard Contractual Clauses (SCCs) approved by the European Commission, or adequacy decisions where applicable.</p>
              <p className="mt-3">For users in India, data processing is conducted in accordance with the Digital Personal Data Protection Act 2023 (DPDPA). Battery lifecycle data required for EPR compliance under India's Battery Waste Management Rules 2022 is retained for the legally mandated period.</p>
            </div>
          </section>

          {/* 8. Security */}
          <section>
            <SectionHeader icon={Lock} number="8" title="Security Measures" />
            <div className="prose-section">
              <p>We implement appropriate technical and organisational security measures including: bcrypt password hashing (cost factor 12), JWT session tokens with 30-day expiry, TLS 1.3 in transit, AES-256 encryption at rest for sensitive fields, role-based access control, and regular security audits. We target ISO 27001 alignment for our information security management practices.</p>
            </div>
          </section>

          {/* 9. Third parties */}
          <section>
            <SectionHeader icon={Database} number="9" title="Third-Party Processors" />
            <div className="prose-section space-y-2">
              <p>We use the following sub-processors who may process personal data on our behalf:</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Processor</th>
                    <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-normal">Purpose</th>
                    <th className="text-left py-2 font-mono text-muted-foreground font-normal">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["TiDB Cloud (PingCAP)", "Database hosting", "Singapore / EU"],
                    ["AWS S3", "File storage (documents, PDFs)", "EU (Frankfurt)"],
                    ["EMQX Cloud", "MQTT broker for IoT telemetry", "Singapore"],
                    ["Umami (self-hosted)", "Privacy-first analytics", "EU"],
                  ].map(([proc, purpose, loc]) => (
                    <tr key={proc}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{proc}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{purpose}</td>
                      <td className="py-2.5 text-muted-foreground">{loc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 10. Changes */}
          <section>
            <SectionHeader icon={Trash2} number="10" title="Changes to This Policy" />
            <div className="prose-section">
              <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes by email and will update the "Last updated" date at the top of this page. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-display font-bold text-sm mb-1">Contact Our Privacy Team</h3>
                <p className="text-muted-foreground text-xs mb-3">For any privacy-related questions, data subject requests, or to exercise your rights under GDPR, contact us at:</p>
                <a href="mailto:business@setoo.co" className="inline-flex items-center gap-1.5 text-primary text-xs font-mono hover:underline">
                  <Mail className="w-3 h-3" /> business@setoo.co
                </a>
                <p className="text-muted-foreground text-xs mt-2">We aim to respond to all data subject requests within 30 days as required by GDPR Article 12.</p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <p className="font-mono text-[10px] text-muted-foreground">© {new Date().getFullYear()} Setoo B.V. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <button
              onClick={() => window.dispatchEvent(new Event("openCookieConsent"))}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cookie Settings
            </button>
            <a href="mailto:business@setoo.co" className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon: Icon, number, title }: { icon: React.ElementType; number: string; title: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div>
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest block mb-0.5">Article {number}</span>
        <h2 className="font-display text-base font-bold">{title}</h2>
      </div>
    </div>
  );
}
