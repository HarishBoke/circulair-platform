/**
 * email.test.ts
 *
 * Tests for the ZeptoMail email helper (server/email.ts).
 * The global fetch is mocked so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock ENV so ZEPTOMAIL_TOKEN and FROM_EMAIL are always present ─────────────
vi.mock("./_core/env", () => ({
  ENV: {
    zeptomailToken: "Zoho-enczapikey PHtE6r0_test_token",
    fromEmail: "noreply@circulair.energy",
    ownerEmail: "owner@circulair.energy",
    ownerName: "Platform Owner",
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

// ─── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeOkResponse(body: object) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function makeErrorResponse(status: number, errorMsg: string) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { details: [{ message: errorMsg }] } }),
  } as Response);
}

import { sendPasswordResetEmail, sendDeveloperOnboardingEmail, validateEmailConfig } from "./email";

// ─── validateEmailConfig ──────────────────────────────────────────────────────
describe("validateEmailConfig", () => {
  it("returns true when both ZEPTOMAIL_TOKEN and FROM_EMAIL are set", () => {
    expect(validateEmailConfig()).toBe(true);
  });
});

// ─── sendPasswordResetEmail ───────────────────────────────────────────────────
describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ZeptoMail with correct to, from, subject, htmlbody, and textbody fields", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_abc123" }));

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://circulair.energy/reset-password?token=abc",
      "Alice",
      15
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("req_abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("zeptomail.in");
    const body = JSON.parse(opts.body);
    expect(body.to[0].email_address.address).toBe("user@example.com");
    expect(body.from.address).toBe("noreply@circulair.energy");
    expect(body.subject).toMatch(/reset.*password/i);
    expect(body.htmlbody).toContain("https://circulair.energy/reset-password?token=abc");
    expect(body.textbody).toContain("https://circulair.energy/reset-password?token=abc");
  });

  it("includes the user name in the email body", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_xyz" }));

    await sendPasswordResetEmail(
      "bob@example.com",
      "https://example.com/reset?token=xyz",
      "Bob",
      15
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlbody).toContain("Bob");
    expect(body.textbody).toContain("Bob");
  });

  it("uses 'there' as fallback when name is empty", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_noname" }));

    await sendPasswordResetEmail(
      "anon@example.com",
      "https://example.com/reset?token=noname",
      "",
      15
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.textbody).toContain("Hi there");
  });

  it("returns success: false when fetch throws an exception", async () => {
    mockFetch.mockRejectedValue(new Error("Network timeout"));

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=throw",
      "User",
      15
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/network timeout/i);
  });

  it("includes the expiry duration in the email body", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_expiry" }));

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=expiry",
      "User",
      30
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlbody).toContain("30");
    expect(body.textbody).toContain("30 minutes");
  });

  it("includes both HTML and plain-text versions", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_both" }));

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=both",
      "User",
      15
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlbody).toBeTruthy();
    expect(body.textbody).toBeTruthy();
    expect(body.htmlbody).not.toBe(body.textbody);
  });

  it("returns success: false when ZeptoMail returns a non-OK HTTP status", async () => {
    mockFetch.mockReturnValue(makeErrorResponse(401, "Invalid API Token"));

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=err",
      "User",
      15
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid API Token");
  });
});

// ─── sendDeveloperOnboardingEmail ─────────────────────────────────────────────
describe("sendDeveloperOnboardingEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with API key in body", async () => {
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req_dev_123" }));

    const result = await sendDeveloperOnboardingEmail({
      to: "dev@example.com",
      name: "Bob",
      apiKey: "sk-test-key-xyz",
      keyName: "Production Key",
      permissions: ["batteries:read", "telemetry:write"],
      origin: "https://circulair.energy",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("req_dev_123");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to[0].email_address.address).toBe("dev@example.com");
    expect(body.htmlbody).toContain("sk-test-key-xyz");
    expect(body.htmlbody).toContain("Production Key");
    expect(body.subject).toContain("Production Key");
  });
});
