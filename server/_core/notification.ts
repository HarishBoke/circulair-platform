/**
 * Owner Notifications — ZeptoMail REST API implementation (direct fetch, no SDK)
 *
 * Primary: ZeptoMail REST API to OWNER_EMAIL (ZEPTOMAIL_TOKEN required)
 * Fallback: Manus Forge SendNotification webhook (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *           — used automatically when deployed on Manus hosting without ZeptoMail token
 */

import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;
const ZEPTO_API_URL = "https://api.zeptomail.in/v1.1/email";

// Circul-AI-r logo as base64 data URI — inlined for email client compatibility
const LOGO_DATA_URI =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTc4IiBoZWlnaHQ9IjE3OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIj4KCiA8Zz4KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgPHBhdGggaWQ9InN2Z18xIiBmaWxsPSIjMDBjNTg5IiBkPSJtMTIwLjUsMTIxLjVjLTguNTcyLDguNTcxIC0xOSwxMi43MTQgLTMyLjAwMDEsMTIuNzE0Yy0xMywwIC0yMy40Mjg2LC00LjE0MyAtMzIuMDAwMSwtMTIuNzE0Yy01Ljc4NTcsLTUuNzg2IC05LjM1NzEsLTEzIC0xMS4yODU3LC0yMWwtNDQuNzE0MjIsMGMyLjIxNDI4LDIxLjIxNCAxMC40OTk5MiwzOC42NDMgMjQuODU3MTIsNTIuNDI5YzE3LjM1NzEsMTYuNTcxIDM4LjM1NzEsMjQuODU3IDYzLjE0MjksMjQuODU3YzI0Ljc4NjEsMCA0NS41MDAxLC04LjI4NiA2Mi45MjgxLC0yNC44NTdjMTQuNjQzLC0xMy43ODYgMjIuOTI5LC0zMS40MjkgMjUuMDcyLC01Mi40MjlsLTQ0LjcxNCwwYy0xLjkyOSw4IC01LjUsMTUuMTQzIC0xMS4yODYsMjF6Ii8+CiAgPHBhdGggaWQ9InN2Z18yIiBmaWxsPSJ3aGl0ZSIgZD0ibTU2Ljc4NTYsNTYuNjQzYzguNTcxNCwtOC4yODU4IDE5LC0xMi43MTQzIDMxLjcxNDIsLTEyLjcxNDNjMTIuNzE0MiwwIDIzLjE0MzIsNC4xNDI4IDMxLjcxNDIsMTIuNzE0M2M3LjcxNCw3LjcxNDIgMTIuMTQzLDE3LjM1NzEgMTIuNzE0LDI4LjcxNDJsNDQuMTQzLDBjLTAuNTcxLC0yNC41NzE0IC05LjA3MSwtNDUgLTI1LjY0MywtNjAuNzE0MmMtMTcuMDcxLC0xNi4yODU3NiAtMzcuNzg1LC0yNC41NzE0NyAtNjIuOTI4MiwtMjQuNTcxNDdjLTI1LjE0MjgsMCAtNDYuMDcxNCw4LjI4NTcxIC02My4xNDI4LDI0LjU3MTQ3Yy0xNi4yODU3MywxNS43MTQyIC0yNC44NTcxMiwzNS44NTcxIC0yNS4zNTcxMiw2MC43MTQybDQ0LjE0MjgyLDBjMC41NzE1LC0xMS4yODU3IDQuNzE0MywtMjEgMTIuNzE0MywtMjguNzE0MmwtMC4wNzE0LDB6Ii8+CiA8L2c+Cjwvc3ZnPg==";

function validatePayload(input: NotificationPayload): NotificationPayload {
  if (!input.title?.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!input.content?.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }
  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Title must be at most ${TITLE_MAX_LENGTH} characters.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  }
  return { title, content };
}

function buildNotificationHtml(title: string, content: string): string {
  const year = new Date().getFullYear();
  const contentHtml = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #07100a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { background-color: #07100a; padding: 32px 16px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #0d1f12; border: 1px solid #1c3d22; border-radius: 16px; overflow: hidden; }
    .accent { height: 3px; background: linear-gradient(90deg, #00c589 0%, #22c55e 50%, #00c589 100%); }
    .header { padding: 24px 36px; border-bottom: 1px solid #1c3d22; }
    .logo-name { font-size: 17px; font-weight: 700; color: #f0fdf4; letter-spacing: -0.5px; }
    .logo-name span { color: #00c589; }
    .logo-tag { font-size: 8px; color: #4ade80; letter-spacing: 3px; text-transform: uppercase; font-family: 'Courier New', monospace; margin-top: 2px; }
    .alert-badge { display: inline-block; font-size: 9px; color: #fbbf24; background: #1a1200; border: 1px solid #3d2e00; border-radius: 4px; padding: 2px 8px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Courier New', monospace; margin-bottom: 12px; }
    .body { padding: 32px 36px; }
    h2 { font-size: 20px; font-weight: 700; color: #f0fdf4; margin: 0 0 20px; line-height: 1.3; }
    .content-box { background: #061209; border: 1px solid #1c3d22; border-left: 3px solid #00c589; border-radius: 8px; padding: 18px 20px; font-size: 14px; line-height: 1.7; color: #86efac; }
    .footer { padding: 18px 36px 24px; border-top: 1px solid #1c3d22; }
    .footer p { font-size: 11px; color: #1c5c35; margin: 0 0 4px; }
    .footer a { color: #00c589; text-decoration: none; }
    .badge { display: inline-block; font-size: 9px; color: #1c5c35; letter-spacing: 2px; text-transform: uppercase; font-family: 'Courier New', monospace; margin-right: 12px; }
    @media only screen and (max-width: 600px) {
      .header, .body, .footer { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="accent"></div>
      <div class="header">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right:10px;">
              <img src="${LOGO_DATA_URI}" alt="Circul-AI-r" width="32" height="32" style="display:block;width:32px;height:32px;" />
            </td>
            <td valign="middle">
              <div class="logo-name">Circul<span>-AI-</span>r</div>
              <div class="logo-tag">Battery Intelligence Platform</div>
            </td>
          </tr>
        </table>
      </div>
      <div class="body">
        <div class="alert-badge">Platform Alert</div>
        <h2>${title}</h2>
        <div class="content-box">${contentHtml}</div>
      </div>
      <div class="footer">
        <p>Sent by Circul-AI-r Platform notification system &nbsp;·&nbsp; <a href="https://circulair.energy/">circulair.energy</a></p>
        <div style="margin-top:12px;">
          <span class="badge">Encrypted</span>
          <span class="badge">ISO 27001</span>
          <span class="badge">GDPR</span>
        </div>
        <p style="margin-top:10px;">© ${year} Circul-AI-r</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── ZeptoMail REST API implementation ─────────────────────────────────────────

async function notifyViaZeptoMail(payload: NotificationPayload): Promise<boolean> {
  const ownerEmail = ENV.ownerEmail || ENV.fromEmail;
  if (!ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL not set — cannot send owner notification email");
    return false;
  }
  try {
    const response = await fetch(ZEPTO_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        // Token already contains the full "Zoho-enczapikey ..." prefix — pass as-is
        "Authorization": ENV.zeptomailToken,
      },
      body: JSON.stringify({
        from: { address: ENV.fromEmail, name: "Circul-AI-r Platform" },
        to: [{ email_address: { address: ownerEmail, name: ENV.ownerName || "Platform Owner" } }],
        subject: `[Platform Alert] ${payload.title}`,
        htmlbody: buildNotificationHtml(payload.title, payload.content),
        textbody: `${payload.title}\n\n${payload.content}`,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = (data as any)?.error?.details?.[0]?.message
        ?? (data as any)?.error?.message
        ?? `HTTP ${response.status}`;
      console.warn(`[Notification] ZeptoMail API error: ${errMsg}`);
      return false;
    }

    console.log(`[Notification] ZeptoMail email sent to ${ownerEmail} (request_id: ${(data as any)?.request_id ?? ""})`);
    return true;
  } catch (err) {
    console.warn("[Notification] ZeptoMail exception:", err);
    return false;
  }
}

// ── Manus Forge fallback ──────────────────────────────────────────────────────

async function notifyViaForge(payload: NotificationPayload): Promise<boolean> {
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const endpoint = new URL("webdevtoken.v1.WebDevService/SendNotification", baseUrl).toString();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title: payload.title, content: payload.content }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Notification] Forge failed (${response.status})${detail ? `: ${detail}` : ""}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Notification] Forge exception:", err);
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a notification to the platform owner.
 * Returns true on success, false on failure (callers should handle gracefully).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const validated = validatePayload(payload);

  // Prefer ZeptoMail when token is configured
  if (ENV.zeptomailToken) {
    return notifyViaZeptoMail(validated);
  }
  // Fallback to Manus Forge when on Manus hosting
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    return notifyViaForge(validated);
  }

  console.warn("[Notification] No notification transport configured (set ZEPTOMAIL_TOKEN or BUILT_IN_FORGE_API_KEY)");
  return false;
}
