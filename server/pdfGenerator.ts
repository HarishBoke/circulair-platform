/**
 * PDF Generator — Circul-AI-r Platform
 * Uses puppeteer-core + system Chromium for pixel-perfect HTML-to-PDF rendering.
 * Generates Battery Health Passports and CPCB Form BW-3 Compliance Reports.
 */

import puppeteer from "puppeteer-core";

import { existsSync } from "fs";
const CHROMIUM_PATH = process.env.CHROMIUM_PATH ||
  ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
    .find((p) => existsSync(p)) ||
  "/usr/bin/chromium";
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
];

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    args: LAUNCH_ARGS,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; line-height: 1.5; }
  .page { padding: 0; }
  .header { background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .header-logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 40px; height: 40px; background: #00e5a0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .logo-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
  .logo-sub { font-size: 9px; letter-spacing: 2px; color: #00e5a0; text-transform: uppercase; }
  .header-meta { text-align: right; font-size: 10px; color: #a0aec0; }
  .header-meta strong { display: block; font-size: 13px; color: white; margin-bottom: 2px; }
  .doc-id { font-family: monospace; font-size: 11px; color: #00e5a0; }
  .section { padding: 20px 32px; border-bottom: 1px solid #e8ecf0; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #00e5a0; display: inline-block; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .field-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 3px; }
  .field-value { font-size: 12px; font-weight: 600; color: #1a1a2e; }
  .field-value.mono { font-family: monospace; font-size: 11px; }
  .field-value.accent { color: #00b37d; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-purple { background: #ede9fe; color: #5b21b6; }
  .soh-bar { background: #e5e7eb; border-radius: 4px; height: 12px; overflow: hidden; margin-top: 6px; }
  .soh-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .table th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e2e8f0; }
  .table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  .table tr:last-child td { border-bottom: none; }
  .table tr:nth-child(even) td { background: #f8fafc; }
  .footer { background: #f8fafc; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; font-size: 9px; color: #9ca3af; }
  .footer-seal { text-align: center; }
  .seal-box { border: 2px solid #00e5a0; border-radius: 8px; padding: 8px 16px; display: inline-block; }
  .seal-text { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #00b37d; }
  .watermark-valid { color: #00b37d; font-weight: 700; font-size: 10px; }
  .highlight-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #6ee7b7; border-radius: 8px; padding: 14px 16px; }
  .warning-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #e5e7eb; }
  .info-row:last-child { border-bottom: none; }
  .info-key { color: #6b7280; font-size: 10px; }
  .info-val { font-weight: 600; color: #1a1a2e; font-size: 10px; }
`;

// ─── HEALTH PASSPORT ──────────────────────────────────────────────────────────

export interface HealthPassportData {
  battery: {
    bpan: string;
    chemistry: string;
    capacityKwh: string | number;
    voltageV: string | number;
    status: string;
    currentSoh: string | number | null;
    cycleCount: number | null;
    mfgYear: number;
    mfgMonth: number;
    mfgDay: number;
    countryCode: string;
    manufacturerId: string;
    cellOriginCountry: string;
    vehicleId: string | null;
    recyclabilityPct: string | number | null;
    lithiumPct: string | number | null;
    cobaltPct: string | number | null;
    nickelPct: string | number | null;
    manganesePct: string | number | null;
    carbonFootprintKgCo2: string | number | null;
    disassemblyMethod: string | null;
    lastServiceDate: Date | null;
  };
  latestTelemetry?: {
    voltageV: string | number | null;
    currentA: string | number | null;
    temperatureC: string | number | null;
    internalResistanceOhm: string | number | null;
    recordedAt: Date;
  } | null;
  latestPrediction?: {
    sohEstimate: string | number;
    rulDays: number | null;
    triageDecision: string | null;
    confidence: string | number | null;
    predictedAt: Date;
  } | null;
  serviceHistory?: Array<{
    servicedAt: Date;
    serviceType: string;
    technicianName: string | null;
    sohBefore: string | number | null;
    sohAfter: string | number | null;
    notes: string | null;
  }>;
  generatedAt: Date;
  generatedBy: string;
}

function getSohColor(soh: number): string {
  if (soh >= 80) return "#00b37d";
  if (soh >= 60) return "#f59e0b";
  if (soh >= 40) return "#ef4444";
  return "#7f1d1d";
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    operational: "badge-green",
    second_life: "badge-blue",
    end_of_life: "badge-red",
    in_transit: "badge-yellow",
    recycling: "badge-purple",
  };
  return map[status] ?? "badge-blue";
}

function getTriageBadge(triage: string): string {
  const map: Record<string, string> = {
    direct_reuse: "badge-green",
    module_repurposing: "badge-blue",
    material_recycling: "badge-yellow",
  };
  return map[triage] ?? "badge-blue";
}

export async function generateHealthPassportPdf(data: HealthPassportData): Promise<Buffer> {
  const { battery, latestTelemetry, latestPrediction, serviceHistory = [], generatedAt, generatedBy } = data;

  const soh = latestPrediction?.sohEstimate ?? battery.currentSoh;
  const sohNum = soh ? parseFloat(String(soh)) : 0;
  const sohColor = getSohColor(sohNum);
  const mfgDate = `${battery.mfgYear}-${String(battery.mfgMonth).padStart(2, "0")}-${String(battery.mfgDay).padStart(2, "0")}`;
  const passportId = `HP-${battery.bpan}-${Date.now().toString(36).toUpperCase()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Battery Health Passport — ${battery.bpan}</title>
<style>${baseStyles}
  .soh-section { background: linear-gradient(135deg, #0a0a1a, #1a1a3e); color: white; padding: 20px 32px; }
  .soh-main { display: flex; align-items: center; gap: 32px; }
  .soh-circle { width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(${sohColor} ${sohNum * 3.6}deg, #2d3748 0deg); display: flex; align-items: center; justify-content: center; position: relative; }
  .soh-inner { width: 80px; height: 80px; border-radius: 50%; background: #1a1a3e; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .soh-value { font-size: 22px; font-weight: 800; color: ${sohColor}; line-height: 1; }
  .soh-label { font-size: 8px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; }
  .soh-details { flex: 1; }
  .soh-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .soh-sub { font-size: 10px; color: #a0aec0; margin-bottom: 12px; }
  .rul-badge { background: rgba(0,229,160,0.15); border: 1px solid #00e5a0; border-radius: 6px; padding: 8px 16px; display: inline-block; }
  .rul-num { font-size: 20px; font-weight: 800; color: #00e5a0; }
  .rul-text { font-size: 9px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="logo-text">Circul-AI-r</div>
        <div class="logo-sub">Battery Intelligence Platform</div>
      </div>
    </div>
    <div class="header-meta">
      <strong>Battery Health Passport</strong>
      <div class="doc-id">${passportId}</div>
      <div>Generated: ${generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
      <div>By: ${generatedBy}</div>
    </div>
  </div>

  <!-- SOH HERO -->
  <div class="soh-section">
    <div class="soh-main">
      <div class="soh-circle">
        <div class="soh-inner">
          <div class="soh-value">${sohNum.toFixed(1)}%</div>
          <div class="soh-label">SOH</div>
        </div>
      </div>
      <div class="soh-details">
        <div class="soh-title">State of Health Assessment</div>
        <div class="soh-sub">BPAN: <span style="font-family:monospace;color:#00e5a0">${battery.bpan}</span> &nbsp;|&nbsp; ${battery.chemistry} &nbsp;|&nbsp; ${battery.capacityKwh} kWh</div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          ${latestPrediction?.rulDays != null ? `
          <div class="rul-badge">
            <div class="rul-num">${latestPrediction.rulDays}</div>
            <div class="rul-text">Days RUL Remaining</div>
          </div>` : ""}
          ${latestPrediction?.triageDecision ? `
          <div>
            <div style="font-size:9px;color:#a0aec0;margin-bottom:4px">AI TRIAGE DECISION</div>
            <span class="badge ${getTriageBadge(latestPrediction.triageDecision)}">${formatStatus(latestPrediction.triageDecision)}</span>
          </div>` : ""}
          <div>
            <div style="font-size:9px;color:#a0aec0;margin-bottom:4px">LIFECYCLE STATUS</div>
            <span class="badge ${getStatusBadge(battery.status)}">${formatStatus(battery.status)}</span>
          </div>
          ${latestPrediction?.confidence != null ? `
          <div>
            <div style="font-size:9px;color:#a0aec0;margin-bottom:4px">AI CONFIDENCE</div>
            <div style="font-size:14px;font-weight:700;color:#00e5a0">${parseFloat(String(latestPrediction.confidence)).toFixed(1)}%</div>
          </div>` : ""}
        </div>
      </div>
    </div>
  </div>

  <!-- BPAN IDENTITY -->
  <div class="section">
    <div class="section-title">Battery Pack Aadhaar Number (BPAN) — Identity</div>
    <div class="grid-4">
      <div class="field">
        <div class="field-label">BPAN</div>
        <div class="field-value mono accent">${battery.bpan}</div>
      </div>
      <div class="field">
        <div class="field-label">Country of Manufacture</div>
        <div class="field-value">${battery.countryCode}</div>
      </div>
      <div class="field">
        <div class="field-label">Manufacturer ID</div>
        <div class="field-value mono">${battery.manufacturerId}</div>
      </div>
      <div class="field">
        <div class="field-label">Manufacturing Date</div>
        <div class="field-value">${mfgDate}</div>
      </div>
      <div class="field">
        <div class="field-label">Chemistry</div>
        <div class="field-value">${battery.chemistry}</div>
      </div>
      <div class="field">
        <div class="field-label">Capacity</div>
        <div class="field-value">${battery.capacityKwh} kWh</div>
      </div>
      <div class="field">
        <div class="field-label">Nominal Voltage</div>
        <div class="field-value">${battery.voltageV} V</div>
      </div>
      <div class="field">
        <div class="field-label">Cell Origin</div>
        <div class="field-value">${battery.cellOriginCountry}</div>
      </div>
    </div>
    ${battery.vehicleId ? `<div style="margin-top:10px"><div class="field" style="display:inline-block"><div class="field-label">Vehicle ID</div><div class="field-value mono">${battery.vehicleId}</div></div></div>` : ""}
  </div>

  <!-- LIVE TELEMETRY -->
  ${latestTelemetry ? `
  <div class="section">
    <div class="section-title">Latest Telemetry Snapshot</div>
    <div class="grid-4">
      <div class="field">
        <div class="field-label">Pack Voltage</div>
        <div class="field-value">${latestTelemetry.voltageV != null ? parseFloat(String(latestTelemetry.voltageV)).toFixed(2) : "—"} V</div>
      </div>
      <div class="field">
        <div class="field-label">Current</div>
        <div class="field-value">${latestTelemetry.currentA != null ? parseFloat(String(latestTelemetry.currentA)).toFixed(2) : "—"} A</div>
      </div>
      <div class="field">
        <div class="field-label">Temperature</div>
        <div class="field-value">${latestTelemetry.temperatureC != null ? parseFloat(String(latestTelemetry.temperatureC)).toFixed(1) : "—"} °C</div>
      </div>
      <div class="field">
        <div class="field-label">Internal Resistance</div>
        <div class="field-value">${latestTelemetry.internalResistanceOhm != null ? parseFloat(String(latestTelemetry.internalResistanceOhm)).toFixed(4) : "—"} Ω</div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:9px;color:#9ca3af">Recorded: ${new Date(latestTelemetry.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
  </div>` : ""}

  <!-- CYCLE & USAGE -->
  <div class="section">
    <div class="section-title">Usage Statistics</div>
    <div class="grid-3">
      <div class="field">
        <div class="field-label">Total Cycle Count</div>
        <div class="field-value">${battery.cycleCount ?? 0}</div>
      </div>
      <div class="field">
        <div class="field-label">Last Service Date</div>
        <div class="field-value">${battery.lastServiceDate ? new Date(battery.lastServiceDate).toLocaleDateString("en-IN") : "Not serviced"}</div>
      </div>
      <div class="field">
        <div class="field-label">Disassembly Method</div>
        <div class="field-value">${battery.disassemblyMethod ?? "Standard"}</div>
      </div>
    </div>
  </div>

  <!-- MATERIAL COMPOSITION -->
  <div class="section">
    <div class="section-title">Material Composition (BMCS)</div>
    <div class="grid-4">
      ${battery.lithiumPct != null ? `<div class="field"><div class="field-label">Lithium (Li)</div><div class="field-value">${parseFloat(String(battery.lithiumPct)).toFixed(2)}%</div></div>` : ""}
      ${battery.cobaltPct != null ? `<div class="field"><div class="field-label">Cobalt (Co)</div><div class="field-value">${parseFloat(String(battery.cobaltPct)).toFixed(2)}%</div></div>` : ""}
      ${battery.nickelPct != null ? `<div class="field"><div class="field-label">Nickel (Ni)</div><div class="field-value">${parseFloat(String(battery.nickelPct)).toFixed(2)}%</div></div>` : ""}
      ${battery.manganesePct != null ? `<div class="field"><div class="field-label">Manganese (Mn)</div><div class="field-value">${parseFloat(String(battery.manganesePct)).toFixed(2)}%</div></div>` : ""}
      ${battery.recyclabilityPct != null ? `<div class="field"><div class="field-label">Recyclability</div><div class="field-value accent">${parseFloat(String(battery.recyclabilityPct)).toFixed(1)}%</div></div>` : ""}
      ${battery.carbonFootprintKgCo2 != null ? `<div class="field"><div class="field-label">Carbon Footprint</div><div class="field-value">${parseFloat(String(battery.carbonFootprintKgCo2)).toFixed(1)} kg CO₂</div></div>` : ""}
    </div>
  </div>

  <!-- SERVICE HISTORY -->
  ${serviceHistory.length > 0 ? `
  <div class="section">
    <div class="section-title">Service History (Last ${Math.min(serviceHistory.length, 5)} Records)</div>
    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Service Type</th>
          <th>Technician</th>
          <th>SOH Before</th>
          <th>SOH After</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${serviceHistory.slice(0, 5).map((s) => `
        <tr>
          <td>${new Date(s.servicedAt).toLocaleDateString("en-IN")}</td>
          <td>${formatStatus(s.serviceType)}</td>
          <td>${s.technicianName ?? "—"}</td>
          <td>${s.sohBefore != null ? parseFloat(String(s.sohBefore)).toFixed(1) + "%" : "—"}</td>
          <td>${s.sohAfter != null ? parseFloat(String(s.sohAfter)).toFixed(1) + "%" : "—"}</td>
          <td>${s.notes ?? "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div style="font-weight:600;color:#374151;margin-bottom:2px">Circul-AI-r Platform</div>
      <div>India's Battery Circular Economy Intelligence Platform</div>
      <div>Compliant with MoEFCC Battery Waste Management Rules 2022</div>
    </div>
    <div class="footer-seal">
      <div class="seal-box">
        <div class="seal-text">✓ Digitally Certified</div>
        <div class="seal-text">Circul-AI-r Platform</div>
        <div style="font-size:7px;color:#9ca3af;margin-top:2px">${passportId}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="watermark-valid">✓ VALID DOCUMENT</div>
      <div>BPAN Verified by CPCB Registry</div>
      <div>Page 1 of 1</div>
    </div>
  </div>

</div>
</body>
</html>`;

  return htmlToPdf(html);
}

// ─── CPCB FORM BW-3 ───────────────────────────────────────────────────────────

export interface CpcbReportData {
  reportPeriod: { year: number; month: number };
  organization: { name: string; gstin?: string; cpcbId?: string };
  eprTokens: Array<{
    tokenId: string;
    bpan: string | null;
    weightKg: string | number;
    chemistry: string | null;
    status: string;
    issuedAt: Date;
  }>;
  yieldVerifications: Array<{
    bpan: string | null;
    blackMassKg: string | number;
    lithiumRecoveredKg: string | number | null;
    cobaltRecoveredKg: string | number | null;
    nickelRecoveredKg: string | number | null;
    verifiedAt: Date;
  }>;
  stats: {
    totalBatteries: number;
    operationalCount: number;
    secondLifeCount: number;
    endOfLifeCount: number;
    totalEprTokens: number;
    totalWeightKg: number;
    totalYieldKg: number;
  };
  generatedAt: Date;
  generatedBy: string;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export async function generateCpcbReportPdf(data: CpcbReportData): Promise<Buffer> {
  const { reportPeriod, organization, eprTokens, yieldVerifications, stats, generatedAt, generatedBy } = data;
  const reportId = `BW3-${reportPeriod.year}${String(reportPeriod.month).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}`;
  const monthName = MONTH_NAMES[reportPeriod.month - 1] ?? "Unknown";

  const totalLiRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.lithiumRecoveredKg ?? 0)), 0);
  const totalCoRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.cobaltRecoveredKg ?? 0)), 0);
  const totalNiRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.nickelRecoveredKg ?? 0)), 0);
  const totalBlackMass = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.blackMassKg ?? 0)), 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CPCB Form BW-3 — ${monthName} ${reportPeriod.year}</title>
<style>${baseStyles}
  .govt-header { background: #1a3a6b; color: white; padding: 20px 32px; text-align: center; }
  .emblem { font-size: 32px; margin-bottom: 8px; }
  .govt-title { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
  .govt-sub { font-size: 10px; color: #93c5fd; margin-top: 2px; }
  .form-title { background: #1e40af; color: white; padding: 12px 32px; text-align: center; }
  .form-title h2 { font-size: 13px; font-weight: 700; letter-spacing: 1px; }
  .form-title p { font-size: 10px; color: #bfdbfe; margin-top: 2px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi-card { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #0369a1; }
  .kpi-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .compliance-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #6ee7b7; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; }
  .compliance-icon { font-size: 32px; }
  .compliance-text h3 { font-size: 13px; font-weight: 700; color: #065f46; }
  .compliance-text p { font-size: 10px; color: #047857; margin-top: 2px; }
</style>
</head>
<body>
<div class="page">

  <!-- GOVERNMENT HEADER -->
  <div class="govt-header">
    <div class="emblem">🏛️</div>
    <div class="govt-title">Government of India — Ministry of Environment, Forest and Climate Change</div>
    <div class="govt-sub">Central Pollution Control Board (CPCB)</div>
    <div class="govt-sub" style="margin-top:4px">Battery Waste Management Rules, 2022</div>
  </div>

  <!-- FORM TITLE -->
  <div class="form-title">
    <h2>FORM BW-3 — EXTENDED PRODUCER RESPONSIBILITY (EPR) COMPLIANCE REPORT</h2>
    <p>Reporting Period: ${monthName} ${reportPeriod.year} &nbsp;|&nbsp; Document ID: ${reportId}</p>
  </div>

  <!-- PLATFORM HEADER -->
  <div class="header" style="padding:16px 32px">
    <div class="header-logo">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="logo-text">Circul-AI-r</div>
        <div class="logo-sub">Battery Intelligence Platform</div>
      </div>
    </div>
    <div class="header-meta">
      <strong>${organization.name}</strong>
      ${organization.gstin ? `<div>GSTIN: ${organization.gstin}</div>` : ""}
      ${organization.cpcbId ? `<div>CPCB ID: ${organization.cpcbId}</div>` : ""}
      <div>Generated: ${generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
    </div>
  </div>

  <!-- COMPLIANCE STATUS -->
  <div class="section">
    <div class="compliance-box">
      <div class="compliance-icon">✅</div>
      <div class="compliance-text">
        <h3>EPR Compliance Status: COMPLIANT</h3>
        <p>All Extended Producer Responsibility obligations for ${monthName} ${reportPeriod.year} have been met. ${eprTokens.length} EPR tokens issued covering ${stats.totalWeightKg.toFixed(1)} kg of battery waste processed.</p>
      </div>
    </div>
  </div>

  <!-- KPI SUMMARY -->
  <div class="section">
    <div class="section-title">Section A — Summary Statistics</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalBatteries}</div>
        <div class="kpi-label">Total Batteries Registered</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalEprTokens}</div>
        <div class="kpi-label">EPR Tokens Issued</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalWeightKg.toFixed(0)} kg</div>
        <div class="kpi-label">Total Weight Processed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalYieldKg.toFixed(0)} kg</div>
        <div class="kpi-label">Total Yield Verified</div>
      </div>
    </div>
    <div style="margin-top:12px" class="grid-4">
      <div class="field">
        <div class="field-label">Operational Batteries</div>
        <div class="field-value">${stats.operationalCount}</div>
      </div>
      <div class="field">
        <div class="field-label">Second Life Batteries</div>
        <div class="field-value">${stats.secondLifeCount}</div>
      </div>
      <div class="field">
        <div class="field-label">End of Life Batteries</div>
        <div class="field-value">${stats.endOfLifeCount}</div>
      </div>
      <div class="field">
        <div class="field-label">Second Life Rate</div>
        <div class="field-value accent">${stats.totalBatteries > 0 ? ((stats.secondLifeCount / stats.totalBatteries) * 100).toFixed(1) : 0}%</div>
      </div>
    </div>
  </div>

  <!-- MINERAL RECOVERY -->
  <div class="section">
    <div class="section-title">Section B — Critical Mineral Recovery</div>
    <div class="grid-4">
      <div class="field">
        <div class="field-label">Black Mass Processed</div>
        <div class="field-value">${totalBlackMass.toFixed(2)} kg</div>
      </div>
      <div class="field">
        <div class="field-label">Lithium Recovered</div>
        <div class="field-value accent">${totalLiRecovered.toFixed(2)} kg</div>
      </div>
      <div class="field">
        <div class="field-label">Cobalt Recovered</div>
        <div class="field-value accent">${totalCoRecovered.toFixed(2)} kg</div>
      </div>
      <div class="field">
        <div class="field-label">Nickel Recovered</div>
        <div class="field-value accent">${totalNiRecovered.toFixed(2)} kg</div>
      </div>
    </div>
  </div>

  <!-- EPR TOKEN LEDGER -->
  ${eprTokens.length > 0 ? `
  <div class="section">
    <div class="section-title">Section C — EPR Token Ledger (${Math.min(eprTokens.length, 15)} of ${eprTokens.length})</div>
    <table class="table">
      <thead>
        <tr>
          <th>Token ID</th>
          <th>BPAN</th>
          <th>Chemistry</th>
          <th>Weight (kg)</th>
          <th>Status</th>
          <th>Issued Date</th>
        </tr>
      </thead>
      <tbody>
        ${eprTokens.slice(0, 15).map((t) => `
        <tr>
          <td style="font-family:monospace;font-size:9px">${t.tokenId}</td>
          <td style="font-family:monospace;font-size:9px">${t.bpan ?? "—"}</td>
          <td>${t.chemistry ?? "—"}</td>
          <td>${parseFloat(String(t.weightKg)).toFixed(2)}</td>
          <td><span class="badge ${t.status === "issued" ? "badge-green" : t.status === "redeemed" ? "badge-blue" : "badge-yellow"}">${t.status}</span></td>
          <td>${new Date(t.issuedAt).toLocaleDateString("en-IN")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ${eprTokens.length > 15 ? `<div style="margin-top:6px;font-size:9px;color:#9ca3af">... and ${eprTokens.length - 15} more tokens. Full ledger available in the Circul-AI-r platform.</div>` : ""}
  </div>` : ""}

  <!-- YIELD VERIFICATION -->
  ${yieldVerifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Section D — Yield Verification Records</div>
    <table class="table">
      <thead>
        <tr>
          <th>BPAN</th>
          <th>Black Mass (kg)</th>
          <th>Li Recovered (kg)</th>
          <th>Co Recovered (kg)</th>
          <th>Ni Recovered (kg)</th>
          <th>Verified Date</th>
        </tr>
      </thead>
      <tbody>
        ${yieldVerifications.slice(0, 10).map((v) => `
        <tr>
          <td style="font-family:monospace;font-size:9px">${v.bpan ?? "—"}</td>
          <td>${parseFloat(String(v.blackMassKg)).toFixed(2)}</td>
          <td>${v.lithiumRecoveredKg != null ? parseFloat(String(v.lithiumRecoveredKg)).toFixed(2) : "—"}</td>
          <td>${v.cobaltRecoveredKg != null ? parseFloat(String(v.cobaltRecoveredKg)).toFixed(2) : "—"}</td>
          <td>${v.nickelRecoveredKg != null ? parseFloat(String(v.nickelRecoveredKg)).toFixed(2) : "—"}</td>
          <td>${new Date(v.verifiedAt).toLocaleDateString("en-IN")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- DECLARATION -->
  <div class="section">
    <div class="section-title">Section E — Declaration</div>
    <div class="warning-box">
      <p style="font-size:10px;color:#92400e;line-height:1.6">
        I hereby declare that the information furnished in this Form BW-3 is true, correct and complete to the best of my knowledge and belief. 
        All battery waste has been processed in accordance with the Battery Waste Management Rules, 2022 and applicable CPCB guidelines. 
        EPR obligations for the reporting period have been fulfilled through the Circul-AI-r Platform's blockchain-verified token system.
      </p>
      <div style="margin-top:12px;display:flex;justify-content:space-between">
        <div>
          <div style="font-size:9px;color:#9ca3af">Authorized Signatory</div>
          <div style="font-size:10px;font-weight:600;margin-top:2px">${generatedBy}</div>
          <div style="font-size:9px;color:#9ca3af">${organization.name}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#9ca3af">Date of Submission</div>
          <div style="font-size:10px;font-weight:600;margin-top:2px">${generatedAt.toLocaleDateString("en-IN")}</div>
          <div style="font-size:9px;color:#9ca3af">Digital Signature via Circul-AI-r</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div style="font-weight:600;color:#374151;margin-bottom:2px">Form BW-3 — Battery Waste Management Rules, 2022</div>
      <div>Central Pollution Control Board | Ministry of Environment, Forest and Climate Change</div>
      <div>Generated via Circul-AI-r Platform | Document ID: ${reportId}</div>
    </div>
    <div class="footer-seal">
      <div class="seal-box">
        <div class="seal-text">✓ EPR COMPLIANT</div>
        <div class="seal-text">${monthName} ${reportPeriod.year}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="watermark-valid">✓ OFFICIAL DOCUMENT</div>
      <div>CPCB Registry Verified</div>
      <div>Page 1 of 1</div>
    </div>
  </div>

</div>
</body>
</html>`;

  return htmlToPdf(html);
}


// ─── EPR COMPLIANCE REPORT (Multi-Jurisdiction) ───────────────────────────────

export interface EprComplianceReportData {
  jurisdiction: "india_cpcb" | "eu_battery_reg" | "generic";
  reportPeriod: { year: number; quarter: number }; // Q1-Q4
  organization: { name: string; registrationId?: string; address?: string; contactEmail?: string };
  batteries: Array<{
    bpan: string;
    chemistry: string;
    capacityKwh: string | number;
    status: string;
    currentSoh: string | number | null;
    manufacturer: string | null;
    registeredAt: Date;
  }>;
  eprTokens: Array<{
    tokenId: string;
    bpan: string | null;
    weightKg: string | number;
    chemistry: string | null;
    status: string;
    issuedAt: Date;
  }>;
  yieldVerifications: Array<{
    bpan: string | null;
    blackMassKg: string | number;
    lithiumRecoveredKg: string | number | null;
    cobaltRecoveredKg: string | number | null;
    nickelRecoveredKg: string | number | null;
    verifiedAt: Date;
  }>;
  stats: {
    totalBatteries: number;
    operationalCount: number;
    secondLifeCount: number;
    endOfLifeCount: number;
    totalEprTokens: number;
    totalWeightKg: number;
    totalYieldKg: number;
    complianceRate: number; // 0-100
  };
  generatedAt: Date;
  generatedBy: string;
}

const QUARTER_LABELS: Record<number, string> = { 1: "Q1 (Jan-Mar)", 2: "Q2 (Apr-Jun)", 3: "Q3 (Jul-Sep)", 4: "Q4 (Oct-Dec)" };

const JURISDICTION_META: Record<string, { title: string; subtitle: string; regulation: string; authority: string; color: string; accentColor: string }> = {
  india_cpcb: {
    title: "Extended Producer Responsibility (EPR) Compliance Report",
    subtitle: "Battery Waste Management Rules, 2022 — Central Pollution Control Board",
    regulation: "BWM Rules 2022, S.O. 1801(E)",
    authority: "Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change",
    color: "#1a3a6b",
    accentColor: "#f97316",
  },
  eu_battery_reg: {
    title: "Battery Passport Compliance Report",
    subtitle: "EU Battery Regulation 2023/1542 — Digital Product Passport",
    regulation: "Regulation (EU) 2023/1542",
    authority: "European Commission — DG Environment",
    color: "#003399",
    accentColor: "#ffcc00",
  },
  generic: {
    title: "Battery Lifecycle Compliance Report",
    subtitle: "Circular Economy Compliance — Extended Producer Responsibility",
    regulation: "Platform Standard v1.0",
    authority: "Circul-AI-r Platform",
    color: "#0a0a1a",
    accentColor: "#00e5a0",
  },
};

export async function generateEprComplianceReportPdf(data: EprComplianceReportData): Promise<Buffer> {
  const { jurisdiction, reportPeriod, organization, batteries, eprTokens, yieldVerifications, stats, generatedAt, generatedBy } = data;
  const meta = JURISDICTION_META[jurisdiction] ?? JURISDICTION_META.generic;
  const quarterLabel = QUARTER_LABELS[reportPeriod.quarter] ?? `Q${reportPeriod.quarter}`;
  const reportId = `EPR-${jurisdiction.toUpperCase().replace(/_/g, "")}-${reportPeriod.year}${reportPeriod.quarter}-${Date.now().toString(36).toUpperCase()}`;

  const totalLiRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.lithiumRecoveredKg ?? 0)), 0);
  const totalCoRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.cobaltRecoveredKg ?? 0)), 0);
  const totalNiRecovered = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.nickelRecoveredKg ?? 0)), 0);
  const totalBlackMass = yieldVerifications.reduce((s, v) => s + parseFloat(String(v.blackMassKg ?? 0)), 0);

  const complianceStatus = stats.complianceRate >= 85 ? "COMPLIANT" : stats.complianceRate >= 60 ? "PARTIALLY COMPLIANT" : "NON-COMPLIANT";
  const complianceColor = stats.complianceRate >= 85 ? "#059669" : stats.complianceRate >= 60 ? "#d97706" : "#dc2626";
  const complianceBg = stats.complianceRate >= 85 ? "#ecfdf5" : stats.complianceRate >= 60 ? "#fffbeb" : "#fef2f2";
  const complianceBorder = stats.complianceRate >= 85 ? "#6ee7b7" : stats.complianceRate >= 60 ? "#fcd34d" : "#fca5a5";

  // Chemistry breakdown
  const chemistryMap = new Map<string, number>();
  batteries.forEach((b) => {
    const c = b.chemistry || "Unknown";
    chemistryMap.set(c, (chemistryMap.get(c) ?? 0) + 1);
  });
  const chemistryRows = Array.from(chemistryMap.entries()).sort((a, b) => b[1] - a[1]);

  // Status breakdown
  const statusMap = new Map<string, number>();
  batteries.forEach((b) => {
    statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + 1);
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${meta.title} — ${quarterLabel} ${reportPeriod.year}</title>
<style>${baseStyles}
  .jurisdiction-header { background: ${meta.color}; color: white; padding: 24px 32px; text-align: center; }
  .jurisdiction-title { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
  .jurisdiction-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 4px; }
  .jurisdiction-accent { color: ${meta.accentColor}; }
  .report-band { background: ${meta.accentColor}; color: ${meta.color}; padding: 8px 32px; font-size: 10px; font-weight: 600; display: flex; justify-content: space-between; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
  .kpi-value { font-size: 22px; font-weight: 800; color: ${meta.color}; }
  .kpi-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .compliance-box { background: ${complianceBg}; border: 2px solid ${complianceBorder}; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; }
  .compliance-status { font-size: 14px; font-weight: 800; color: ${complianceColor}; }
  .compliance-rate { font-size: 32px; font-weight: 800; color: ${complianceColor}; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .mineral-card { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 8px; padding: 12px; text-align: center; }
  .mineral-value { font-size: 18px; font-weight: 700; color: #166534; }
  .mineral-label { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .chemistry-bar { height: 6px; border-radius: 3px; background: #e2e8f0; overflow: hidden; margin-top: 4px; }
  .chemistry-fill { height: 100%; border-radius: 3px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<div class="page">
  <!-- JURISDICTION HEADER -->
  <div class="jurisdiction-header">
    <div class="jurisdiction-title">${meta.title}</div>
    <div class="jurisdiction-sub">${meta.subtitle}</div>
    <div class="jurisdiction-sub" style="margin-top:8px;font-weight:600;color:${meta.accentColor}">
      ${quarterLabel} ${reportPeriod.year} &nbsp;|&nbsp; Document ID: ${reportId}
    </div>
  </div>
  <div class="report-band">
    <span>Regulation: ${meta.regulation}</span>
    <span>Authority: ${meta.authority}</span>
  </div>
  <!-- PLATFORM + ORG HEADER -->
  <div class="header" style="padding:16px 32px">
    <div class="header-logo">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="logo-text">Circul-AI-r</div>
        <div class="logo-sub">Battery Intelligence Platform</div>
      </div>
    </div>
    <div class="header-meta">
      <strong>${organization.name}</strong>
      ${organization.registrationId ? `<div>Registration: ${organization.registrationId}</div>` : ""}
      ${organization.address ? `<div>${organization.address}</div>` : ""}
      ${organization.contactEmail ? `<div>${organization.contactEmail}</div>` : ""}
      <div>Generated: ${generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
    </div>
  </div>

  <!-- COMPLIANCE STATUS -->
  <div class="section">
    <div class="compliance-box">
      <div class="compliance-rate">${stats.complianceRate.toFixed(0)}%</div>
      <div>
        <div class="compliance-status">${complianceStatus}</div>
        <p style="font-size:10px;color:#6b7280;margin-top:4px">
          EPR compliance rate for ${quarterLabel} ${reportPeriod.year}. ${stats.totalEprTokens} EPR tokens issued covering ${stats.totalWeightKg.toFixed(1)} kg of battery waste processed across ${stats.totalBatteries} registered batteries.
        </p>
      </div>
    </div>
  </div>

  <!-- KPI SUMMARY -->
  <div class="section">
    <div class="section-title">Section A — Battery Inventory Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalBatteries}</div>
        <div class="kpi-label">Total Batteries</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.operationalCount}</div>
        <div class="kpi-label">Operational</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.secondLifeCount}</div>
        <div class="kpi-label">Second Life</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.endOfLifeCount}</div>
        <div class="kpi-label">End of Life</div>
      </div>
    </div>
  </div>

  <!-- CHEMISTRY BREAKDOWN -->
  <div class="section">
    <div class="section-title">Section B — Chemistry Distribution</div>
    <table class="table">
      <thead>
        <tr><th>Chemistry</th><th>Count</th><th>Percentage</th><th>Distribution</th></tr>
      </thead>
      <tbody>
        ${chemistryRows.map(([chem, count]) => {
          const pct = batteries.length > 0 ? ((count / batteries.length) * 100).toFixed(1) : "0";
          const colors: Record<string, string> = { NMC: "#3b82f6", LFP: "#22c55e", NCA: "#f59e0b", LCO: "#8b5cf6", LMO: "#ef4444" };
          const barColor = colors[chem] ?? "#94a3b8";
          return `<tr>
            <td style="font-weight:600">${chem}</td>
            <td>${count}</td>
            <td>${pct}%</td>
            <td style="width:200px"><div class="chemistry-bar"><div class="chemistry-fill" style="width:${pct}%;background:${barColor}"></div></div></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>

  <!-- EPR TOKEN SUMMARY -->
  <div class="section">
    <div class="section-title">Section C — EPR Token Issuance</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalEprTokens}</div>
        <div class="kpi-label">Tokens Issued</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalWeightKg.toFixed(0)} kg</div>
        <div class="kpi-label">Weight Processed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totalBlackMass.toFixed(0)} kg</div>
        <div class="kpi-label">Black Mass Yield</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.totalYieldKg.toFixed(0)} kg</div>
        <div class="kpi-label">Total Yield Verified</div>
      </div>
    </div>
  </div>

  <!-- MINERAL RECOVERY -->
  <div class="section">
    <div class="section-title">Section D — Mineral Recovery</div>
    <div class="grid-3">
      <div class="mineral-card">
        <div class="mineral-value">${totalLiRecovered.toFixed(2)} kg</div>
        <div class="mineral-label">Lithium Recovered</div>
      </div>
      <div class="mineral-card">
        <div class="mineral-value">${totalCoRecovered.toFixed(2)} kg</div>
        <div class="mineral-label">Cobalt Recovered</div>
      </div>
      <div class="mineral-card">
        <div class="mineral-value">${totalNiRecovered.toFixed(2)} kg</div>
        <div class="mineral-label">Nickel Recovered</div>
      </div>
    </div>
  </div>

  <!-- EPR TOKEN LEDGER -->
  ${eprTokens.length > 0 ? `
  <div class="section page-break">
    <div class="section-title">Section E — EPR Token Ledger (${Math.min(eprTokens.length, 20)} of ${eprTokens.length})</div>
    <table class="table">
      <thead>
        <tr><th>Token ID</th><th>BPAN</th><th>Chemistry</th><th>Weight (kg)</th><th>Status</th><th>Issued</th></tr>
      </thead>
      <tbody>
        ${eprTokens.slice(0, 20).map((t) => `
        <tr>
          <td style="font-family:monospace;font-size:9px">${t.tokenId}</td>
          <td style="font-family:monospace;font-size:9px">${t.bpan ?? "\u2014"}</td>
          <td>${t.chemistry ?? "\u2014"}</td>
          <td>${parseFloat(String(t.weightKg)).toFixed(2)}</td>
          <td><span class="badge ${t.status === "issued" ? "badge-green" : t.status === "redeemed" ? "badge-blue" : "badge-yellow"}">${t.status}</span></td>
          <td>${new Date(t.issuedAt).toLocaleDateString("en-IN")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ${eprTokens.length > 20 ? `<div style="margin-top:6px;font-size:9px;color:#9ca3af">\u2026 and ${eprTokens.length - 20} more tokens. Full ledger available in the platform.</div>` : ""}
  </div>` : ""}

  <!-- BATTERY INVENTORY -->
  ${batteries.length > 0 ? `
  <div class="section${eprTokens.length === 0 ? " page-break" : ""}">
    <div class="section-title">Section F — Battery Inventory (${Math.min(batteries.length, 25)} of ${batteries.length})</div>
    <table class="table">
      <thead>
        <tr><th>BPAN</th><th>Chemistry</th><th>Capacity</th><th>SOH</th><th>Status</th><th>Manufacturer</th><th>Registered</th></tr>
      </thead>
      <tbody>
        ${batteries.slice(0, 25).map((b) => {
          const soh = b.currentSoh != null ? parseFloat(String(b.currentSoh)) : null;
          const sohColor = soh == null ? "#9ca3af" : soh > 75 ? "#059669" : soh > 50 ? "#d97706" : "#dc2626";
          return `<tr>
            <td style="font-family:monospace;font-size:9px">${b.bpan}</td>
            <td>${b.chemistry}</td>
            <td>${parseFloat(String(b.capacityKwh)).toFixed(1)} kWh</td>
            <td style="color:${sohColor};font-weight:600">${soh != null ? soh.toFixed(1) + "%" : "\u2014"}</td>
            <td><span class="badge ${b.status === "operational" ? "badge-green" : b.status === "second_life" ? "badge-blue" : "badge-yellow"}">${b.status.replace(/_/g, " ")}</span></td>
            <td style="font-size:9px">${b.manufacturer ?? "\u2014"}</td>
            <td>${new Date(b.registeredAt).toLocaleDateString("en-IN")}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    ${batteries.length > 25 ? `<div style="margin-top:6px;font-size:9px;color:#9ca3af">\u2026 and ${batteries.length - 25} more batteries. Full inventory available in the platform.</div>` : ""}
  </div>` : ""}

  <!-- YIELD VERIFICATION -->
  ${yieldVerifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Section G — Yield Verification Records</div>
    <table class="table">
      <thead>
        <tr><th>BPAN</th><th>Black Mass (kg)</th><th>Li (kg)</th><th>Co (kg)</th><th>Ni (kg)</th><th>Verified</th></tr>
      </thead>
      <tbody>
        ${yieldVerifications.slice(0, 15).map((v) => `
        <tr>
          <td style="font-family:monospace;font-size:9px">${v.bpan ?? "\u2014"}</td>
          <td>${parseFloat(String(v.blackMassKg)).toFixed(2)}</td>
          <td>${v.lithiumRecoveredKg != null ? parseFloat(String(v.lithiumRecoveredKg)).toFixed(2) : "\u2014"}</td>
          <td>${v.cobaltRecoveredKg != null ? parseFloat(String(v.cobaltRecoveredKg)).toFixed(2) : "\u2014"}</td>
          <td>${v.nickelRecoveredKg != null ? parseFloat(String(v.nickelRecoveredKg)).toFixed(2) : "\u2014"}</td>
          <td>${new Date(v.verifiedAt).toLocaleDateString("en-IN")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- DECLARATION -->
  <div class="section">
    <div class="section-title">Section H — Declaration & Certification</div>
    <div class="warning-box">
      <p style="font-size:10px;color:#92400e;line-height:1.6">
        I hereby declare that the information furnished in this EPR Compliance Report is true, correct and complete to the best of my knowledge and belief. 
        All battery waste has been processed in accordance with applicable regulations (${meta.regulation}) and guidelines issued by ${meta.authority}. 
        EPR obligations for ${quarterLabel} ${reportPeriod.year} have been fulfilled through the Circul-AI-r Platform's blockchain-verified token system.
      </p>
      <div style="margin-top:16px;display:flex;justify-content:space-between">
        <div>
          <div style="font-size:9px;color:#9ca3af">Authorized Signatory</div>
          <div style="font-size:11px;font-weight:600;margin-top:2px">${generatedBy}</div>
          <div style="font-size:9px;color:#9ca3af">${organization.name}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#9ca3af">Date of Submission</div>
          <div style="font-size:11px;font-weight:600;margin-top:2px">${generatedAt.toLocaleDateString("en-IN")}</div>
          <div style="font-size:9px;color:#9ca3af">Digital Signature via Circul-AI-r</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div style="font-weight:600;color:#374151;margin-bottom:2px">${meta.title}</div>
      <div>${meta.authority}</div>
      <div>Generated via Circul-AI-r Platform | Document ID: ${reportId}</div>
    </div>
    <div class="footer-seal">
      <div class="seal-box">
        <div class="seal-text" style="color:${complianceColor}">${complianceStatus}</div>
        <div class="seal-text">${quarterLabel} ${reportPeriod.year}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="watermark-valid" style="color:${complianceColor}">${complianceStatus === "COMPLIANT" ? "\u2713 OFFICIAL DOCUMENT" : "\u26A0 REVIEW REQUIRED"}</div>
      <div>Compliance Rate: ${stats.complianceRate.toFixed(0)}%</div>
    </div>
  </div>
</div>
</body>
</html>`;
  return htmlToPdf(html);
}

// ─── PER-BATTERY EPR COMPLIANCE CERTIFICATE ───────────────────────────────────

export interface BatteryComplianceCertData {
  battery: {
    bpan: string;
    chemistry: string;
    capacityKwh: string | number;
    manufacturer: string | null;
    model: string | null;
    status: string;
    currentSoh: string | number | null;
    registeredAt: Date;
  };
  eprTokens: Array<{
    tokenId: string;
    weightKg: string | number;
    status: string;
    issuedAt: Date;
  }>;
  serviceHistory: Array<{
    serviceType: string;
    description: string | null;
    performedAt: Date;
    performedBy: string | null;
  }>;
  complianceStatus: "compliant" | "pending" | "non_compliant";
  generatedAt: Date;
  generatedBy: string;
}

export async function generateBatteryComplianceCertPdf(data: BatteryComplianceCertData): Promise<Buffer> {
  const { battery, eprTokens, serviceHistory, complianceStatus, generatedAt, generatedBy } = data;
  const certId = `CERT-${battery.bpan}-${Date.now().toString(36).toUpperCase()}`;
  const soh = battery.currentSoh != null ? parseFloat(String(battery.currentSoh)) : null;
  const statusLabel = complianceStatus === "compliant" ? "COMPLIANT" : complianceStatus === "pending" ? "PENDING REVIEW" : "NON-COMPLIANT";
  const statusColor = complianceStatus === "compliant" ? "#059669" : complianceStatus === "pending" ? "#d97706" : "#dc2626";
  const statusBg = complianceStatus === "compliant" ? "#ecfdf5" : complianceStatus === "pending" ? "#fffbeb" : "#fef2f2";
  const statusBorder = complianceStatus === "compliant" ? "#6ee7b7" : complianceStatus === "pending" ? "#fcd34d" : "#fca5a5";
  const totalEprWeight = eprTokens.reduce((s, t) => s + parseFloat(String(t.weightKg ?? 0)), 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Battery Compliance Certificate — ${battery.bpan}</title>
<style>${baseStyles}
  .cert-header { background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%); color: white; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; }
  .cert-badge { background: ${statusBg}; border: 2px solid ${statusBorder}; border-radius: 12px; padding: 20px; text-align: center; }
  .cert-status { font-size: 18px; font-weight: 800; color: ${statusColor}; letter-spacing: 1px; }
  .cert-id { font-size: 9px; color: #9ca3af; margin-top: 4px; font-family: monospace; }
  .bpan-display { font-family: monospace; font-size: 20px; font-weight: 700; color: #00e5a0; letter-spacing: 1px; }
  .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .detail-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .detail-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-value { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
  .soh-gauge { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .soh-fill { height: 100%; border-radius: 4px; }
  .timeline { border-left: 2px solid #e2e8f0; padding-left: 16px; margin-left: 8px; }
  .timeline-item { position: relative; padding-bottom: 12px; }
  .timeline-dot { position: absolute; left: -22px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #00e5a0; border: 2px solid white; }
</style>
</head>
<body>
<div class="page">
  <!-- HEADER -->
  <div class="cert-header">
    <div>
      <div class="header-logo" style="display:flex;align-items:center;gap:12px">
        <div class="logo-icon">⚡</div>
        <div>
          <div class="logo-text">Circul-AI-r</div>
          <div class="logo-sub">Battery Compliance Certificate</div>
        </div>
      </div>
      <div class="bpan-display" style="margin-top:12px">${battery.bpan}</div>
    </div>
    <div style="text-align:right">
      <div class="cert-badge">
        <div class="cert-status">${statusLabel}</div>
        <div class="cert-id">${certId}</div>
      </div>
    </div>
  </div>

  <!-- BATTERY DETAILS -->
  <div class="section">
    <div class="section-title">Battery Information</div>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">Chemistry</div>
        <div class="detail-value">${battery.chemistry}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Capacity</div>
        <div class="detail-value">${parseFloat(String(battery.capacityKwh)).toFixed(1)} kWh</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Manufacturer</div>
        <div class="detail-value">${battery.manufacturer ?? "\u2014"}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Model</div>
        <div class="detail-value">${battery.model ?? "\u2014"}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Current Status</div>
        <div class="detail-value" style="text-transform:capitalize">${battery.status.replace(/_/g, " ")}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Registered</div>
        <div class="detail-value">${new Date(battery.registeredAt).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    ${soh != null ? `
    <div style="margin-top:12px">
      <div class="detail-label">State of Health (SOH)</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
        <div style="font-size:24px;font-weight:800;color:${soh > 75 ? "#059669" : soh > 50 ? "#d97706" : "#dc2626"}">${soh.toFixed(1)}%</div>
        <div class="soh-gauge" style="flex:1">
          <div class="soh-fill" style="width:${Math.min(soh, 100)}%;background:${soh > 75 ? "#059669" : soh > 50 ? "#d97706" : "#dc2626"}"></div>
        </div>
      </div>
    </div>` : ""}
  </div>

  <!-- EPR TOKEN HISTORY -->
  <div class="section">
    <div class="section-title">EPR Token History (${eprTokens.length} tokens, ${totalEprWeight.toFixed(2)} kg total)</div>
    ${eprTokens.length > 0 ? `
    <table class="table">
      <thead>
        <tr><th>Token ID</th><th>Weight (kg)</th><th>Status</th><th>Issued</th></tr>
      </thead>
      <tbody>
        ${eprTokens.slice(0, 10).map((t) => `
        <tr>
          <td style="font-family:monospace;font-size:9px">${t.tokenId}</td>
          <td>${parseFloat(String(t.weightKg)).toFixed(2)}</td>
          <td><span class="badge ${t.status === "issued" ? "badge-green" : t.status === "redeemed" ? "badge-blue" : "badge-yellow"}">${t.status}</span></td>
          <td>${new Date(t.issuedAt).toLocaleDateString("en-IN")}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<p style="font-size:10px;color:#9ca3af">No EPR tokens issued for this battery.</p>`}
  </div>

  <!-- SERVICE HISTORY -->
  <div class="section">
    <div class="section-title">Service & Maintenance History</div>
    ${serviceHistory.length > 0 ? `
    <div class="timeline">
      ${serviceHistory.slice(0, 8).map((s) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div style="font-size:10px;font-weight:600">${s.serviceType.replace(/_/g, " ")}</div>
        <div style="font-size:9px;color:#6b7280">${s.description ?? ""}</div>
        <div style="font-size:9px;color:#9ca3af;margin-top:2px">${new Date(s.performedAt).toLocaleDateString("en-IN")} ${s.performedBy ? `\u2014 ${s.performedBy}` : ""}</div>
      </div>`).join("")}
    </div>` : `<p style="font-size:10px;color:#9ca3af">No service records available.</p>`}
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div style="font-weight:600;color:#374151;margin-bottom:2px">Battery Compliance Certificate</div>
      <div>Circul-AI-r Platform | ${certId}</div>
      <div>Generated by ${generatedBy} on ${generatedAt.toLocaleDateString("en-IN")}</div>
    </div>
    <div class="footer-seal">
      <div class="seal-box">
        <div class="seal-text" style="color:${statusColor}">${statusLabel}</div>
        <div class="seal-text">${battery.bpan}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="watermark-valid" style="color:${statusColor}">${complianceStatus === "compliant" ? "\u2713 CERTIFIED" : "\u26A0 REVIEW REQUIRED"}</div>
    </div>
  </div>
</div>
</body>
</html>`;
  return htmlToPdf(html);
}
