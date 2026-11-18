import { afterEach, describe, expect, it, vi } from "vitest";
import { createCashfreeSandboxRouter } from "./cashfreeSandboxRouter";
import { createCashfreeSandbox } from "./cashfreeSandbox";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(id: number | null): TrpcContext {
  return {
    user: id === null ? null : {
      id, openId: `test-owner-${id}`, email: `test-${id}@example.invalid`,
      name: "Isolated test", role: "user", loginMethod: "email",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function fixture() {
  const service = createCashfreeSandbox({ getConfig: () => ({}) });
  const status = vi.spyOn(service, "status");
  const createOrder = vi.spyOn(service, "createOrder").mockRejectedValue(new Error("PRIVATE_PROVIDER_DETAIL"));
  const verify = vi.spyOn(service, "verify").mockRejectedValue(new Error("PRIVATE_PROVIDER_DETAIL"));
  return { status, createOrder, verify, mounted: createCashfreeSandboxRouter(service) };
}

afterEach(() => vi.restoreAllMocks());

describe("Cashfree sandbox real router dispatch", () => {
  it("requires authentication before all adapter methods", async () => {
    const f = fixture(); const caller = f.mounted.createCaller(context(null));
    await expect(caller.status()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.createOrder()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.verify({ context: "opaque-context-for-test", orderId: "cftest_order" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(f.status).not.toHaveBeenCalled(); expect(f.createOrder).not.toHaveBeenCalled(); expect(f.verify).not.toHaveBeenCalled();
  });
  it("dispatches default-off status on the actual central application router", async () => {
    vi.stubEnv("CASHFREE_SANDBOX_ENABLED", "false");
    try {
      const caller = appRouter.createCaller(context(1));
      expect(await caller.paymentSandbox.status()).toMatchObject({ enabled: false, provider: "cashfree", mode: "sandbox", amountMinor: 1000, currency: "INR", scope: "gateway-test-only" });
      await expect(caller.paymentSandbox.createOrder()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    } finally { vi.unstubAllEnvs(); }
  });
  it("does not accept client-controlled price or currency on create", async () => {
    const f = fixture(); const caller = f.mounted.createCaller(context(1));
    // Intentionally adversarial wire input: runtime Zod, not TS, must reject it.
    await expect(caller.createOrder({ amount: 1, currency: "USD" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(f.createOrder).not.toHaveBeenCalled();
  });
  it.each([
    { context: "opaque-context-for-test", orderId: "../../../other" },
    { context: "opaque-context-for-test", orderId: "https://api.cashfree.com/pg/orders" },
    { context: "x".repeat(4097), orderId: "cftest_order" },
    { context: "short", orderId: "cftest_order" },
    { context: "opaque-context-for-test", orderId: "cftest_order", amount: 1 },
  ])("rejects malformed or extra verification inputs before adapter dispatch %#", async input => {
    const f = fixture();
    await expect(f.mounted.createCaller(context(1)).verify(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(f.verify).not.toHaveBeenCalled();
  });
  it("forwards authenticated user identity rather than a client user ID", async () => {
    const f = fixture();
    await expect(f.mounted.createCaller(context(23)).verify({ context: "opaque-context-for-test", orderId: "cftest_order" })).rejects.toThrow("Sandbox payment request could not be completed.");
    expect(f.verify).toHaveBeenCalledWith(23, { context: "opaque-context-for-test", orderId: "cftest_order" });
  });
  it("sanitizes unexpected provider failures and omits raw causes", async () => {
    const f = fixture();
    try { await f.mounted.createCaller(context(1)).createOrder(); } catch (error) {
      expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Sandbox payment request could not be completed." });
      expect(String(error)).not.toContain("PRIVATE_PROVIDER_DETAIL");
      expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
    }
  });
  it("limits each user to three create operations per minute, not just each HTTP batch", async () => {
    const f = fixture(); const caller = f.mounted.createCaller(context(1));
    for (let i = 0; i < 3; i++) await expect(caller.createOrder()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    await expect(caller.createOrder()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(f.createOrder).toHaveBeenCalledTimes(3);
    await expect(f.mounted.createCaller(context(2)).createOrder()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(f.createOrder).toHaveBeenCalledTimes(4);
  });
  it("limits verification independently to twelve operations per user", async () => {
    const f = fixture(); const caller = f.mounted.createCaller(context(1));
    for (let i = 0; i < 12; i++) await expect(caller.verify({ context: "opaque-context-for-test", orderId: "cftest_order" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    await expect(caller.verify({ context: "opaque-context-for-test", orderId: "cftest_order" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(f.verify).toHaveBeenCalledTimes(12);
    await expect(caller.createOrder()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
