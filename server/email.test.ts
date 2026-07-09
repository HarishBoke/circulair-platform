/**
 * email.test.ts
 *
 * Tests for the ZeptoMail email helper (server/email.ts).
 * The ZeptoMail SDK is mocked so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the ZeptoMail SDK ───────────────────────────────────────────────────
const mockSendMail = vi.fn();
vi.mock("zeptomail", () => ({
  SendMailClient: vi.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

// ─── Mock ENV so ZEPTOMAIL_TOKEN and FROM_EMAIL are always present ─────────────
vi.mock("./_core/env", () => ({
  ENV: {
    zeptomailToken: "zepto_test_token_abc123",
    fromEmail: "noreply@circulair.energy",
    resendApiKey: "",
    resendFromEmail: "noreply@circulair.energy",
    ownerEmail: "owner@circulair.energy",
    ownerName: "Platform Owner",
  },
}));

import { sendPasswordResetEmail, validateEmailConfig } from "./email";

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
    mockSendMail.mockResolvedValue({ request_id: "req_abc123" });

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://circulair.energy/reset-password?token=abc",
      "Alice",
      15
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("req_abc123");

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.to[0].email_address.address).toBe("user@example.com");
    expect(callArgs.from.address).toBe("noreply@circulair.energy");
    expect(callArgs.subject).toMatch(/reset.*password/i);
    expect(callArgs.htmlbody).toContain("https://circulair.energy/reset-password?token=abc");
    expect(callArgs.textbody).toContain("https://circulair.energy/reset-password?token=abc");
  });

  it("includes the user name in the email body", async () => {
    mockSendMail.mockResolvedValue({ request_id: "req_xyz" });

    await sendPasswordResetEmail(
      "bob@example.com",
      "https://example.com/reset?token=xyz",
      "Bob",
      15
    );

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.htmlbody).toContain("Bob");
    expect(callArgs.textbody).toContain("Bob");
  });

  it("uses 'there' as fallback when name is empty", async () => {
    mockSendMail.mockResolvedValue({ request_id: "req_noname" });

    await sendPasswordResetEmail(
      "anon@example.com",
      "https://example.com/reset?token=noname",
      "",
      15
    );

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.textbody).toContain("Hi there");
  });

  it("returns success: false when ZeptoMail throws an exception", async () => {
    mockSendMail.mockRejectedValue(new Error("Network timeout"));

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
    mockSendMail.mockResolvedValue({ request_id: "req_expiry" });

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=expiry",
      "User",
      30
    );

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.htmlbody).toContain("30");
    expect(callArgs.textbody).toContain("30 minutes");
  });

  it("includes both HTML and plain-text versions", async () => {
    mockSendMail.mockResolvedValue({ request_id: "req_both" });

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=both",
      "User",
      15
    );

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.htmlbody).toBeTruthy();
    expect(callArgs.textbody).toBeTruthy();
    expect(callArgs.htmlbody).not.toBe(callArgs.textbody);
  });
});
