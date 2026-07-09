/**
 * Owner Notifications — ZeptoMail email implementation
 *
 * Primary: ZeptoMail email to OWNER_EMAIL (ZEPTOMAIL_TOKEN required)
 * Fallback: Manus Forge SendNotification webhook (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *           — used automatically when deployed on Manus hosting without ZeptoMail token
 */

import { TRPCError } from "@trpc/server";
import { SendMailClient } from "zeptomail";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

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

// ── ZeptoMail email implementation ────────────────────────────────────────────

async function notifyViaZeptoMail(payload: NotificationPayload): Promise<boolean> {
  const ownerEmail = ENV.ownerEmail || ENV.fromEmail;
  if (!ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL not set — cannot send owner notification email");
    return false;
  }
  try {
    const client = new SendMailClient({
      url: "api.zeptomail.com/",
      token: ENV.zeptomailToken,
    });
    await client.sendMail({
      from: { address: ENV.fromEmail, name: "Circul-AI-r Platform" },
      to: [{ email_address: { address: ownerEmail, name: ENV.ownerName || "Platform Owner" } }],
      subject: `[Platform Alert] ${payload.title}`,
      htmlbody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #10b981; margin-bottom: 8px;">${payload.title}</h2>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
            ${payload.content.replace(/\n/g, "<br>")}
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
            Sent by Circul-AI-r Platform notification system
          </p>
        </div>
      `,
      textbody: `${payload.title}\n\n${payload.content}`,
    });
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
