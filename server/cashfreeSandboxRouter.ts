import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { CashfreeSandboxError, createCashfreeSandbox } from "./cashfreeSandbox";

/** Direct provider test only: no DB, sale, ownership, balance or credit writes. */
export function createCashfreeSandboxRouter(service = createCashfreeSandbox({
  getConfig: () => ({
    enabled: process.env.CASHFREE_SANDBOX_ENABLED,
    mode: process.env.CASHFREE_MODE,
    clientId: process.env.CASHFREE_TEST_CLIENT_ID,
    clientSecret: process.env.CASHFREE_TEST_CLIENT_SECRET,
    allowedUserIds: process.env.CASHFREE_SANDBOX_ALLOWED_USER_IDS,
  }),
})) {
  // Finite, process-local abuse protection for the single-instance sandbox.
  // This is not a durable idempotency ledger or a distributed financial limit.
  const windows = new Map<string, { start: number; count: number }>();
  function limit(userId: number, operation: "create" | "verify") {
    const now = Date.now();
    windows.forEach((entry, key) => {
      if (now - entry.start >= 60_000) windows.delete(key);
    });
    const key = `${userId}:${operation}`;
    let entry = windows.get(key);
    if (!entry) {
      if (windows.size >= 1_000) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Sandbox payment rate limit reached. Try again later." });
      }
      entry = { start: now, count: 0 };
      windows.set(key, entry);
    }
    const maximum = operation === "create" ? 3 : 12;
    if (entry.count >= maximum) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Sandbox payment rate limit reached. Try again later." });
    }
    entry.count += 1;
  }

  async function safe<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CashfreeSandboxError) {
        const code = {
          UNAVAILABLE: "PRECONDITION_FAILED",
          INVALID_INPUT: "BAD_REQUEST",
          FORBIDDEN: "FORBIDDEN",
          EXPIRED: "PRECONDITION_FAILED",
          PROVIDER_UNAVAILABLE: "SERVICE_UNAVAILABLE",
          INVALID_PROVIDER_RESPONSE: "BAD_GATEWAY",
        } as const;
        throw new TRPCError({ code: code[error.code], message: error.message });
      }
      // Never attach a raw provider exception, header, context or customer payload.
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sandbox payment request could not be completed." });
    }
  }

  return router({
    status: protectedProcedure.query(({ ctx }) => safe(() => service.status(ctx.user.id))),
    createOrder: protectedProcedure
      .input(z.undefined())
      .mutation(({ ctx }) => {
        limit(ctx.user.id, "create");
        return safe(() => service.createOrder(ctx.user.id));
      }),
    verify: protectedProcedure
      .input(z.object({
        context: z.string().min(16).max(4096),
        orderId: z.string().min(3).max(45).regex(/^[A-Za-z0-9_-]+$/),
      }).strict())
      .mutation(({ ctx, input }) => {
        limit(ctx.user.id, "verify");
        return safe(() => service.verify(ctx.user.id, input));
      }),
  });
}
