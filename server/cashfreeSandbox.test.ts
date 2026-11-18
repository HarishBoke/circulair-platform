import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CashfreeSandboxError,
  createCashfreeSandbox,
  type CashfreeSandboxConfig,
  type CashfreeSandboxOrder,
} from "./cashfreeSandbox";

// Synthetic credentials only. Every provider request goes to this local mock.
const CONFIG: CashfreeSandboxConfig = Object.freeze({
  enabled: "true",
  mode: "sandbox",
  clientId: "offline_client_12345",
  clientSecret: "offline-test-secret-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890",
  allowedUserIds: "7,9",
});
const START = Date.parse("2026-11-18T07:00:00.000Z");
const COMMON = {
  mode: "sandbox",
  provider: "cashfree",
  amountMinor: 1000,
  currency: "INR",
  scope: "gateway-test-only",
};
type JsonRecord = Record<string, unknown>;
function json(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}
function setup(overrides: Partial<CashfreeSandboxConfig> = {}) {
  let config: CashfreeSandboxConfig = Object.freeze({
    ...CONFIG,
    ...overrides,
  });
  let time = START;
  let uuidIndex = 0;
  let created: JsonRecord | undefined;
  let orderPatch: JsonRecord = {};
  let payments: unknown = [];
  let refunds: unknown = [];
  let postResponse: ((order: JsonRecord) => unknown) | undefined;
  const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string) as JsonRecord;
      created = {
        ...body,
        entity: "order",
        cf_order_id: "123456789",
        order_status: "ACTIVE",
        payment_session_id: "session_offline_test_1234567890",
      };
      return json(postResponse ? postResponse(created) : created);
    }
    if (!created)
      throw new Error("Offline mock received GET without a created order");
    if (String(url).endsWith("/payments")) return json(payments);
    if (String(url).endsWith("/refunds")) return json(refunds);
    return json({ ...created, ...orderPatch });
  });
  const randomUUID = vi.fn(
    () => `00000000-0000-4000-8000-${String(++uuidIndex).padStart(12, "0")}`
  );
  const adapter = createCashfreeSandbox({
    getConfig: () => config,
    fetchImpl,
    now: () => time,
    randomUUID,
  });
  return {
    adapter,
    fetchImpl,
    randomUUID,
    setConfig: (patch: Partial<CashfreeSandboxConfig>) => {
      config = Object.freeze({ ...config, ...patch });
    },
    setTime: (value: number) => {
      time = value;
    },
    setOrder: (patch: JsonRecord) => {
      orderPatch = patch;
    },
    setPayments: (value: unknown) => {
      payments = value;
    },
    setRefunds: (value: unknown) => {
      refunds = value;
    },
    setPost: (callback: (order: JsonRecord) => unknown) => {
      postResponse = callback;
    },
  };
}
function payment(
  order: CashfreeSandboxOrder,
  patch: JsonRecord = {}
): JsonRecord {
  return {
    entity: "payment",
    order_id: order.orderId,
    cf_payment_id: "987654321",
    order_amount: 10,
    order_currency: "INR",
    payment_amount: 10,
    payment_currency: "INR",
    payment_status: "SUCCESS",
    is_captured: true,
    ...patch,
  };
}
function refund(
  order: CashfreeSandboxOrder,
  patch: JsonRecord = {}
): JsonRecord {
  return {
    entity: "refund",
    order_id: order.orderId,
    cf_refund_id: "321654987",
    cf_payment_id: "987654321",
    refund_id: "offline_refund_1",
    refund_amount: 10,
    refund_currency: "INR",
    refund_status: "SUCCESS",
    ...patch,
  };
}
function signPayload(payload: unknown, secret = CONFIG.clientSecret!): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = createHmac("sha256", secret)
    .update("circulair/cashfree-sandbox/context-key/v1\0")
    .digest();
  const signature = createHmac("sha256", key)
    .update("circulair/cashfree-sandbox/context/v1\0")
    .update(encoded)
    .digest("base64url");
  return `cft1.${encoded}.${signature}`;
}
function decode(order: CashfreeSandboxOrder): JsonRecord {
  return JSON.parse(
    Buffer.from(order.context.split(".")[1], "base64url").toString("utf8")
  );
}
async function errorCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: "CashfreeSandboxError",
    code,
  });
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Cashfree sandbox configuration gate", () => {
  it("exposes the exact redacted status contract for an allowed user", () => {
    const s = setup();
    expect(s.adapter.status(7)).toEqual({
      ...COMMON,
      enabled: true,
      configured: true,
    });
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    ["disabled", { enabled: "false" }],
    ["missing enabled", { enabled: undefined }],
    ["uppercase enabled", { enabled: "TRUE" }],
    ["whitespace enabled", { enabled: " true" }],
    ["production", { mode: "production" }],
    ["live", { mode: "live" }],
    ["missing mode", { mode: undefined }],
    ["wrong case mode", { mode: "Sandbox" }],
    ["client ID absent", { clientId: undefined }],
    ["client ID short", { clientId: "short" }],
    ["client ID whitespace", { clientId: "offline client id" }],
    ["client ID newline", { clientId: "offline_id\nsecret" }],
    ["client ID non-ASCII", { clientId: "offline_id_é" }],
    ["client ID too long", { clientId: "x".repeat(257) }],
    ["secret absent", { clientSecret: undefined }],
    ["secret empty", { clientSecret: "" }],
    ["secret short", { clientSecret: "secret" }],
    ["secret weak", { clientSecret: "a".repeat(40) }],
    ["secret newline", { clientSecret: CONFIG.clientSecret + "\n" }],
    ["secret whitespace", { clientSecret: CONFIG.clientSecret + " " }],
    ["secret too long", { clientSecret: "abcdefghi".repeat(60) }],
    ["allowlist absent", { allowedUserIds: undefined }],
    ["allowlist empty", { allowedUserIds: "" }],
    ["allowlist zero", { allowedUserIds: "0,7" }],
    ["allowlist negative", { allowedUserIds: "-7" }],
    ["allowlist decimal", { allowedUserIds: "7.0" }],
    ["allowlist exponent", { allowedUserIds: "7e0" }],
    ["allowlist leading zero", { allowedUserIds: "07" }],
    ["allowlist leading plus", { allowedUserIds: "+7" }],
    ["allowlist spaces", { allowedUserIds: "7, 9" }],
    ["allowlist newline", { allowedUserIds: "7\n" }],
    ["allowlist trailing comma", { allowedUserIds: "7," }],
    ["allowlist empty field", { allowedUserIds: "7,,9" }],
    ["allowlist duplicate", { allowedUserIds: "7,7" }],
    ["allowlist unsafe", { allowedUserIds: "9007199254740992" }],
    ["allowlist too long", { allowedUserIds: "7,".repeat(3000) + "9" }],
  ] satisfies [string, Partial<CashfreeSandboxConfig>][])(
    "fails closed for %s",
    async (_, patch) => {
      const s = setup(patch);
      expect(s.adapter.status(7)).toEqual({
        ...COMMON,
        enabled: false,
        configured: false,
      });
      await errorCode(s.adapter.createOrder(7), "UNAVAILABLE");
      await errorCode(
        s.adapter.verify(7, { context: "invalid", orderId: "invalid" }),
        "UNAVAILABLE"
      );
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it.each([
    0,
    -1,
    7.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "7",
    null,
    undefined,
  ])("rejects invalid user ID %s without any provider calls", async id => {
    const s = setup();
    expect(s.adapter.status(id as number)).toEqual({
      ...COMMON,
      enabled: false,
      configured: false,
    });
    await errorCode(s.adapter.createOrder(id as number), "INVALID_INPUT");
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it("hides configuration for a valid but unlisted user", async () => {
    const s = setup();
    expect(s.adapter.status(8)).toEqual({
      ...COMMON,
      enabled: false,
      configured: false,
    });
    await errorCode(s.adapter.createOrder(8), "FORBIDDEN");
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it("accepts the largest positive safe integer exactly", async () => {
    const s = setup({ allowedUserIds: String(Number.MAX_SAFE_INTEGER) });
    expect(s.adapter.status(Number.MAX_SAFE_INTEGER).enabled).toBe(true);
    await s.adapter.createOrder(Number.MAX_SAFE_INTEGER);
    expect(s.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("sanitizes thrown configuration errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const adapter = createCashfreeSandbox({
      getConfig: () => {
        throw new Error("PRIVATE_CONFIG");
      },
      fetchImpl,
    });
    expect(adapter.status(7)).toEqual({
      ...COMMON,
      enabled: false,
      configured: false,
    });
    await expect(adapter.createOrder(7)).rejects.toThrow(
      "Sandbox payments are unavailable."
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Cashfree sandbox order creation", () => {
  it("uses only the pinned sandbox POST, integer-derived fixed amount and dummy non-PII customer", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    expect(order).toEqual({
      ...COMMON,
      orderId: "cftest_00000000-0000-4000-8000-000000000001",
      paymentSessionId: "session_offline_test_1234567890",
      context: expect.stringMatching(/^cft1\./),
      expiresAt: "2026-11-18T07:15:00.000Z",
    });
    const [url, init] = s.fetchImpl.mock.calls[0];
    expect(url).toBe("https://sandbox.cashfree.com/pg/orders");
    expect(init).toMatchObject({
      method: "POST",
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "x-client-id": CONFIG.clientId,
        "x-client-secret": CONFIG.clientSecret,
        "x-api-version": "2026-01-01",
        "x-idempotency-key": "00000000-0000-4000-8000-000000000003",
      },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init?.body as string)).toEqual({
      order_id: order.orderId,
      order_amount: 10,
      order_currency: "INR",
      customer_details: {
        customer_id: "cfcust_00000000-0000-4000-8000-000000000002",
        customer_phone: "9908734801",
      },
      order_note: "Gateway sandbox test only",
      order_tags: { scope: "gateway-test-only" },
      order_expiry_time: order.expiresAt,
    });
    expect(order.orderId.length).toBeLessThanOrEqual(45);
    expect(JSON.stringify(order)).not.toContain(CONFIG.clientSecret);
    expect(JSON.stringify(order)).not.toContain(CONFIG.clientId);
    const payload = decode(order);
    expect(payload).toMatchObject({
      ...COMMON,
      version: 1,
      userId: 7,
      orderId: order.orderId,
      cfOrderId: "123456789",
      opaqueCustomerId: "cfcust_00000000-0000-4000-8000-000000000002",
      issuedAt: START,
      expiresAt: START + 900000,
    });
    expect((payload.expiresAt as number) - (payload.issuedAt as number)).toBe(
      900000
    );
  });
  it("mints distinct order/customer/idempotency values across calls", async () => {
    const s = setup();
    const first = await s.adapter.createOrder(7);
    const second = await s.adapter.createOrder(7);
    expect(second.orderId).not.toBe(first.orderId);
    expect(decode(second).opaqueCustomerId).not.toBe(
      decode(first).opaqueCustomerId
    );
    expect(s.randomUUID).toHaveBeenCalledTimes(6);
    expect(s.fetchImpl.mock.calls[1][1]?.headers).not.toEqual(
      s.fetchImpl.mock.calls[0][1]?.headers
    );
  });
  it("does not accept client amount/currency/order parameters", async () => {
    const s = setup();
    const withExtra = s.adapter.createOrder as unknown as (
      id: number,
      input: unknown
    ) => Promise<CashfreeSandboxOrder>;
    await withExtra(7, {
      amountMinor: 1,
      currency: "USD",
      orderId: "attacker",
    });
    const body = JSON.parse(s.fetchImpl.mock.calls[0][1]?.body as string);
    expect(body.order_amount).toBe(10);
    expect(body.order_currency).toBe("INR");
    expect(body.order_id).toMatch(/^cftest_/);
  });
  it.each([
    ["order ID", { order_id: "foreign" }],
    ["entity", { entity: "payment" }],
    ["amount", { order_amount: 1000 }],
    ["fractional amount", { order_amount: 10.01 }],
    ["string amount", { order_amount: "10" }],
    ["currency", { order_currency: "USD" }],
    ["foreign customer", { customer_details: { customer_id: "foreign" } }],
    ["missing customer", { customer_details: undefined }],
    ["bad cf ID", { cf_order_id: "../x" }],
    ["unsafe numeric cf ID", { cf_order_id: Number.MAX_SAFE_INTEGER + 1 }],
    ["zero cf ID", { cf_order_id: 0 }],
    ["paid initial status", { order_status: "PAID" }],
    ["unknown status", { order_status: "NEW" }],
    ["missing session", { payment_session_id: undefined }],
    ["short session", { payment_session_id: "session" }],
    ["session newline", { payment_session_id: "session_offline_123\n" }],
    ["session URL", { payment_session_id: "https://live.example/secret" }],
    ["session oversized", { payment_session_id: "x".repeat(2049) }],
    ["wrong expiry", { order_expiry_time: "2026-11-18T07:16:00Z" }],
  ] satisfies [string, JsonRecord][])(
    "rejects provider creation with invalid %s",
    async (_, patch) => {
      const s = setup();
      s.setPost(order => ({ ...order, ...patch }));
      await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
      expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    }
  );
  it.each([null, [], "provider-secret", 42])(
    "rejects non-order JSON %s",
    async value => {
      const s = setup();
      s.setPost(() => value);
      await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
    }
  );
  it("accepts a sane numeric Cashfree order ID and timezone-equivalent expiry", async () => {
    const s = setup();
    s.setPost(order => ({
      ...order,
      cf_order_id: 123456789,
      order_expiry_time: "2026-11-18T12:45:00+05:30",
    }));
    expect(decode(await s.adapter.createOrder(7)).cfOrderId).toBe("123456789");
  });
  it.each(["../escape", "https://live.example", "bad\nUUID", "x".repeat(200)])(
    "rejects malformed server UUID %s before POST",
    async uuid => {
      const s = setup();
      s.randomUUID.mockReturnValue(uuid);
      await errorCode(s.adapter.createOrder(7), "UNAVAILABLE");
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it.each([NaN, Infinity, -1, 1.5, 8_640_000_000_000_000])(
    "rejects invalid clock %s",
    async time => {
      const s = setup();
      s.setTime(time);
      await errorCode(s.adapter.createOrder(7), "UNAVAILABLE");
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
});

describe("Cashfree sandbox context validation before any GET", () => {
  it("binds allowed users: a different allowlisted user is still forbidden", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    await errorCode(s.adapter.verify(9, order), "INVALID_INPUT");
    await errorCode(
      s.adapter.verify(9, { context: order.context, orderId: order.orderId }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    ["missing context", {}],
    ["extra field", { amountMinor: 1000 }],
    ["null context", { context: null }],
    ["huge context", { context: "x".repeat(4097) }],
    ["bad prefix", { context: "cft2.a.b" }],
    ["bad signature syntax", { context: "cft1.aaaa.bad" }],
    ["unsafe order path", { orderId: "../../orders/live" }],
    ["URL order", { orderId: "https://live.cashfree.com/x" }],
    ["encoded slash", { orderId: "cftest_%2f" }],
    ["overlong order", { orderId: "x".repeat(46) }],
    ["non-string order", { orderId: 7 }],
  ])("rejects malformed %s", async (name, patch) => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    const input =
      name === "missing context"
        ? { orderId: order.orderId }
        : { context: order.context, orderId: order.orderId, ...patch };
    await errorCode(
      s.adapter.verify(7, input as { context: string; orderId: string }),
      "INVALID_INPUT"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it.each([null, [], "token", undefined])(
    "rejects malformed verification input %s",
    async input => {
      const s = setup();
      await errorCode(
        s.adapter.verify(
          7,
          input as unknown as { context: string; orderId: string }
        ),
        "INVALID_INPUT"
      );
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it("rejects a correctly formed but wrong signature", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    const parts = order.context.split(".");
    parts[2] = Buffer.alloc(32).toString("base64url");
    await errorCode(
      s.adapter.verify(7, { context: parts.join("."), orderId: order.orderId }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects payload tampering without recomputing the HMAC", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    const parts = order.context.split(".");
    parts[1] = Buffer.from(
      JSON.stringify({ ...decode(order), userId: 9 })
    ).toString("base64url");
    await errorCode(
      s.adapter.verify(7, { context: parts.join("."), orderId: order.orderId }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    ["version", { version: 2 }],
    ["mode", { mode: "live" }],
    ["provider", { provider: "stripe" }],
    ["scope", { scope: "marketplace" }],
    ["amount", { amountMinor: 1 }],
    ["currency", { currency: "USD" }],
    ["user", { userId: 9 }],
    ["cf ID", { cfOrderId: "../bad" }],
    ["customer", { opaqueCustomerId: "7" }],
    ["fingerprint", { clientIdFingerprint: "bad" }],
    ["too long lifetime", { expiresAt: START + 960000 }],
    ["short lifetime", { expiresAt: START + 899999 }],
    ["negative issue time", { issuedAt: -1, expiresAt: 899999 }],
    ["future issue", { issuedAt: START + 5001, expiresAt: START + 905001 }],
    ["extra field", { listingId: 123 }],
  ] satisfies [string, JsonRecord][])(
    "rejects signed invalid binding %s",
    async (_, patch) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.fetchImpl.mockClear();
      await errorCode(
        s.adapter.verify(7, {
          context: signPayload({ ...decode(order), ...patch }),
          orderId: order.orderId,
        }),
        "FORBIDDEN"
      );
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it("rejects signed malformed JSON", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    await errorCode(
      s.adapter.verify(7, {
        context: signPayload("not a record"),
        orderId: order.orderId,
      }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects a context paired with a different syntactically valid server order ID", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockClear();
    await errorCode(
      s.adapter.verify(7, {
        context: order.context,
        orderId: "cftest_00000000-0000-4000-8000-000000000099",
      }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
  it.each([900000, 900001, 960000])(
    "expires at or beyond the exact 15 minute boundary: %s ms",
    async offset => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setTime(START + offset);
      s.fetchImpl.mockClear();
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "EXPIRED"
      );
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it("permits only the small five-second future clock skew", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setTime(START - 5000);
    s.fetchImpl.mockClear();
    const result = await s.adapter.verify(7, {
      context: order.context,
      orderId: order.orderId,
    });
    expect(result.verified).toBe(false);
    expect(s.fetchImpl).toHaveBeenCalledTimes(3);
  });
  it.each([
    [
      "secret",
      {
        clientSecret:
          "rotated-offline-secret-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0987654321",
      },
    ],
    ["client ID", { clientId: "rotated_offline_client_54321" }],
  ] satisfies [string, Partial<CashfreeSandboxConfig>][])(
    "rejects %s rotation before GET",
    async (_, patch) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setConfig(patch);
      s.fetchImpl.mockClear();
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "FORBIDDEN"
      );
      expect(s.fetchImpl).not.toHaveBeenCalled();
    }
  );
  it("rejects revoked allowlist access before GET", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setConfig({ allowedUserIds: "9" });
    s.fetchImpl.mockClear();
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "FORBIDDEN"
    );
    expect(s.fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Cashfree sandbox verification and no side effects", () => {
  it.each([
    ["PAID", "SUCCESS", true, "paid", true],
    ["ACTIVE", "SUCCESS", true, "pending", false],
    ["PAID", "SUCCESS", false, "authorized", false],
    ["ACTIVE", "SUCCESS", false, "authorized", false],
    ["ACTIVE", "NOT_ATTEMPTED", false, "pending", false],
    ["ACTIVE", "PENDING", false, "pending", false],
    ["ACTIVE", "FAILED", false, "failed", false],
    ["ACTIVE", "USER_DROPPED", false, "cancelled", false],
    ["ACTIVE", "VOID", false, "cancelled", false],
    ["ACTIVE", "CANCELLED", false, "cancelled", false],
    ["PAID", "FAILED", false, "pending", false],
    ["EXPIRED", "SUCCESS", true, "expired", false],
    ["TERMINATED", "SUCCESS", true, "cancelled", false],
    ["TERMINATION_REQUESTED", "SUCCESS", true, "cancelled", false],
  ])(
    "maps order %s / payment %s / captured %s to %s",
    async (orderStatus, paymentStatus, captured, status, verified) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder({ order_status: orderStatus });
      s.setPayments([
        payment(order, {
          payment_status: paymentStatus,
          is_captured: captured,
        }),
      ]);
      s.fetchImpl.mockClear();
      expect(
        await s.adapter.verify(7, {
          context: order.context,
          orderId: order.orderId,
        })
      ).toEqual({
        ...COMMON,
        status,
        verified,
        orderId: order.orderId,
        paymentId: "987654321",
        creditsGranted: 0,
        listingChanged: false,
      });
      expect(s.fetchImpl.mock.calls.map(([url]) => url)).toEqual([
        `https://sandbox.cashfree.com/pg/orders/${order.orderId}`,
        `https://sandbox.cashfree.com/pg/orders/${order.orderId}/payments`,
        `https://sandbox.cashfree.com/pg/orders/${order.orderId}/refunds`,
      ]);
      for (const [, init] of s.fetchImpl.mock.calls) {
        expect(init).toMatchObject({
          method: "GET",
          redirect: "error",
          credentials: "omit",
          headers: { "x-api-version": "2026-01-01" },
        });
        expect(init).not.toHaveProperty("body");
        expect(init?.headers).not.toHaveProperty("x-idempotency-key");
      }
    }
  );
  it.each(["ACTIVE", "PAID"])(
    "does not verify %s order with no successful payment",
    async status => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder({ order_status: status });
      expect(
        await s.adapter.verify(7, {
          context: order.context,
          orderId: order.orderId,
        })
      ).toMatchObject({ verified: false, status: "pending", paymentId: null });
    }
  );
  it("prefers captured SUCCESS over earlier failed attempts, without trusting order PAID alone", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setOrder({ order_status: "PAID" });
    s.setPayments([
      payment(order, {
        cf_payment_id: "111",
        payment_status: "FAILED",
        is_captured: false,
      }),
      payment(order),
    ]);
    expect(
      await s.adapter.verify(7, {
        context: order.context,
        orderId: order.orderId,
      })
    ).toMatchObject({ verified: true, paymentId: "987654321" });
  });
  it("handles the documented FAILED payment with is_captured true without verifying it", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setPayments([
      payment(order, { payment_status: "FAILED", is_captured: true }),
    ]);
    expect(
      await s.adapter.verify(7, {
        context: order.context,
        orderId: order.orderId,
      })
    ).toMatchObject({ verified: false, status: "failed" });
  });
  it.each([true, false])(
    "rejects ambiguous multiple SUCCESS records with second capture %s",
    async captured => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder({ order_status: "PAID" });
      s.setPayments([
        payment(order),
        payment(order, { cf_payment_id: "987654322", is_captured: captured }),
      ]);
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
    }
  );
  it.each([
    "SUCCESS",
    "PENDING",
    "PENDING_APPROVAL",
    "CANCELLED",
    "ONHOLD",
    "REJECTED",
  ])(
    "conservatively suppresses verification for any %s refund record",
    async refundStatus => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder({ order_status: "PAID" });
      s.setPayments([payment(order)]);
      s.setRefunds([
        refund(order, { refund_status: refundStatus, refund_amount: 0.01 }),
      ]);
      expect(
        await s.adapter.verify(7, {
          context: order.context,
          orderId: order.orderId,
        })
      ).toMatchObject({
        verified: false,
        status: "refunded",
        creditsGranted: 0,
        listingChanged: false,
      });
    }
  );
  it("duplicate verification returns the same proof and never performs writes", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setOrder({ order_status: "PAID" });
    s.setPayments([payment(order)]);
    s.fetchImpl.mockClear();
    const input = { context: order.context, orderId: order.orderId };
    const first = await s.adapter.verify(7, input);
    const second = await s.adapter.verify(7, input);
    expect(second).toEqual(first);
    expect(second).toMatchObject({ creditsGranted: 0, listingChanged: false });
    expect(s.fetchImpl).toHaveBeenCalledTimes(6);
    expect(
      s.fetchImpl.mock.calls.every(([, init]) => init?.method === "GET")
    ).toBe(true);
  });
  it.each([
    ["cf order ID", { cf_order_id: "999" }],
    ["customer", { customer_details: { customer_id: "foreign" } }],
    ["order ID", { order_id: "foreign" }],
    ["amount", { order_amount: 9 }],
    ["currency", { order_currency: "USD" }],
    ["status", { order_status: "UNKNOWN" }],
    ["entity", { entity: "payment" }],
  ] satisfies [string, JsonRecord][])(
    "rejects fetched order mismatched %s before fetching payments",
    async (_, patch) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder(patch);
      s.fetchImpl.mockClear();
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
      expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    }
  );
  it.each([
    ["entity", { entity: "order" }],
    ["order ID", { order_id: "foreign" }],
    ["order amount", { order_amount: 9 }],
    ["order currency", { order_currency: "USD" }],
    ["payment amount", { payment_amount: 9 }],
    ["payment currency", { payment_currency: "USD" }],
    ["string amount", { payment_amount: "10" }],
    ["capture absent", { is_captured: undefined }],
    ["capture string", { is_captured: "true" }],
    ["unknown status", { payment_status: "AUTHORIZED" }],
    ["bad ID", { cf_payment_id: "../bad" }],
    ["unsafe numeric ID", { cf_payment_id: Number.MAX_SAFE_INTEGER + 1 }],
    ["missing status", { payment_status: undefined }],
  ] satisfies [string, JsonRecord][])(
    "rejects invalid payment %s",
    async (_, patch) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setPayments([payment(order, patch)]);
      s.fetchImpl.mockClear();
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
      expect(s.fetchImpl).toHaveBeenCalledTimes(2);
    }
  );
  it.each([null, {}, "payments", Array(101).fill({})])(
    "rejects malformed/oversized payment array %s",
    async value => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setPayments(value);
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
    }
  );
  it("rejects duplicate payment IDs", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setPayments([payment(order), payment(order)]);
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "INVALID_PROVIDER_RESPONSE"
    );
  });
  it.each([
    ["order ID", { order_id: "foreign" }],
    ["refund ID", { cf_refund_id: "../bad" }],
    ["payment ID", { cf_payment_id: undefined }],
    ["merchant refund ID", { refund_id: "../bad" }],
    ["zero amount", { refund_amount: 0 }],
    ["negative amount", { refund_amount: -1 }],
    ["excess amount", { refund_amount: 11 }],
    ["string amount", { refund_amount: "10" }],
    ["currency", { refund_currency: "USD" }],
    ["status", { refund_status: "UNKNOWN" }],
    ["entity", { entity: "payment" }],
  ] satisfies [string, JsonRecord][])(
    "fails closed on invalid refund %s",
    async (_, patch) => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setOrder({ order_status: "PAID" });
      s.setPayments([payment(order)]);
      s.setRefunds([refund(order, patch)]);
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
    }
  );
  it.each([null, {}, "refunds", Array(101).fill({})])(
    "fails closed on malformed/oversized refund array %s",
    async value => {
      const s = setup();
      const order = await s.adapter.createOrder(7);
      s.setRefunds(value);
      await errorCode(
        s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
        "INVALID_PROVIDER_RESPONSE"
      );
    }
  );
  it("rejects duplicate refund IDs", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setRefunds([refund(order), refund(order)]);
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "INVALID_PROVIDER_RESPONSE"
    );
  });
  it("rechecks expiration after provider reads", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockImplementationOnce(async () => {
      s.setTime(START + 900000);
      return json({
        entity: "order",
        order_id: order.orderId,
        cf_order_id: "123456789",
        order_amount: 10,
        order_currency: "INR",
        customer_details: { customer_id: decode(order).opaqueCustomerId },
        order_status: "PAID",
      });
    });
    s.setPayments([payment(order)]);
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "EXPIRED"
    );
  });
  it("rechecks credential rotation after provider reads", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.fetchImpl.mockImplementationOnce(async () => {
      s.setConfig({ clientId: "rotated_client_identifier" });
      return json({
        entity: "order",
        order_id: order.orderId,
        cf_order_id: "123456789",
        order_amount: 10,
        order_currency: "INR",
        customer_details: { customer_id: decode(order).opaqueCustomerId },
        order_status: "PAID",
      });
    });
    s.setPayments([payment(order)]);
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "FORBIDDEN"
    );
  });
});

describe("Cashfree sandbox bounded transport and sanitized errors", () => {
  it.each([301, 302, 307, 308, 400, 401, 403, 404, 429, 500, 503])(
    "fails closed and never retries POST on HTTP %s",
    async status => {
      const s = setup();
      s.fetchImpl.mockResolvedValue(
        new Response("PRIVATE_PROVIDER_BODY", { status })
      );
      await expect(s.adapter.createOrder(7)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
        message: "Sandbox payment provider is unavailable.",
      });
      expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    }
  );
  it("sanitizes raw transport errors and does not retry ambiguous POST", async () => {
    const s = setup();
    s.fetchImpl.mockRejectedValue(
      new Error(`PRIVATE_BODY ${CONFIG.clientSecret}`)
    );
    try {
      await s.adapter.createOrder(7);
      expect.fail("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CashfreeSandboxError);
      expect((error as Error).message).toBe(
        "Sandbox payment provider is unavailable."
      );
      expect(String(error)).not.toContain("PRIVATE_BODY");
      expect(String(error)).not.toContain(CONFIG.clientSecret);
      expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
    }
    expect(s.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("never logs provider bodies, context or customer details", async () => {
    const spies = [
      vi.spyOn(console, "error"),
      vi.spyOn(console, "warn"),
      vi.spyOn(console, "log"),
    ];
    const s = setup();
    s.fetchImpl.mockResolvedValue(
      json({ raw: "PRIVATE_SECRET", customer: "PRIVATE_PII" })
    );
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
    spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
  });
  it.each([
    [
      "malformed JSON",
      () =>
        new Response("{PRIVATE_BODY", {
          headers: { "content-type": "application/json" },
        }),
    ],
    [
      "wrong content type",
      () => new Response("{}", { headers: { "content-type": "text/html" } }),
    ],
    ["missing content type", () => new Response(new Uint8Array([123, 125]))],
    [
      "invalid UTF-8",
      () =>
        new Response(new Uint8Array([123, 255, 125]), {
          headers: { "content-type": "application/json" },
        }),
    ],
    [
      "oversize content length",
      () =>
        new Response("{}", {
          headers: {
            "content-type": "application/json",
            "content-length": "65537",
          },
        }),
    ],
    [
      "invalid content length",
      () =>
        new Response("{}", {
          headers: {
            "content-type": "application/json",
            "content-length": "NaN",
          },
        }),
    ],
    [
      "oversize single chunk",
      () =>
        new Response("x".repeat(65537), {
          headers: { "content-type": "application/json" },
        }),
    ],
    [
      "missing body",
      () =>
        new Response(null, { headers: { "content-type": "application/json" } }),
    ],
  ] satisfies [string, () => Response][])(
    "rejects %s with a static provider-response error",
    async (_, factory) => {
      const s = setup();
      s.fetchImpl.mockResolvedValue(factory());
      await expect(s.adapter.createOrder(7)).rejects.toMatchObject({
        code: "INVALID_PROVIDER_RESPONSE",
        message: "Invalid sandbox payment provider response.",
      });
      expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    }
  );
  it("enforces the cumulative streamed body limit, not just declared length", async () => {
    const s = setup();
    const cancel = vi.fn();
    let chunks = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (++chunks <= 3) controller.enqueue(new Uint8Array(32768));
      },
      cancel,
    });
    s.fetchImpl.mockResolvedValue(
      new Response(stream, {
        headers: { "content-type": "application/json", "content-length": "1" },
      })
    );
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
    expect(cancel).toHaveBeenCalled();
  });
  it("rejects an exactly 64 KiB invalid body through JSON parsing, without a limit bypass", async () => {
    const s = setup();
    s.fetchImpl.mockResolvedValue(
      new Response("x".repeat(65536), {
        headers: { "content-type": "application/json" },
      })
    );
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
  });
  it("rejects responses marked redirected or with a foreign final URL", async () => {
    const s = setup();
    const response = json({});
    Object.defineProperty(response, "redirected", { value: true });
    s.fetchImpl.mockResolvedValue(response);
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
    const other = json({});
    Object.defineProperty(other, "url", {
      value: "https://api.cashfree.com/pg/orders",
    });
    s.fetchImpl.mockResolvedValue(other);
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
    expect(
      s.fetchImpl.mock.calls.every(
        ([url]) => url === "https://sandbox.cashfree.com/pg/orders"
      )
    ).toBe(true);
  });
  it("rejects non-Response fetch contracts", async () => {
    const s = setup();
    s.fetchImpl.mockResolvedValue({
      ok: true,
      json: () => ({}),
    } as unknown as Response);
    await errorCode(s.adapter.createOrder(7), "INVALID_PROVIDER_RESPONSE");
  });
  it("times out and aborts at ten seconds even if fetch ignores its signal, with no retry", async () => {
    vi.useFakeTimers();
    const s = setup();
    s.fetchImpl.mockImplementation(
      () => new Promise<Response>(() => undefined)
    );
    const outcome = errorCode(s.adapter.createOrder(7), "PROVIDER_UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(10000);
    await outcome;
    expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    expect(s.fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds stalled response-body reads with the same ten-second deadline", async () => {
    vi.useFakeTimers();
    const s = setup();
    s.fetchImpl.mockResolvedValue(
      new Response(new ReadableStream<Uint8Array>({ start() {} }), {
        headers: { "content-type": "application/json" },
      })
    );
    const outcome = errorCode(s.adapter.createOrder(7), "PROVIDER_UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(10000);
    await outcome;
    expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    expect(s.fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it("fails closed if the pinned refunds endpoint is unsupported", async () => {
    const s = setup();
    const order = await s.adapter.createOrder(7);
    s.setOrder({ order_status: "PAID" });
    s.setPayments([payment(order)]);
    const original = s.fetchImpl.getMockImplementation()!;
    s.fetchImpl.mockImplementation(async (url, init) =>
      String(url).endsWith("/refunds")
        ? new Response("unsupported PRIVATE_BODY", { status: 404 })
        : original(url, init)
    );
    await errorCode(
      s.adapter.verify(7, { context: order.context, orderId: order.orderId }),
      "PROVIDER_UNAVAILABLE"
    );
  });
});
