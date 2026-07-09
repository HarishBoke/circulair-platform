/**
 * email.ts
 *
 * Transactional email helpers powered by ZeptoMail REST API (direct fetch).
 * Uses ZEPTOMAIL_TOKEN as-is in the Authorization header — no SDK wrapping.
 * All functions are server-side only — never import this from client code.
 *
 * Exports:
 *   sendPasswordResetEmail(to, resetUrl, name?) → Promise<{ success: boolean; messageId?: string }>
 *   sendDeveloperOnboardingEmail(params)        → Promise<{ success: boolean; messageId?: string }>
 *   validateEmailConfig()                       → boolean
 */
import { ENV } from "./_core/env";

const ZEPTO_API_URL = "https://api.zeptomail.in/v1.1/email";

// Circul-AI-r logo as base64 data URI (SVG) — inlined so it works in all email clients
const LOGO_DATA_URI =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTc4IiBoZWlnaHQ9IjE3OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIj4KCiA8Zz4KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgPHBhdGggaWQ9InN2Z18xIiBmaWxsPSIjMDBjNTg5IiBkPSJtMTIwLjUsMTIxLjVjLTguNTcyLDguNTcxIC0xOSwxMi43MTQgLTMyLjAwMDEsMTIuNzE0Yy0xMywwIC0yMy40Mjg2LC00LjE0MyAtMzIuMDAwMSwtMTIuNzE0Yy01Ljc4NTcsLTUuNzg2IC05LjM1NzEsLTEzIC0xMS4yODU3LC0yMWwtNDQuNzE0MjIsMGMyLjIxNDI4LDIxLjIxNCAxMC40OTk5MiwzOC42NDMgMjQuODU3MTIsNTIuNDI5YzE3LjM1NzEsMTYuNTcxIDM4LjM1NzEsMjQuODU3IDYzLjE0MjksMjQuODU3YzI0Ljc4NjEsMCA0NS41MDAxLC04LjI4NiA2Mi45MjgxLC0yNC44NTdjMTQuNjQzLC0xMy43ODYgMjIuOTI5LC0zMS40MjkgMjUuMDcyLC01Mi40MjlsLTQ0LjcxNCwwYy0xLjkyOSw4IC01LjUsMTUuMTQzIC0xMS4yODYsMjF6Ii8+CiAgPHBhdGggaWQ9InN2Z18yIiBmaWxsPSJ3aGl0ZSIgZD0ibTU2Ljc4NTYsNTYuNjQzYzguNTcxNCwtOC4yODU4IDE5LC0xMi43MTQzIDMxLjcxNDIsLTEyLjcxNDNjMTIuNzE0MiwwIDIzLjE0MzIsNC4xNDI4IDMxLjcxNDIsMTIuNzE0M2M3LjcxNCw3LjcxNDIgMTIuMTQzLDE3LjM1NzEgMTIuNzE0LDI4LjcxNDJsNDQuMTQzLDBjLTAuNTcxLC0yNC41NzE0IC05LjA3MSwtNDUgLTI1LjY0MywtNjAuNzE0MmMtMTcuMDcxLC0xNi4yODU3NiAtMzcuNzg1LC0yNC41NzE0NyAtNjIuOTI4MiwtMjQuNTcxNDdjLTI1LjE0MjgsMCAtNDYuMDcxNCw4LjI4NTcxIC02My4xNDI4LDI0LjU3MTQ3Yy0xNi4yODU3MywxNS43MTQyIC0yNC44NTcxMiwzNS44NTcxIC0yNS4zNTcxMiw2MC43MTQybDQ0LjE0MjgyLDBjMC41NzE1LC0xMS4yODU3IDQuNzE0MywtMjEgMTIuNzE0MywtMjguNzE0MmwtMC4wNzE0LDB6Ii8+CiA8L2c+Cjwvc3ZnPg==";

// ─── Shared email layout helpers ──────────────────────────────────────────────

function emailWrapper(bodyContent: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  ${previewText ? `<meta name="description" content="${previewText}" />` : ""}
  <title>Circul-AI-r Battery Intelligence Platform</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    /* Reset */
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    /* Base */
    body { margin: 0 !important; padding: 0 !important; background-color: #07100a; width: 100% !important; }
    .email-wrapper { background-color: #07100a; padding: 32px 16px; }
    /* Card */
    .email-card { max-width: 600px; margin: 0 auto; background-color: #0d1f12; border: 1px solid #1c3d22; border-radius: 16px; overflow: hidden; }
    /* Accent bar */
    .accent-bar { height: 3px; background: linear-gradient(90deg, #00c589 0%, #22c55e 50%, #00c589 100%); }
    /* Header */
    .email-header { padding: 28px 40px 24px; border-bottom: 1px solid #1c3d22; }
    .logo-row { display: flex; align-items: center; gap: 12px; }
    .logo-img { width: 36px; height: 36px; display: inline-block; vertical-align: middle; }
    .logo-wordmark { display: inline-block; vertical-align: middle; margin-left: 10px; }
    .logo-name { font-size: 18px; font-weight: 700; color: #f0fdf4; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .logo-name-accent { color: #00c589; }
    .logo-tagline { font-size: 8px; color: #4ade80; letter-spacing: 3px; text-transform: uppercase; font-family: 'Courier New', Courier, monospace; margin-top: 2px; }
    /* Body */
    .email-body { padding: 36px 40px; }
    .email-h1 { font-size: 22px; font-weight: 700; color: #f0fdf4; margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.3; }
    .email-p { font-size: 15px; line-height: 1.65; color: #86efac; margin: 0 0 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .email-p-muted { font-size: 14px; line-height: 1.6; color: #4ade80; margin: 0 0 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    /* CTA button */
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #00c589 0%, #16a34a 100%); color: #07100a !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    /* Info box */
    .info-box { background: #061209; border: 1px solid #1c3d22; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .info-box-label { font-size: 10px; color: #4ade80; letter-spacing: 2px; text-transform: uppercase; font-family: 'Courier New', Courier, monospace; margin-bottom: 8px; }
    .info-box-value { font-size: 13px; color: #f0fdf4; font-family: 'Courier New', Courier, monospace; word-break: break-all; background: #040d06; padding: 10px 14px; border-radius: 6px; border: 1px solid #1c3d22; }
    /* Warning box */
    .warning-box { background: #1a1200; border: 1px solid #3d2e00; border-radius: 8px; padding: 14px 18px; margin: 20px 0; }
    .warning-box p { font-size: 13px; color: #fbbf24; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; }
    /* URL fallback */
    .url-box { background: #061209; border: 1px solid #1c3d22; border-radius: 8px; padding: 14px 18px; margin: 16px 0; word-break: break-all; }
    .url-box-label { font-size: 11px; color: #4ade80; margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; }
    .url-box a { font-size: 12px; color: #00c589; word-break: break-all; text-decoration: none; font-family: 'Courier New', Courier, monospace; }
    /* Code block */
    .code-block { background: #040d06; border: 1px solid #1c3d22; border-radius: 8px; padding: 14px 18px; margin: 12px 0; font-size: 12px; color: #4ade80; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; word-break: break-all; line-height: 1.6; }
    /* Section heading */
    .section-heading { font-size: 11px; font-weight: 600; color: #4ade80; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace; border-bottom: 1px solid #1c3d22; padding-bottom: 6px; }
    /* Scope list */
    .scope-list { list-style: none; padding: 0; margin: 8px 0 16px; }
    .scope-list li { font-size: 14px; color: #86efac; padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .scope-list li::before { content: "✓ "; color: #00c589; font-weight: 700; }
    /* Button group */
    .btn-group { margin: 20px 0; }
    .btn-primary { display: inline-block; padding: 11px 24px; background: linear-gradient(135deg, #00c589 0%, #16a34a 100%); color: #07100a !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 4px 6px 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .btn-secondary { display: inline-block; padding: 10px 22px; background: transparent; border: 1px solid #1c3d22; color: #4ade80 !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; margin: 4px 6px 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    /* Divider */
    .divider { border: none; border-top: 1px solid #1c3d22; margin: 24px 0; }
    /* Footer */
    .email-footer { padding: 20px 40px 28px; border-top: 1px solid #1c3d22; }
    .footer-p { font-size: 12px; color: #166534; margin: 0 0 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .footer-p a { color: #00c589; text-decoration: none; }
    .badge-row { margin-top: 16px; }
    .badge { display: inline-block; font-size: 9px; color: #1c5c35; letter-spacing: 2px; text-transform: uppercase; font-family: 'Courier New', Courier, monospace; margin-right: 14px; }
    /* Mobile */
    @media only screen and (max-width: 600px) {
      .email-header, .email-body, .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
      .email-h1 { font-size: 19px !important; }
      .cta-btn { padding: 13px 28px !important; font-size: 14px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-card">
      <div class="accent-bar"></div>
      <!-- Header -->
      <div class="email-header">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right: 12px;">
              <img src="${LOGO_DATA_URI}" alt="Circul-AI-r logo" width="36" height="36" style="display:block;width:36px;height:36px;" />
            </td>
            <td valign="middle">
              <div class="logo-name">Circul<span class="logo-name-accent">-AI-</span>r</div>
              <div class="logo-tagline">Battery Intelligence Platform</div>
            </td>
          </tr>
        </table>
      </div>
      <!-- Body -->
      ${bodyContent}
      <!-- Footer -->
      <div class="email-footer">
        <p class="footer-p">This email was sent by Circul-AI-r Battery Intelligence Platform.</p>
        <p class="footer-p">Questions? <a href="mailto:support@circulair.energy">support@circulair.energy</a> &nbsp;·&nbsp; <a href="https://circulair.energy/">circulair.energy</a></p>
        <div class="badge-row">
          <span class="badge">Encrypted</span>
          <span class="badge">ISO 27001</span>
          <span class="badge">SOC 2</span>
          <span class="badge">GDPR</span>
          <span class="badge">EU Battery Reg</span>
        </div>
      </div>
    </div>
    <!-- Outer footer -->
    <p style="text-align:center;font-size:11px;color:#1c5c35;margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      © ${new Date().getFullYear()} Circul-AI-r · <a href="https://circulair.energy/privacy" style="color:#1c5c35;text-decoration:none;">Privacy Policy</a> · <a href="https://circulair.energy/terms" style="color:#1c5c35;text-decoration:none;">Terms</a>
    </p>
  </div>
</body>
</html>`;
}

// ─── Core send helper ─────────────────────────────────────────────────────────
interface ZeptoMailPayload {
  from: { address: string; name: string };
  to: { email_address: { address: string; name: string } }[];
  reply_to?: { address: string; name: string }[];
  subject: string;
  htmlbody?: string;
  textbody?: string;
}

async function sendViaZeptoAPI(payload: ZeptoMailPayload): Promise<{ request_id?: string }> {
  if (!ENV.zeptomailToken) {
    throw new Error("ZEPTOMAIL_TOKEN is not configured");
  }
  const response = await fetch(ZEPTO_API_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      // Token already contains the full "Zoho-enczapikey ..." prefix — pass as-is
      "Authorization": ENV.zeptomailToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errCode = (data as any)?.error?.details?.[0]?.code ?? response.status;
    const errMsg = (data as any)?.error?.details?.[0]?.message
      ?? (data as any)?.error?.message
      ?? `HTTP ${response.status}`;
    throw new Error(`ZeptoMail API error [${errCode}]: ${errMsg}`);
  }

  return data as { request_id?: string };
}

// ─── Config validation ────────────────────────────────────────────────────────
export function validateEmailConfig(): boolean {
  return Boolean(ENV.zeptomailToken && ENV.fromEmail);
}

/** @deprecated Use validateEmailConfig() */
export function validateResendConfig(): boolean {
  return validateEmailConfig();
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

function buildPasswordResetHtml(resetUrl: string, name: string, expiryMinutes = 15): string {
  const displayName = name || "there";
  const body = `
    <div class="email-body">
      <h1 class="email-h1">Reset your password</h1>
      <p class="email-p">Hi ${displayName},</p>
      <p class="email-p">We received a request to reset the password for your Circul-AI-r account. Click the button below to choose a new password.</p>
      <div class="cta-wrapper">
        <a href="${resetUrl}" class="cta-btn">Reset Password &rarr;</a>
      </div>
      <div class="warning-box">
        <p>&#9888; This link expires in <strong>${expiryMinutes} minutes</strong> and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
      </div>
      <hr class="divider" />
      <p class="email-p-muted">If the button above doesn't work, copy and paste this URL into your browser:</p>
      <div class="url-box">
        <p class="url-box-label">Reset link</p>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>
    </div>`;
  return emailWrapper(body, `Reset your Circul-AI-r password — link expires in ${expiryMinutes} minutes`);
}

function buildPasswordResetText(resetUrl: string, name: string, expiryMinutes = 15): string {
  const displayName = name || "there";
  return `Hi ${displayName},

We received a request to reset the password for your Circul-AI-r account.

Reset your password here:
${resetUrl}

This link expires in ${expiryMinutes} minutes and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

— Circul-AI-r Battery Intelligence Platform
https://circulair.energy/`;
}

export interface SendPasswordResetEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  name?: string,
  expiryMinutes = 15
): Promise<SendPasswordResetEmailResult> {
  try {
    const response = await sendViaZeptoAPI({
      from: { address: ENV.fromEmail, name: "Circul-AI-r" },
      to: [{ email_address: { address: to, name: name ?? to } }],
      reply_to: [{ address: ENV.fromEmail, name: "Circul-AI-r" }],
      subject: "Reset your Circul-AI-r password",
      htmlbody: buildPasswordResetHtml(resetUrl, name ?? "", expiryMinutes),
      textbody: buildPasswordResetText(resetUrl, name ?? "", expiryMinutes),
    });
    const requestId = response?.request_id ?? "";
    console.log(`[ZeptoMail] Password reset email sent to ${to} (request_id: ${requestId})`);
    return { success: true, messageId: requestId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ZeptoMail] Exception sending password reset email:", message);
    return { success: false, error: message };
  }
}

// ─── Developer Onboarding Email ───────────────────────────────────────────────

export interface DeveloperOnboardingEmailParams {
  to: string;
  name: string;
  apiKey: string;
  keyName: string;
  permissions: string[];
  origin: string;
}

function buildDeveloperOnboardingHtml(p: DeveloperOnboardingEmailParams): string {
  const { name, apiKey, keyName, permissions, origin } = p;
  const scopeItems = permissions.map(s => `<li>${s}</li>`).join("");
  const jsSnippet = `const res = await fetch("${origin}/api/v1/batteries", {\n  headers: { Authorization: "Bearer ${apiKey}" }\n});\nconst data = await res.json();`;
  const curlSnippet = `curl -X POST ${origin}/api/mcp \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'`;

  const body = `
    <div class="email-body">
      <h1 class="email-h1">Welcome to the API, ${name || "Developer"}!</h1>
      <p class="email-p">Your API key <strong>"${keyName}"</strong> has been issued. This is the only time the full key will be shown — store it securely in your secrets manager or vault.</p>

      <div class="section-heading">Your API Key</div>
      <div class="info-box">
        <div class="info-box-label">Bearer Token</div>
        <div class="info-box-value">${apiKey}</div>
      </div>
      <div class="warning-box">
        <p>&#9888; Never commit this key to source control. Rotate it immediately from the Developer Portal if it is ever exposed.</p>
      </div>

      <div class="section-heading">Granted Scopes</div>
      <ul class="scope-list">${scopeItems}</ul>

      <div class="section-heading">Quickstart — REST API</div>
      <div class="code-block">${jsSnippet}</div>

      <div class="section-heading">Quickstart — MCP (Claude / Cursor)</div>
      <div class="code-block">${curlSnippet}</div>

      <hr class="divider" />
      <div class="section-heading">Next Steps</div>
      <div class="btn-group">
        <a href="${origin}/api-reference" class="btn-primary">API Reference</a>
        <a href="${origin}/mcp-server" class="btn-secondary">MCP Server Docs</a>
        <a href="${origin}/developer-portal" class="btn-secondary">Developer Portal</a>
      </div>
    </div>`;
  return emailWrapper(body, `Your Circul-AI-r API key "${keyName}" is ready`);
}

function buildDeveloperOnboardingText(p: DeveloperOnboardingEmailParams): string {
  return `Welcome to the Circul-AI-r Developer Platform, ${p.name || "Developer"}!

Your API key "${p.keyName}" has been issued. Store it securely — this is the only time it will be shown.

API KEY: ${p.apiKey}

GRANTED SCOPES: ${p.permissions.join(", ")}

QUICKSTART:
curl -X POST ${p.origin}/api/mcp \\
  -H "Authorization: Bearer ${p.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'

NEXT STEPS:
- API Reference: ${p.origin}/api-reference
- MCP Server Docs: ${p.origin}/mcp-server
- Developer Portal: ${p.origin}/developer-portal

— Circul-AI-r Battery Intelligence Platform
https://circulair.energy/`;
}

export async function sendDeveloperOnboardingEmail(
  params: DeveloperOnboardingEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await sendViaZeptoAPI({
      from: { address: ENV.fromEmail, name: "Circul-AI-r Developer Platform" },
      to: [{ email_address: { address: params.to, name: params.name || params.to } }],
      reply_to: [{ address: ENV.fromEmail, name: "Circul-AI-r Developer Support" }],
      subject: `Your API key "${params.keyName}" is ready — Circul-AI-r Developer Platform`,
      htmlbody: buildDeveloperOnboardingHtml(params),
      textbody: buildDeveloperOnboardingText(params),
    });
    const requestId = response?.request_id ?? "";
    console.log(`[ZeptoMail] Developer onboarding email sent to ${params.to} (request_id: ${requestId})`);
    return { success: true, messageId: requestId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ZeptoMail] Exception sending developer onboarding email:", message);
    return { success: false, error: message };
  }
}
