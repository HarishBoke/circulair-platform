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

// ─── HTML email template ──────────────────────────────────────────────────────
function buildPasswordResetHtml(resetUrl: string, name: string, expiryMinutes = 15): string {
  const displayName = name || "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Circul-AI-r password</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0f0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background-color: #0f1a0f; border: 1px solid #1a3a1a; border-radius: 16px; overflow: hidden; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%); }
    .header { padding: 32px 40px 24px; border-bottom: 1px solid #1a3a1a; }
    .logo-text { font-size: 20px; font-weight: 700; color: #f0fdf4; letter-spacing: -0.5px; }
    .logo-text span { color: #22c55e; }
    .logo-sub { font-size: 9px; color: #4ade80; letter-spacing: 3px; text-transform: uppercase; font-family: 'Courier New', monospace; margin-top: 2px; }
    .body { padding: 36px 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #f0fdf4; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.6; color: #86efac; margin: 0 0 20px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #0a0f0a !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
    .url-fallback { background: #0a1a0a; border: 1px solid #1a3a1a; border-radius: 8px; padding: 14px 16px; margin: 20px 0; word-break: break-all; }
    .url-fallback p { font-size: 12px; color: #4ade80; margin: 0 0 6px; }
    .url-fallback a { font-size: 12px; color: #22c55e; word-break: break-all; }
    .warning-box { background: #1a1000; border: 1px solid #3a2a00; border-radius: 8px; padding: 14px 16px; margin: 24px 0; }
    .warning-box p { font-size: 13px; color: #fbbf24; margin: 0; }
    .footer { padding: 20px 40px 28px; border-top: 1px solid #1a3a1a; }
    .footer p { font-size: 12px; color: #166534; margin: 0 0 6px; }
    .footer a { color: #22c55e; text-decoration: none; }
    .badge-row { display: flex; gap: 16px; margin-top: 16px; }
    .badge { font-size: 9px; color: #166534; letter-spacing: 2px; text-transform: uppercase; font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="accent-bar"></div>
    <div class="header">
      <div class="logo-text">Circul<span>-AI-</span>r</div>
      <div class="logo-sub">Battery Intelligence Platform</div>
    </div>
    <div class="body">
      <h1>Reset your password</h1>
      <p>Hi ${displayName},</p>
      <p>We received a request to reset the password for your Circul-AI-r account. Click the button below to choose a new password.</p>
      <div class="cta-wrapper">
        <a href="${resetUrl}" class="cta-button">Reset Password</a>
      </div>
      <div class="warning-box">
        <p>⚠ This link expires in <strong>${expiryMinutes} minutes</strong> and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
      </div>
      <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
      <div class="url-fallback">
        <p>Reset link</p>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      <p>This email was sent by Circul-AI-r Battery Intelligence Platform.</p>
      <p>If you have questions, contact <a href="mailto:support@circulair.energy">support@circulair.energy</a></p>
      <div class="badge-row">
        <span class="badge">Encrypted</span>
        <span class="badge">ISO 27001</span>
        <span class="badge">SOC 2</span>
        <span class="badge">GDPR</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildPasswordResetText(resetUrl: string, name: string, expiryMinutes = 15): string {
  const displayName = name || "there";
  return `Hi ${displayName},

We received a request to reset the password for your Circul-AI-r account.

Reset your password here:
${resetUrl}

This link expires in ${expiryMinutes} minutes and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

— Circul-AI-r Battery Intelligence Platform`;
}

// ─── Send password reset email ────────────────────────────────────────────────
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

// ─── Developer onboarding email ──────────────────────────────────────────────

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
  const scopeList = permissions.map(s => `<li style="margin:4px 0;color:#86efac;">${s}</li>`).join("");
  const curlSnippet = `curl -X POST ${origin}/api/mcp \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'`;
  const jsSnippet = `const res = await fetch("${origin}/api/v1/batteries", {
  headers: { Authorization: "Bearer ${apiKey}" }
});
const data = await res.json();`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to the Circul-AI-r Developer Platform</title>
  <style>
    body { margin:0; padding:0; background:#0a0f0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .wrapper { max-width:620px; margin:40px auto; background:#0f1a0f; border:1px solid #1a3a1a; border-radius:16px; overflow:hidden; }
    .accent-bar { height:4px; background:linear-gradient(90deg,#22c55e 0%,#16a34a 50%,#22c55e 100%); }
    .header { padding:32px 40px 24px; border-bottom:1px solid #1a3a1a; }
    .logo-text { font-size:20px; font-weight:700; color:#f0fdf4; letter-spacing:-0.5px; }
    .logo-text span { color:#22c55e; }
    .logo-sub { font-size:9px; color:#4ade80; letter-spacing:3px; text-transform:uppercase; font-family:'Courier New',monospace; margin-top:2px; }
    .body { padding:36px 40px; }
    h1 { font-size:22px; font-weight:700; color:#f0fdf4; margin:0 0 12px; }
    h2 { font-size:15px; font-weight:600; color:#4ade80; margin:28px 0 10px; text-transform:uppercase; letter-spacing:1px; }
    p { font-size:15px; line-height:1.6; color:#86efac; margin:0 0 16px; }
    .key-box { background:#0a1a0a; border:1px solid #22c55e; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .key-label { font-size:11px; color:#4ade80; letter-spacing:2px; text-transform:uppercase; font-family:'Courier New',monospace; margin-bottom:8px; }
    .key-value { font-size:14px; color:#f0fdf4; font-family:'Courier New',monospace; word-break:break-all; background:#061006; padding:10px 14px; border-radius:6px; border:1px solid #1a3a1a; }
    .warning { background:#1a1000; border:1px solid #3a2a00; border-radius:8px; padding:12px 16px; margin:16px 0; font-size:13px; color:#fbbf24; }
    .code-block { background:#061006; border:1px solid #1a3a1a; border-radius:8px; padding:14px 16px; margin:12px 0; font-size:12px; color:#4ade80; font-family:'Courier New',monospace; white-space:pre-wrap; word-break:break-all; }
    .scope-list { list-style:none; padding:0; margin:8px 0; }
    .btn { display:inline-block; padding:12px 28px; background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%); color:#0a0f0a !important; text-decoration:none; border-radius:10px; font-weight:700; font-size:14px; margin:4px 8px 4px 0; }
    .btn-outline { background:transparent; border:1px solid #22c55e; color:#22c55e !important; }
    .footer { padding:20px 40px 28px; border-top:1px solid #1a3a1a; }
    .footer p { font-size:12px; color:#166534; margin:0 0 6px; }
    .footer a { color:#22c55e; text-decoration: none; }
    .badge-row { display:flex; gap:16px; margin-top:16px; }
    .badge { font-size:9px; color:#166534; letter-spacing:2px; text-transform:uppercase; font-family:'Courier New',monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="accent-bar"></div>
    <div class="header">
      <div class="logo-text">Circul<span>-AI-</span>r</div>
      <div class="logo-sub">Battery Intelligence Platform · Developer Edition</div>
    </div>
    <div class="body">
      <h1>Welcome to the API, ${name || "Developer"}!</h1>
      <p>Your API key <strong>"${keyName}"</strong> has been issued. This is the only time the full key will be shown — store it securely in your secrets manager.</p>
      <h2>Your API Key</h2>
      <div class="key-box">
        <div class="key-label">Bearer Token</div>
        <div class="key-value">${apiKey}</div>
      </div>
      <div class="warning">⚠ Never commit this key to source control. Rotate it immediately from the Developer Portal if it is ever exposed.</div>
      <h2>Granted Scopes</h2>
      <ul class="scope-list">${scopeList}</ul>
      <h2>Quickstart — REST API</h2>
      <div class="code-block">${jsSnippet}</div>
      <h2>Quickstart — MCP (Claude / Cursor)</h2>
      <div class="code-block">${curlSnippet}</div>
      <h2>Next Steps</h2>
      <p>
        <a href="${origin}/api-reference" class="btn">API Reference</a>
        <a href="${origin}/mcp-server" class="btn btn-outline">MCP Server Docs</a>
        <a href="${origin}/developer-portal" class="btn btn-outline">Developer Portal</a>
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by Circul-AI-r Battery Intelligence Platform.</p>
      <p>Questions? <a href="mailto:support@circulair.energy">support@circulair.energy</a></p>
      <div class="badge-row">
        <span class="badge">Encrypted</span>
        <span class="badge">ISO 27001</span>
        <span class="badge">SOC 2</span>
        <span class="badge">GDPR</span>
      </div>
    </div>
  </div>
</body>
</html>`;
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

— Circul-AI-r Battery Intelligence Platform`;
}

export async function sendDeveloperOnboardingEmail(
  params: DeveloperOnboardingEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await sendViaZeptoAPI({
      from: { address: ENV.fromEmail, name: "Circul-AI-r Developers" },
      to: [{ email_address: { address: params.to, name: params.name || params.to } }],
      reply_to: [{ address: ENV.fromEmail, name: "Circul-AI-r Developers" }],
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
