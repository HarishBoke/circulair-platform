/**
 * email.test.ts
 *
 * Tests for the Resend email helper (server/email.ts).
 * The Resend SDK is mocked so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the Resend SDK ──────────────────────────────────────────────────────
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

// ─── Mock ENV so RESEND_API_KEY is always present ─────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "re_test_key_123",
    resendFromEmail: "noreply@circulair.energy",
  },
}));

import { sendPasswordResetEmail, validateResendConfig } from "./email";

// ─── validateResendConfig ─────────────────────────────────────────────────────
describe("validateResendConfig", () => {
  it("returns true when both RESEND_API_KEY and RESEND_FROM_EMAIL are set", () => {
    expect(validateResendConfig()).toBe(true);
  });
});

// ─── sendPasswordResetEmail ───────────────────────────────────────────────────
describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Resend with correct to, from, subject, html, and text fields", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_abc123" }, error: null });

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://circulair.energy/reset-password?token=abc",
      "Alice",
      15
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_abc123");

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toContain("user@example.com");
    expect(callArgs.from).toContain("noreply@circulair.energy");
    expect(callArgs.subject).toMatch(/reset.*password/i);
    expect(callArgs.html).toContain("https://circulair.energy/reset-password?token=abc");
    expect(callArgs.text).toContain("https://circulair.energy/reset-password?token=abc");
  });

  it("includes the user name in the email body", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_xyz" }, error: null });

    await sendPasswordResetEmail(
      "bob@example.com",
      "https://example.com/reset?token=xyz",
      "Bob",
      15
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("Bob");
    expect(callArgs.text).toContain("Bob");
  });

  it("uses 'there' as fallback when name is empty", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_noname" }, error: null });

    await sendPasswordResetEmail(
      "anon@example.com",
      "https://example.com/reset?token=noname",
      "",
      15
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.text).toContain("Hi there");
  });

  it("returns success: false and error message when Resend returns an error", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "validation_error" },
    });

    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=fail",
      "User",
      15
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid api key/i);
  });

  it("returns success: false when Resend throws an exception", async () => {
    mockSend.mockRejectedValue(new Error("Network timeout"));

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
    mockSend.mockResolvedValue({ data: { id: "msg_expiry" }, error: null });

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=expiry",
      "User",
      30
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("30");
    expect(callArgs.text).toContain("30 minutes");
  });

  it("includes both HTML and plain-text versions", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_both" }, error: null });

    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=both",
      "User",
      15
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toBeTruthy();
    expect(callArgs.text).toBeTruthy();
    expect(callArgs.html).not.toBe(callArgs.text);
  });
});
