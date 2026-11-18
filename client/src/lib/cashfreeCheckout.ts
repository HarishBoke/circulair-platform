// Public Cashfree v3 hosted-checkout SDK. This module never calls provider APIs.
const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
const CASHFREE_SCRIPT_ID = "circulair-cashfree-sandbox-sdk";
const SCRIPT_TIMEOUT_MS = 10_000;
const COMPLETION_TIMEOUT_MS = 120_000;

type CashfreeFactory = (options: { mode: "sandbox" }) => unknown;
type CashfreeSdk = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget: "_modal";
  }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

export type CashfreeCheckoutOutcome = {
  hadError: boolean;
  redirected: boolean;
};

// Only application-authored messages are surfaced; never expose SDK payloads.
export class CashfreeCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashfreeCheckoutError";
  }
}

let ownedScript: HTMLScriptElement | null = null;
let loadedFactory: CashfreeFactory | null = null;
let loading: Promise<CashfreeFactory> | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSdk(value: unknown): value is CashfreeSdk {
  return isObject(value) && typeof value.checkout === "function";
}

function assertNoForeignScripts(): void {
  for (const script of Array.from(document.querySelectorAll("script"))) {
    if (script === ownedScript) continue;
    // Do not adopt an existing SDK, including an official URL inserted elsewhere.
    if (
      script.id === CASHFREE_SCRIPT_ID ||
      /cashfree/i.test(script.getAttribute("src") ?? "")
    ) {
      throw new CashfreeCheckoutError(
        "A conflicting Cashfree script is present. Checkout was not opened. Reload this page before retrying."
      );
    }
  }
  if (
    ownedScript &&
    (!ownedScript.isConnected || ownedScript.src !== CASHFREE_SDK_URL)
  ) {
    throw new CashfreeCheckoutError(
      "The checkout script changed unexpectedly. Reload this page before retrying."
    );
  }
}

function loadFactory(): Promise<CashfreeFactory> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      new CashfreeCheckoutError("Checkout is available only in your browser.")
    );
  }

  try {
    assertNoForeignScripts();
    if (loadedFactory) {
      if (window.Cashfree !== loadedFactory) {
        throw new CashfreeCheckoutError(
          "A conflicting checkout global is present. Reload this page before retrying."
        );
      }
      return Promise.resolve(loadedFactory);
    }
    if (loading) return loading;
    if ("Cashfree" in window) {
      throw new CashfreeCheckoutError(
        "An unrecognised checkout global is present. Checkout was not opened. Reload this page before retrying."
      );
    }
  } catch (error: unknown) {
    return Promise.reject(error);
  }

  const script = document.createElement("script");
  script.id = CASHFREE_SCRIPT_ID;
  script.src = CASHFREE_SDK_URL;
  script.async = true;
  script.referrerPolicy = "strict-origin-when-cross-origin";
  ownedScript = script;

  const request = new Promise<CashfreeFactory>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const cleanUp = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanUp();
      script.remove();
      if (ownedScript === script) ownedScript = null;
      reject(new CashfreeCheckoutError(message));
    };

    timer = setTimeout(() => {
      fail(
        "Cashfree's test checkout did not load within 10 seconds. Check your connection and retry."
      );
    }, SCRIPT_TIMEOUT_MS);

    script.onerror = () => {
      fail(
        "Cashfree's test checkout could not load. Check your connection or browser restrictions and retry."
      );
    };
    script.onload = () => {
      if (settled) return;
      try {
        assertNoForeignScripts();
        const factory = window.Cashfree;
        if (typeof factory !== "function") {
          fail("Cashfree's test checkout was unavailable after loading. Please retry.");
          return;
        }
        settled = true;
        cleanUp();
        loadedFactory = factory;
        resolve(factory);
      } catch {
        fail(
          "A checkout script conflict was detected. Reload this page before retrying."
        );
      }
    };
    try {
      document.head.appendChild(script);
    } catch {
      fail("Cashfree's test checkout could not be loaded. Please retry.");
    }
  });

  loading = request;
  // Clear the shared promise on either outcome without an unhandled rejection.
  void request.then(
    () => {
      if (loading === request) loading = null;
    },
    () => {
      if (loading === request) loading = null;
    }
  );
  return request;
}

/**
 * Call only from an authenticated, explicitly clicked test-checkout action.
 * beforeOpen must revalidate the owned server response and expiry after loading.
 * Neither paymentDetails nor any SDK outcome constitutes payment confirmation.
 */
export async function openCashfreeSandboxCheckout(
  paymentSessionId: string,
  beforeOpen: () => void
): Promise<CashfreeCheckoutOutcome> {
  if (
    typeof paymentSessionId !== "string" ||
    paymentSessionId.length === 0 ||
    paymentSessionId.length > 4096 ||
    !/^[A-Za-z0-9._~+/=-]+$/.test(paymentSessionId)
  ) {
    throw new CashfreeCheckoutError("The test checkout session was invalid. Start a new test.");
  }
  const factory = await loadFactory();
  assertNoForeignScripts();
  if (window.Cashfree !== factory) {
    throw new CashfreeCheckoutError(
      "The checkout global changed unexpectedly. Reload this page before retrying."
    );
  }
  beforeOpen();

  try {
    const sdk = factory({ mode: "sandbox" });
    if (!isSdk(sdk)) {
      throw new CashfreeCheckoutError("The Cashfree test checkout SDK was unavailable. Please retry.");
    }
    const completion = sdk.checkout({
      paymentSessionId,
      redirectTarget: "_modal",
    });
    if (!completion || typeof completion.then !== "function") {
      throw new CashfreeCheckoutError("The test checkout did not provide a completion result.");
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: unknown;
    try {
      result = await Promise.race([
        completion,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new CashfreeCheckoutError("Checkout status must be checked by the server.")), COMPLETION_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    return {
      hadError: !isObject(result) || Boolean(result.error),
      redirected: isObject(result) && Boolean(result.redirect),
    };
  } catch {
    // SDK error text can contain payment or customer data. Deliberately discard it.
    throw new CashfreeCheckoutError(
      "Cashfree's test checkout closed or encountered an error. The server must still check the payment status."
    );
  }
}
