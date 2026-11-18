import {
  createHash,
  createHmac,
  randomUUID as nodeRandomUUID,
  timingSafeEqual,
} from "node:crypto";

/** This adapter is a gateway test, not a ledger or marketplace fulfillment path. */
export type CashfreeSandboxConfig = Readonly<{
  enabled?: string;
  mode?: string;
  clientId?: string;
  clientSecret?: string;
  allowedUserIds?: string;
}>;
export type Config = CashfreeSandboxConfig;
export type CashfreeSandboxErrorCode =
  | "UNAVAILABLE"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "EXPIRED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

const ERROR_MESSAGES: Readonly<Record<CashfreeSandboxErrorCode, string>> =
  Object.freeze({
    UNAVAILABLE: "Sandbox payments are unavailable.",
    INVALID_INPUT: "Invalid sandbox payment input.",
    FORBIDDEN: "Sandbox payment access denied.",
    EXPIRED: "Sandbox payment context has expired.",
    PROVIDER_UNAVAILABLE: "Sandbox payment provider is unavailable.",
    INVALID_PROVIDER_RESPONSE: "Invalid sandbox payment provider response.",
  });

export class CashfreeSandboxError extends Error {
  readonly code: CashfreeSandboxErrorCode;
  constructor(code: CashfreeSandboxErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "CashfreeSandboxError";
    this.code = code;
  }
}

const BASE_URL = "https://sandbox.cashfree.com/pg";
const API_VERSION = "2026-01-01";
const LIFETIME_MS = 15 * 60 * 1000;
const CLOCK_SKEW_MS = 5_000;
const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_RECORDS = 100;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ORDER_RE =
  /^cftest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CUSTOMER_RE =
  /^cfcust_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COMMON = Object.freeze({
  mode: "sandbox" as const,
  provider: "cashfree" as const,
  amountMinor: 1000 as const,
  currency: "INR" as const,
  scope: "gateway-test-only" as const,
});
const ORDER_STATUSES = new Set([
  "ACTIVE",
  "PAID",
  "EXPIRED",
  "TERMINATED",
  "TERMINATION_REQUESTED",
]);
const PAYMENT_STATUSES = new Set([
  "SUCCESS",
  "NOT_ATTEMPTED",
  "FAILED",
  "USER_DROPPED",
  "VOID",
  "CANCELLED",
  "PENDING",
]);
const REFUND_STATUSES = new Set([
  "SUCCESS",
  "PENDING",
  "PENDING_APPROVAL",
  "CANCELLED",
  "ONHOLD",
  "REJECTED",
]);

export type CashfreeSandboxStatus = typeof COMMON & {
  enabled: boolean;
  configured: boolean;
};
export type CashfreeSandboxOrder = typeof COMMON & {
  orderId: string;
  paymentSessionId: string;
  context: string;
  expiresAt: string;
};
export type CashfreeSandboxVerification = typeof COMMON & {
  verified: boolean;
  status:
    | "paid"
    | "pending"
    | "failed"
    | "cancelled"
    | "expired"
    | "refunded"
    | "authorized";
  orderId: string;
  paymentId: string | null;
  creditsGranted: 0;
  listingChanged: false;
};

type ReadyConfig = {
  clientId: string;
  clientSecret: string;
  users: Set<number>;
};
type ContextPayload = typeof COMMON & {
  version: 1;
  userId: number;
  orderId: string;
  cfOrderId: string;
  opaqueCustomerId: string;
  issuedAt: number;
  expiresAt: number;
  clientIdFingerprint: string;
};
type RecordValue = Record<string, unknown>;
type Payment = { id: string; status: string; captured: boolean };

function fail(code: CashfreeSandboxErrorCode): never {
  throw new CashfreeSandboxError(code);
}
function isUserId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function getReadyConfig(
  getConfig: () => CashfreeSandboxConfig
): ReadyConfig | null {
  try {
    const config = getConfig();
    if (!config || config.enabled !== "true" || config.mode !== "sandbox")
      return null;
    const { clientId, clientSecret, allowedUserIds } = config;
    if (typeof clientId !== "string" || !/^[\x21-\x7e]{8,256}$/.test(clientId))
      return null;
    // Length is a minimum strength guard, not a claim to measure secret entropy.
    if (
      typeof clientSecret !== "string" ||
      !/^[\x21-\x7e]{32,512}$/.test(clientSecret) ||
      new Set(clientSecret).size < 8
    )
      return null;
    if (
      typeof allowedUserIds !== "string" ||
      allowedUserIds.length > 4096 ||
      !/^[1-9]\d*(?:,[1-9]\d*)*$/.test(allowedUserIds)
    )
      return null;
    const ids = allowedUserIds.split(",").map(Number);
    if (!ids.every(isUserId) || new Set(ids).size !== ids.length) return null;
    return { clientId, clientSecret, users: new Set(ids) };
  } catch {
    return null;
  }
}
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_PROVIDER_RESPONSE");
  return value as RecordValue;
}
function providerId(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    return String(value);
  if (typeof value === "string" && /^[1-9]\d{0,63}$/.test(value)) return value;
  return fail("INVALID_PROVIDER_RESPONSE");
}
function fingerprint(clientId: string): string {
  return createHash("sha256").update(clientId, "utf8").digest("hex");
}
function signature(payload: string, secret: string): Buffer {
  const key = createHmac("sha256", secret)
    .update("circulair/cashfree-sandbox/context-key/v1\0", "utf8")
    .digest();
  return createHmac("sha256", key)
    .update("circulair/cashfree-sandbox/context/v1\0", "utf8")
    .update(payload, "ascii")
    .digest();
}
function mintContext(payload: ContextPayload, config: ReadyConfig): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `cft1.${encoded}.${signature(encoded, config.clientSecret).toString("base64url")}`;
}
function parseContext(
  input: unknown,
  orderId: unknown,
  userId: number,
  config: ReadyConfig,
  time: number
): ContextPayload {
  if (
    typeof orderId !== "string" ||
    !ORDER_RE.test(orderId) ||
    typeof input !== "string" ||
    input.length > 4096
  )
    fail("INVALID_INPUT");
  const match = /^cft1\.([A-Za-z0-9_-]{1,3000})\.([A-Za-z0-9_-]{43})$/.exec(
    input
  );
  if (!match) fail("INVALID_INPUT");
  const [, encoded, encodedSignature] = match;
  const provided = Buffer.from(encodedSignature, "base64url");
  if (
    provided.length !== 32 ||
    provided.toString("base64url") !== encodedSignature ||
    !timingSafeEqual(provided, signature(encoded, config.clientSecret))
  )
    fail("FORBIDDEN");
  let payload: unknown;
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.toString("base64url") !== encoded) fail("FORBIDDEN");
    payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    );
  } catch {
    return fail("FORBIDDEN");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    fail("FORBIDDEN");
  const p = payload as ContextPayload;
  const keys = [
    "mode",
    "provider",
    "amountMinor",
    "currency",
    "scope",
    "version",
    "userId",
    "orderId",
    "cfOrderId",
    "opaqueCustomerId",
    "issuedAt",
    "expiresAt",
    "clientIdFingerprint",
  ];
  if (
    Object.keys(p).length !== keys.length ||
    !keys.every(key => Object.hasOwn(p, key)) ||
    p.version !== 1 ||
    p.mode !== COMMON.mode ||
    p.provider !== COMMON.provider ||
    p.scope !== COMMON.scope ||
    p.amountMinor !== COMMON.amountMinor ||
    p.currency !== COMMON.currency ||
    p.userId !== userId ||
    p.orderId !== orderId ||
    !ORDER_RE.test(p.orderId) ||
    typeof p.cfOrderId !== "string" ||
    !/^[1-9]\d{0,63}$/.test(p.cfOrderId) ||
    typeof p.opaqueCustomerId !== "string" ||
    !CUSTOMER_RE.test(p.opaqueCustomerId) ||
    p.clientIdFingerprint !== fingerprint(config.clientId) ||
    !Number.isSafeInteger(p.issuedAt) ||
    !Number.isSafeInteger(p.expiresAt) ||
    p.issuedAt < 0 ||
    p.expiresAt - p.issuedAt !== LIFETIME_MS ||
    p.issuedAt > time + CLOCK_SKEW_MS
  )
    fail("FORBIDDEN");
  if (time >= p.expiresAt) fail("EXPIRED");
  return p;
}
function validateOrder(
  value: unknown,
  binding: Pick<ContextPayload, "orderId" | "opaqueCustomerId">,
  expectedCfId?: string
): { cfId: string; status: string; value: RecordValue } {
  const order = record(value);
  if (
    order.entity !== "order" ||
    order.order_id !== binding.orderId ||
    order.order_amount !== 10 ||
    order.order_currency !== "INR" ||
    record(order.customer_details).customer_id !== binding.opaqueCustomerId ||
    typeof order.order_status !== "string" ||
    !ORDER_STATUSES.has(order.order_status)
  )
    fail("INVALID_PROVIDER_RESPONSE");
  const cfId = providerId(order.cf_order_id);
  if (expectedCfId !== undefined && cfId !== expectedCfId)
    fail("INVALID_PROVIDER_RESPONSE");
  return { cfId, status: order.order_status, value: order };
}
function records(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > MAX_RECORDS)
    fail("INVALID_PROVIDER_RESPONSE");
  return value;
}
function validatePayments(value: unknown, orderId: string): Payment[] {
  const seen = new Set<string>();
  return records(value).map(item => {
    const p = record(item);
    const id = providerId(p.cf_payment_id);
    if (
      seen.has(id) ||
      p.entity !== "payment" ||
      p.order_id !== orderId ||
      p.order_amount !== 10 ||
      p.order_currency !== "INR" ||
      p.payment_amount !== 10 ||
      p.payment_currency !== "INR" ||
      typeof p.is_captured !== "boolean" ||
      typeof p.payment_status !== "string" ||
      !PAYMENT_STATUSES.has(p.payment_status)
    )
      fail("INVALID_PROVIDER_RESPONSE");
    seen.add(id);
    return { id, status: p.payment_status, captured: p.is_captured };
  });
}
function validateRefunds(value: unknown, orderId: string): boolean {
  const refunds = records(value);
  const seen = new Set<string>();
  for (const item of refunds) {
    const r = record(item);
    const id = providerId(r.cf_refund_id);
    providerId(r.cf_payment_id);
    if (
      seen.has(id) ||
      r.order_id !== orderId ||
      (r.entity !== undefined && r.entity !== "refund") ||
      typeof r.refund_id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(r.refund_id) ||
      typeof r.refund_amount !== "number" ||
      !Number.isFinite(r.refund_amount) ||
      r.refund_amount <= 0 ||
      r.refund_amount > 10 ||
      (r.refund_currency !== undefined && r.refund_currency !== "INR") ||
      typeof r.refund_status !== "string" ||
      !REFUND_STATUSES.has(r.refund_status)
    )
      fail("INVALID_PROVIDER_RESPONSE");
    seen.add(id);
  }
  // Deliberately conservative: even failed/cancelled refund records suppress verification.
  // The stable refunds endpoint uses the pinned 2026 header; unsupported responses fail closed.
  return refunds.length > 0;
}

async function readJson(
  response: Response,
  signal: AbortSignal
): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)
  )
    fail("INVALID_PROVIDER_RESPONSE");
  if (
    !/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(
      response.headers.get("content-type") ?? ""
    ) ||
    !response.body
  )
    fail("INVALID_PROVIDER_RESPONSE");
  const reader = response.body.getReader();
  const abortRead = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abortRead, { once: true });
  if (signal.aborted) abortRead();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail("INVALID_PROVIDER_RESPONSE");
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) fail("INVALID_PROVIDER_RESPONSE");
      chunks.push(value);
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.concat(chunks, total)
        )
      );
    } catch {
      return fail("INVALID_PROVIDER_RESPONSE");
    }
  } finally {
    // Do not wait for cancellation: a faulty transport must not defeat the timeout.
    signal.removeEventListener("abort", abortRead);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function createCashfreeSandbox({
  getConfig,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  randomUUID = nodeRandomUUID,
}: {
  getConfig: () => CashfreeSandboxConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  randomUUID?: () => string;
}) {
  function authorized(userId: number): ReadyConfig {
    const config = getReadyConfig(getConfig);
    if (!config) fail("UNAVAILABLE");
    if (!isUserId(userId)) fail("INVALID_INPUT");
    if (!config.users.has(userId)) fail("FORBIDDEN");
    return config;
  }
  function clock(): number {
    try {
      const value = now();
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 8_640_000_000_000_000 - LIFETIME_MS
      )
        fail("UNAVAILABLE");
      return value;
    } catch {
      return fail("UNAVAILABLE");
    }
  }
  function uuid(): string {
    try {
      const value = randomUUID();
      if (typeof value !== "string" || !UUID_RE.test(value))
        fail("UNAVAILABLE");
      return value;
    } catch {
      return fail("UNAVAILABLE");
    }
  }
  async function request(
    config: ReadyConfig,
    path: string,
    body?: RecordValue,
    idempotencyKey?: string
  ): Promise<unknown> {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new CashfreeSandboxError("PROVIDER_UNAVAILABLE"));
      }, TIMEOUT_MS);
    });
    const operation = (async () => {
      const headers: Record<string, string> = {
        accept: "application/json",
        "x-client-id": config.clientId,
        "x-client-secret": config.clientSecret,
        "x-api-version": API_VERSION,
      };
      if (body) headers["content-type"] = "application/json";
      if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey;
      const response = await fetchImpl(url, {
        method: body ? "POST" : "GET",
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
      if (!(response instanceof Response)) fail("INVALID_PROVIDER_RESPONSE");
      if (
        response.redirected ||
        response.type === "opaqueredirect" ||
        (response.url && response.url !== url)
      ) {
        void response.body?.cancel().catch(() => undefined);
        fail("INVALID_PROVIDER_RESPONSE");
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        fail("PROVIDER_UNAVAILABLE");
      }
      return readJson(response, controller.signal);
    })();
    try {
      return await Promise.race([operation, timeout]);
    } catch (error) {
      controller.abort();
      if (error instanceof CashfreeSandboxError) throw error;
      return fail("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    status(userId: number): CashfreeSandboxStatus {
      const config = getReadyConfig(getConfig);
      const ready = !!config && isUserId(userId) && config.users.has(userId);
      // No distinction or diagnostics for unauthorized/invalid configurations.
      return { ...COMMON, enabled: ready, configured: ready };
    },
    async createOrder(userId: number): Promise<CashfreeSandboxOrder> {
      const config = authorized(userId);
      const issuedAt = Math.floor(clock() / 1000) * 1000;
      const expiresAt = issuedAt + LIFETIME_MS;
      const orderId = `cftest_${uuid()}`;
      const opaqueCustomerId = `cfcust_${uuid()}`;
      const idempotencyKey = uuid();
      const response = await request(
        config,
        "/orders",
        {
          order_id: orderId,
          order_amount: 10,
          order_currency: "INR",
          customer_details: {
            customer_id: opaqueCustomerId,
            customer_phone: "9908734801",
          },
          order_note: "Gateway sandbox test only",
          order_tags: { scope: "gateway-test-only" },
          order_expiry_time: new Date(expiresAt).toISOString(),
        },
        idempotencyKey
      );
      const order = validateOrder(response, { orderId, opaqueCustomerId });
      const session = order.value.payment_session_id;
      if (
        order.status !== "ACTIVE" ||
        typeof session !== "string" ||
        !/^[A-Za-z0-9_-]{16,2048}$/.test(session) ||
        (order.value.order_expiry_time !== undefined &&
          (typeof order.value.order_expiry_time !== "string" ||
            Date.parse(order.value.order_expiry_time) !== expiresAt))
      )
        fail("INVALID_PROVIDER_RESPONSE");
      if (clock() >= expiresAt) fail("EXPIRED");
      const context = mintContext(
        {
          ...COMMON,
          version: 1,
          userId,
          orderId,
          cfOrderId: order.cfId,
          opaqueCustomerId,
          issuedAt,
          expiresAt,
          clientIdFingerprint: fingerprint(config.clientId),
        },
        config
      );
      return {
        ...COMMON,
        orderId,
        paymentSessionId: session,
        context,
        expiresAt: new Date(expiresAt).toISOString(),
      };
    },
    async verify(
      userId: number,
      input: { context: string; orderId: string }
    ): Promise<CashfreeSandboxVerification> {
      const config = authorized(userId);
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).length !== 2 ||
        !Object.hasOwn(input, "context") ||
        !Object.hasOwn(input, "orderId")
      )
        fail("INVALID_INPUT");
      const binding = parseContext(
        input.context,
        input.orderId,
        userId,
        config,
        clock()
      );
      const path = `/orders/${encodeURIComponent(binding.orderId)}`;
      const order = validateOrder(
        await request(config, path),
        binding,
        binding.cfOrderId
      );
      const payments = validatePayments(
        await request(config, `${path}/payments`),
        binding.orderId
      );
      const hasRefunds = validateRefunds(
        await request(config, `${path}/refunds`),
        binding.orderId
      );
      if (payments.filter(payment => payment.status === "SUCCESS").length > 1)
        fail("INVALID_PROVIDER_RESPONSE");
      // Re-check the exact lifetime and credential rotation after all bounded reads as well.
      const currentConfig = authorized(userId);
      parseContext(
        input.context,
        input.orderId,
        userId,
        currentConfig,
        clock()
      );
      const captured = payments.find(
        payment => payment.status === "SUCCESS" && payment.captured
      );
      const authorizedPayment = payments.find(
        payment => payment.status === "SUCCESS" && !payment.captured
      );
      let status: CashfreeSandboxVerification["status"] = "pending";
      let verified = false;
      if (hasRefunds) status = "refunded";
      else if (order.status === "PAID" && captured) {
        status = "paid";
        verified = true;
      } else if (order.status === "EXPIRED") status = "expired";
      else if (
        order.status === "TERMINATED" ||
        order.status === "TERMINATION_REQUESTED"
      )
        status = "cancelled";
      else if (authorizedPayment) status = "authorized";
      else if (
        order.status === "PAID" ||
        captured ||
        payments.some(
          p => p.status === "PENDING" || p.status === "NOT_ATTEMPTED"
        )
      )
        status = "pending";
      else if (
        payments.some(
          p =>
            p.status === "USER_DROPPED" ||
            p.status === "VOID" ||
            p.status === "CANCELLED"
        )
      )
        status = "cancelled";
      else if (payments.some(p => p.status === "FAILED")) status = "failed";
      return {
        ...COMMON,
        verified,
        status,
        orderId: binding.orderId,
        paymentId:
          captured?.id ?? authorizedPayment?.id ?? payments[0]?.id ?? null,
        creditsGranted: 0,
        listingChanged: false,
      };
    },
  };
}
