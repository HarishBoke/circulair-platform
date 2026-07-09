/**
 * zeptomail.test.ts
 *
 * Validates that ZeptoMail credentials are configured and the email helper
 * functions are properly wired to the ZeptoMail REST API via fetch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEmailConfig } from "./email";

// ── Mock ENV so tests don't depend on real secrets ────────────────────────────
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

// ── Mock global fetch ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeOkResponse(body: object) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("ZeptoMail email configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(makeOkResponse({ request_id: "req-test-123", message: "OK" }));
  });

  it("validateEmailConfig returns true when ZEPTOMAIL_TOKEN and FROM_EMAIL are set", () => {
    expect(validateEmailConfig()).toBe(true);
  });

  it("sendPasswordResetEmail calls fetch with correct shape", async () => {
    const { sendPasswordResetEmail } = await import("./email");
    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://circulair.energy/reset?token=abc",
      "Alice"
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("req-test-123");
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("zeptomail.in");
    const body = JSON.parse(opts.body);
    expect(body.from.address).toBe("noreply@circulair.energy");
    expect(body.to[0].email_address.address).toBe("user@example.com");
    expect(body.subject).toContain("Reset your Circul-AI-r password");
    expect(body.htmlbody).toContain("Reset Password");
    expect(body.textbody).toContain("Alice");
  });

  it("sendDeveloperOnboardingEmail calls fetch with API key in body", async () => {
    const { sendDeveloperOnboardingEmail } = await import("./email");
    const result = await sendDeveloperOnboardingEmail({
      to: "dev@example.com",
      name: "Bob",
      apiKey: "sk-test-key-xyz",
      keyName: "Production Key",
      permissions: ["batteries:read", "telemetry:write"],
      origin: "https://circulair.energy",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to[0].email_address.address).toBe("dev@example.com");
    expect(body.htmlbody).toContain("sk-test-key-xyz");
    expect(body.htmlbody).toContain("Production Key");
    expect(body.subject).toContain("Production Key");
  });

  it("sendPasswordResetEmail returns success:false and error message when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Invalid token"));
    const { sendPasswordResetEmail } = await import("./email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid token");
  });

  it("notification.ts notifyOwner uses ZeptoMail fetch when zeptomailToken is set", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ok = await notifyOwner({ title: "Test Alert", content: "This is a test notification." });
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("zeptomail.in");
    const body = JSON.parse(opts.body);
    expect(body.subject).toContain("Test Alert");
    expect(body.htmlbody).toContain("This is a test notification.");
  });
});
