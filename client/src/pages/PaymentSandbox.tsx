import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CashfreeCheckoutError,
  openCashfreeSandboxCheckout,
} from "@/lib/cashfreeCheckout";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FlaskConical,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const AMOUNT_MINOR = 1000;
const CURRENCY = "INR";
const SCOPE = "gateway-test-only";
const TEST_AMOUNT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(AMOUNT_MINOR / 100);
const SIGN_IN_URL = "/login?returnTo=%2Fpayments%2Ftest";
const TEST_METHODS_URL =
  "https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration";

type SandboxContract = {
  mode: "sandbox";
  provider: "cashfree";
  amountMinor: 1000;
  currency: "INR";
  scope: "gateway-test-only";
};
type SandboxStatus = SandboxContract & {
  enabled: boolean;
  configured: boolean;
};
type SandboxOrder = SandboxContract & {
  orderId: string;
  paymentSessionId: string;
  context: string;
  expiresAt: string | number | Date;
};
type PaymentStatus =
  | "paid"
  | "pending"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "authorized";
type Verification = SandboxContract & {
  verified: boolean;
  status: PaymentStatus;
  orderId: string;
  paymentId: string | null;
  creditsGranted: 0;
  listingChanged: false;
};
type OwnedOrder = {
  ownerId: string | number;
  orderId: string;
  context: string;
};
type Phase = "creating" | "loading-sdk" | "checkout" | "verifying" | null;
type Feedback = {
  tone: "neutral" | "warning" | "success";
  title: string;
  description: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasSandboxContract(value: unknown): boolean {
  return (
    isObject(value) &&
    value.mode === "sandbox" &&
    value.provider === "cashfree" &&
    value.amountMinor === AMOUNT_MINOR &&
    value.currency === CURRENCY &&
    value.scope === SCOPE
  );
}

function isSandboxStatus(value: unknown): value is SandboxStatus {
  return (
    isObject(value) &&
    hasSandboxContract(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.configured === "boolean"
  );
}

function isOpaqueToken(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9._~+/=-]+$/.test(value)
  );
}

function expiryMilliseconds(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value; // Epoch milliseconds, not seconds.
  }
  if (
    typeof value === "string" &&
    value.length <= 64 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  return null;
}

function assertSandboxOrder(value: unknown): asserts value is SandboxOrder {
  if (
    !isObject(value) ||
    !hasSandboxContract(value) ||
    typeof value.orderId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(value.orderId) ||
    !isOpaqueToken(value.paymentSessionId, 4096) ||
    !isOpaqueToken(value.context, 8192)
  ) {
    throw new CashfreeCheckoutError(
      "The server did not return a valid Cashfree sandbox order. Checkout was not opened."
    );
  }
  const expiresAt = expiryMilliseconds(value.expiresAt);
  if (expiresAt === null || expiresAt <= Date.now()) {
    throw new CashfreeCheckoutError(
      "The test checkout session is invalid or expired. Start a new test."
    );
  }
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === "paid" ||
    value === "pending" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "expired" ||
    value === "refunded" ||
    value === "authorized"
  );
}

function isVerification(value: unknown, orderId: string): value is Verification {
  return (
    isObject(value) &&
    hasSandboxContract(value) &&
    value.orderId === orderId &&
    typeof value.verified === "boolean" &&
    isPaymentStatus(value.status) &&
    (value.paymentId === null || isOpaqueToken(value.paymentId, 256)) &&
    (!value.verified || (value.status === "paid" && typeof value.paymentId === "string" && value.paymentId.length > 0)) &&
    value.creditsGranted === 0 &&
    value.listingChanged === false
  );
}

function verificationFeedback(result: Verification): Feedback {
  if (result.verified && result.status === "paid") {
    return {
      tone: "success",
      title: "Test payment verified",
      description: `The server confirmed the ${TEST_AMOUNT} INR sandbox payment. No real money was charged, no credits were allocated, and no listing or ownership was changed.`,
    };
  }
  switch (result.status) {
    case "paid":
      return {
        tone: "warning",
        title: "Payment not confirmed",
        description:
          "The server has not verified this payment. A paid-looking checkout response is not proof of payment. Recheck payment before considering this test complete.",
      };
    case "pending":
      return {
        tone: "neutral",
        title: "Payment pending — test not complete",
        description:
          "The server reports a pending payment. Wait a moment, then recheck payment. Do not treat this as a successful test.",
      };
    case "authorized":
      return {
        tone: "warning",
        title: "Authorized, not paid",
        description:
          "The server reports an authorization only, not a completed payment. This test is not confirmed as paid. You can recheck payment.",
      };
    case "refunded":
      return {
        tone: "warning",
        title: "Refunded — not a paid test",
        description:
          "The server reports that the test payment was refunded. This is not a currently paid payment. No platform credits or listing changes apply.",
      };
    case "cancelled":
      return {
        tone: "neutral",
        title: "Test payment cancelled",
        description:
          "The server reports a cancelled payment. The test was not completed. Recheck this order or start another test when ready.",
      };
    case "expired":
      return {
        tone: "warning",
        title: "Test payment expired",
        description:
          "The server reports an expired test payment. It is not confirmed as paid. You can recheck this order or start a new test.",
      };
    case "failed":
      return {
        tone: "warning",
        title: "Test payment failed",
        description:
          "The server reports a failed payment. No success has been recorded here. Recheck this order or try another test with the official sandbox fixtures.",
      };
  }
}

const PHASE_TEXT: Record<Exclude<Phase, null>, string> = {
  creating: "Creating your owned test order…",
  "loading-sdk": "Loading the official Cashfree test checkout (up to 10 seconds)…",
  checkout: "Cashfree TEST checkout is open. Complete or close the checkout to continue.",
  verifying: "Checking the owned test order with the server…",
};

export default function PaymentSandbox() {
  const { user, loading: authLoading, error: authError, refresh } = useAuth();
  const statusQuery = trpc.paymentSandbox.status.useQuery(undefined, {
    enabled: !!user,
  });
  const createOrder = trpc.paymentSandbox.createOrder.useMutation();
  const verify = trpc.paymentSandbox.verify.useMutation();
  const [phase, setPhase] = useState<Phase>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [hasOwnedOrder, setHasOwnedOrder] = useState(false);
  const [accessRefreshing, setAccessRefreshing] = useState(false);
  const mounted = useRef(true);
  const mutex = useRef(false);
  const ownedOrder = useRef<OwnedOrder | null>(null);
  const currentUserId = useRef<string | number | null>(user?.id ?? null);
  const currentAvailability = useRef(false);

  const status = isSandboxStatus(statusQuery.data) ? statusQuery.data : null;
  const ready =
    !!user &&
    !authLoading &&
    !statusQuery.isError &&
    status?.enabled === true &&
    status?.configured === true;
  currentUserId.current = user?.id ?? null;
  currentAvailability.current = ready;
  const busy = phase !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // No payment data survives this mounted page. Do not persist the context.
      ownedOrder.current = null;
    };
  }, []);

  useEffect(() => {
    ownedOrder.current = null;
    setHasOwnedOrder(false);
    setFeedback(null);
    setCheckoutNotice(null);
  }, [user?.id]);

  function activeFor(ownerId: string | number): boolean {
    return mounted.current && currentUserId.current === ownerId;
  }

  async function verifyOwned(order: OwnedOrder): Promise<void> {
    if (!activeFor(order.ownerId)) return;
    setPhase("verifying");
    try {
      const result: unknown = await verify.mutateAsync({
        context: order.context,
        orderId: order.orderId,
      });
      if (!activeFor(order.ownerId) || ownedOrder.current !== order) return;
      if (!isVerification(result, order.orderId)) {
        setFeedback({
          tone: "warning",
          title: "Payment verification could not be trusted",
          description:
            "The server response did not match this fixed-amount, test-only order. No payment success has been confirmed. Recheck payment or contact an administrator.",
        });
        return;
      }
      setFeedback(verificationFeedback(result));
    } catch {
      if (!activeFor(order.ownerId)) return;
      setFeedback({
        tone: "warning",
        title: "Could not verify payment",
        description:
          "The server status check did not finish successfully. Payment is not confirmed. Use Recheck payment to check this same owned order without creating another checkout.",
      });
    }
  }

  async function startCheckout(): Promise<void> {
    if (mutex.current || !ready || !user) return;
    const ownerId = user.id;
    mutex.current = true;
    ownedOrder.current = null;
    setHasOwnedOrder(false);
    setFeedback(null);
    setCheckoutNotice(null);
    setPhase("creating");
    try {
      const result: unknown = await createOrder.mutateAsync(undefined);
      if (!activeFor(ownerId)) return;
      assertSandboxOrder(result);
      const order: OwnedOrder = {
        ownerId,
        orderId: result.orderId,
        context: result.context,
      };
      ownedOrder.current = order;
      setHasOwnedOrder(true);
      let notice: string | null = null;
      try {
        if (!currentAvailability.current) {
          throw new CashfreeCheckoutError(
            "Test checkout is no longer available for this account. Checkout was not opened."
          );
        }
        setPhase("loading-sdk");
        const outcome = await openCashfreeSandboxCheckout(
          result.paymentSessionId,
          () => {
            if (!activeFor(ownerId) || !currentAvailability.current) {
              throw new CashfreeCheckoutError(
                "Your authenticated test access changed. Checkout was not opened."
              );
            }
            assertSandboxOrder(result);
            setPhase("checkout");
          }
        );
        if (outcome.redirected) {
          notice =
            "Cashfree reported an in-app-browser redirect. Return to this page after checkout and use Recheck payment if this owned order is still available. A redirect is not payment confirmation. Reloading or leaving the page clears the local recheck context.";
        } else if (outcome.hadError) {
          notice =
            "Checkout was closed or reported an error. Closing the modal does not tell us whether payment was made; the server status below is authoritative.";
        } else {
          notice =
            "Checkout returned. SDK completion or payment details alone do not confirm payment; only the server verification below can do that.";
        }
      } catch (error: unknown) {
        notice =
          error instanceof CashfreeCheckoutError
            ? error.message
            : "Test checkout could not finish. Payment is not confirmed; the server must check this order.";
      }
      if (!activeFor(ownerId)) return;
      setCheckoutNotice(notice);
      // Always verify the owned context, including modal close/error/redirect.
      await verifyOwned(order);
    } catch (error: unknown) {
      if (!activeFor(ownerId)) return;
      setFeedback({
        tone: "warning",
        title: "Could not start test checkout",
        description:
          error instanceof CashfreeCheckoutError
            ? error.message
            : "The server could not create a valid test order. No payment success has been confirmed. Retry when test access and configuration are available.",
      });
    } finally {
      mutex.current = false;
      if (mounted.current) setPhase(null);
    }
  }

  async function recheckPayment(): Promise<void> {
    const order = ownedOrder.current;
    if (
      mutex.current ||
      !order ||
      authLoading ||
      !activeFor(order.ownerId)
    ) {
      return;
    }
    mutex.current = true;
    try {
      await verifyOwned(order);
    } finally {
      mutex.current = false;
      if (mounted.current) setPhase(null);
    }
  }

  async function retryAccess(): Promise<void> {
    if (mutex.current || accessRefreshing) return;
    mutex.current = true;
    setAccessRefreshing(true);
    try {
      if (!user) await refresh();
      else await statusQuery.refetch();
    } catch {
      // The native query error state provides the retry UI. No raw error text.
    } finally {
      mutex.current = false;
      if (mounted.current) setAccessRefreshing(false);
    }
  }

  let accessTitle = "Cashfree TEST checkout ready";
  let accessDescription =
    "Your account can open the official sandbox checkout. Only the server can confirm the test payment.";
  if (authLoading) {
    accessTitle = "Checking sign-in…";
    accessDescription = "Sign-in is required before any test order or checkout can be opened.";
  } else if (!user) {
    accessTitle = authError ? "Could not check sign-in" : "Sign in to test payments";
    accessDescription = authError
      ? "Your authentication check could not finish. Retry it or sign in to continue."
      : "This gateway test is available only to signed-in accounts with test access. No checkout SDK loads until you explicitly start an enabled, configured test.";
  } else if (statusQuery.isLoading) {
    accessTitle = "Checking test availability…";
    accessDescription = "Waiting for the server to confirm test access and sandbox configuration.";
  } else if (statusQuery.isError) {
    accessTitle = "Could not check test availability";
    accessDescription = "Checkout is blocked until the server confirms access. Retry the availability check.";
  } else if (!status) {
    accessTitle = "Test checkout unavailable";
    accessDescription = "The server has not confirmed a valid test-only configuration. Checkout stays disabled; ask an administrator to review setup.";
  } else if (!status.enabled) {
    accessTitle = "Test access is not enabled";
    accessDescription = "This test feature is off by default. An administrator must enable or invite your account to gateway testing. Availability here does not grant live payment eligibility.";
  } else if (!status.configured) {
    accessTitle = "Sandbox setup is pending";
    accessDescription = "An administrator must finish Cashfree sandbox key and account setup before checkout is available. Do not enter or share credentials on this page.";
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft aria-hidden="true" />
          Back to dashboard
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
            <FlaskConical className="mr-1 size-3" aria-hidden="true" />
            Cashfree TEST only
          </Badge>
          <Badge variant="secondary">Gateway test · no platform purchase</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Payment sandbox</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Test the Cashfree checkout with a fixed {TEST_AMOUNT} INR sandbox order.
          This is not a live payment, credit purchase, or battery listing transaction.
        </p>
      </header>

      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardContent className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-medium">No real money. No credits. No listing or ownership changes.</p>
            <p className="text-muted-foreground">
              All orders on this page must use Cashfree sandbox mode, {TEST_AMOUNT} INR,
              and the gateway-test-only scope. Use only official test payment details in the Cashfree modal.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card aria-busy={busy || accessRefreshing}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-emerald-400" aria-hidden="true" />
              Test checkout
            </CardTitle>
            <CardDescription>The amount and currency cannot be changed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sandbox amount</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{TEST_AMOUNT}</p>
              </div>
              <p className="pb-1 text-sm font-medium text-muted-foreground">INR · fixed</p>
            </div>

            <div role="status" aria-live="polite" aria-atomic="true" className="space-y-1 text-sm">
              <p className="font-medium">{accessTitle}</p>
              <p className="leading-relaxed text-muted-foreground">{accessDescription}</p>
            </div>

            {!authLoading && !user && (
              <Button asChild className="w-full">
                <Link href={SIGN_IN_URL}>Sign in to continue</Link>
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!ready || busy || accessRefreshing || statusQuery.isFetching}
              onClick={() => void startCheckout()}
              aria-describedby="payment-test-safety"
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FlaskConical aria-hidden="true" />}
              {busy ? "Test in progress…" : `Open Cashfree TEST checkout · ${TEST_AMOUNT}`}
            </Button>
            <p id="payment-test-safety" className="text-xs leading-relaxed text-muted-foreground">
              The official checkout SDK loads only after this button is clicked and the
              server confirms authenticated, enabled, configured sandbox access.
            </p>

            {!authLoading && !ready && (user || authError) && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy || accessRefreshing || statusQuery.isFetching}
                onClick={() => void retryAccess()}
              >
                <RefreshCw className={accessRefreshing ? "animate-spin" : ""} aria-hidden="true" />
                {accessRefreshing ? "Checking access…" : user ? "Retry availability check" : "Retry sign-in check"}
              </Button>
            )}

            <div role="status" aria-live="polite" aria-atomic="true" className="space-y-3">
              {phase && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
                  {PHASE_TEXT[phase]}
                </p>
              )}
              {checkoutNotice && <p className="text-sm leading-relaxed text-muted-foreground">{checkoutNotice}</p>}
              {feedback && (
                <div
                  className={`rounded-lg border p-4 text-sm ${
                    feedback.tone === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : feedback.tone === "warning"
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border bg-muted/20"
                  }`}
                >
                  <p className="flex items-start gap-2 font-medium">
                    {feedback.tone === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />}
                    {feedback.title}
                  </p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{feedback.description}</p>
                </div>
              )}
            </div>

            {hasOwnedOrder && user && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy || authLoading || accessRefreshing}
                  onClick={() => void recheckPayment()}
                >
                  <RefreshCw aria-hidden="true" />
                  Recheck payment
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Rechecks use only your current owned test order; they do not open checkout.
                  Starting another test replaces it. Leaving or reloading this page clears
                  the in-memory recheck context. No payment context or session is saved in browser storage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="size-5 text-emerald-400" aria-hidden="true" />
                Official sandbox test methods
              </CardTitle>
              <CardDescription>Enter test details in Cashfree's checkout, not in this app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="leading-relaxed text-muted-foreground">
                These are public sandbox UPI fixtures, not real bank accounts or personal payment addresses.
                If UPI testing is available in the modal, use:
              </p>
              <dl className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Simulate success (still requires server verification)</dt>
                  <dd className="mt-1 break-all font-mono text-sm">testsuccess@gocash</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Simulate failure</dt>
                  <dd className="mt-1 break-all font-mono text-sm">testfailure@gocash</dd>
                </div>
              </dl>
              <a
                href={TEST_METHODS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded text-emerald-400 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Official Cashfree test-method reference
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Cashfree handles any card fields and payment-method availability. Use its current official
                fixtures; do not use real card, bank, or UPI details here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="size-5 text-emerald-400" aria-hidden="true" />
                Future global payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Live payment account eligibility is not enabled by this test. Administrator setup,
                provider approval, and account eligibility must be handled separately.
              </p>
              <p>
                Multi-currency support is a future capability. This page tests INR only; no foreign-exchange
                conversion, rates, or global payment availability are offered or promised.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
