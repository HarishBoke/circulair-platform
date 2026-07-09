/**
 * zeptomail.test.ts
 *
 * Validates that ZeptoMail credentials are configured and the email helper
 * functions are properly wired to the ZeptoMail SDK.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEmailConfig } from "./email";

// ── Mock ENV so tests don't depend on real secrets ────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    zeptomailToken: "test-zepto-token-abc123",
    fromEmail: "noreply@circulair.energy",
    resendApiKey: "",
    resendFromEmail: "noreply@circulair.energy",
    ownerEmail: "owner@circulair.energy",
    ownerName: "Platform Owner",
  },
}));

// ── Mock zeptomail SDK ────────────────────────────────────────────────────────
const mockSendMail = vi.fn().mockResolvedValue({ request_id: "req-test-123", message: "OK" });

vi.mock("zeptomail", () => ({
  SendMailClient: vi.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

describe("ZeptoMail email configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validateEmailConfig returns true when ZEPTOMAIL_TOKEN and FROM_EMAIL are set", () => {
    expect(validateEmailConfig()).toBe(true);
  });

  it("sendPasswordResetEmail calls SendMailClient.sendMail with correct shape", async () => {
    const { sendPasswordResetEmail } = await import("./email");
    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://circulair.energy/reset?token=abc",
      "Alice"
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("req-test-123");
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.from.address).toBe("noreply@circulair.energy");
    expect(call.to[0].email_address.address).toBe("user@example.com");
    expect(call.subject).toContain("Reset your Circul-AI-r password");
    expect(call.htmlbody).toContain("Reset Password");
    expect(call.textbody).toContain("Alice");
  });

  it("sendDeveloperOnboardingEmail calls SendMailClient.sendMail with API key in body", async () => {
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
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to[0].email_address.address).toBe("dev@example.com");
    expect(call.htmlbody).toContain("sk-test-key-xyz");
    expect(call.htmlbody).toContain("Production Key");
    expect(call.subject).toContain("Production Key");
  });

  it("sendPasswordResetEmail returns success:false and error message when SDK throws", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("Invalid token"));
    const { sendPasswordResetEmail } = await import("./email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid token");
  });

  it("notification.ts notifyOwner uses ZeptoMail when zeptomailToken is set", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ok = await notifyOwner({ title: "Test Alert", content: "This is a test notification." });
    expect(ok).toBe(true);
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain("Test Alert");
    expect(call.htmlbody).toContain("This is a test notification.");
  });
});
