/**
 * Stripe payment integration for marketplace settlement.
 *
 * Architecture:
 * - Buyer accepts an offer → createCheckoutSession() → Stripe Checkout page
 * - Stripe fires checkout.session.completed webhook → handleStripeWebhook()
 * - Webhook marks offer as paid, listing as sold, records payment intent ID
 *
 * We store only Stripe IDs locally (stripe_payment_intents table).
 * All amounts, card details, and receipt URLs are fetched from Stripe API on demand.
 */

import Stripe from "stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { stripePaymentIntents, marketplaceOffers, marketplaceListings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── DB helper ───────────────────────────────────────────────────────────────

async function requireDb() {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database connection unavailable");
  return dbConn;
}

// ─── Stripe client ────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  offerId: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  /** Amount in the smallest currency unit (e.g. paise for INR, cents for USD) */
  amountSmallestUnit: number;
  currency: string;
  /** Human-readable description shown on the Stripe checkout page */
  description: string;
  buyerEmail: string;
  buyerName: string;
  /** Frontend origin for success/cancel redirect URLs */
  origin: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  paymentIntentId: string;
}

// ─── Create Checkout Session ──────────────────────────────────────────────────

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSessionResult> {
  const stripe = getStripe();

  // Stripe minimum: $0.50 USD equivalent. For INR that's ~42 paise.
  // We enforce a minimum of 100 smallest units (₹1 / $1 / €1) to be safe.
  if (params.amountSmallestUnit < 100) {
    throw new Error(
      `Amount too small: ${params.amountSmallestUnit} ${params.currency}. Minimum is 100 smallest units.`
    );
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.buyerEmail,
    client_reference_id: params.buyerId.toString(),
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.description,
            description: `Marketplace offer #${params.offerId} — Battery listing #${params.listingId}`,
          },
          unit_amount: params.amountSmallestUnit,
        },
        quantity: 1,
      },
    ],
    metadata: {
      offer_id: params.offerId.toString(),
      listing_id: params.listingId.toString(),
      buyer_id: params.buyerId.toString(),
      seller_id: params.sellerId.toString(),
      customer_email: params.buyerEmail,
      customer_name: params.buyerName,
    },
    success_url: `${params.origin}/marketplace/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/marketplace/${params.listingId}?payment=cancelled`,
  });

  if (!session.payment_intent) {
    throw new Error("Stripe did not return a payment_intent for this session");
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  // Persist the minimal record locally
  await (await requireDb()).insert(stripePaymentIntents).values({
    stripePaymentIntentId: paymentIntentId,
    stripeSessionId: session.id,
    offerId: params.offerId,
    listingId: params.listingId,
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    status: "pending",
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
    paymentIntentId,
  };
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<{ received: boolean; eventType?: string }> {
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, ENV.stripeWebhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  // Test events — return verification response immediately
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return { received: true, eventType: event.type };
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(pi.id);
      break;
    }
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentCancelled(pi.id);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return { received: true, eventType: event.type };
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const offerId = session.metadata?.offer_id ? parseInt(session.metadata.offer_id) : null;
  const listingId = session.metadata?.listing_id ? parseInt(session.metadata.listing_id) : null;
  const buyerId = session.metadata?.buyer_id ? parseInt(session.metadata.buyer_id) : null;

  if (!offerId || !listingId || !buyerId) {
    console.error("[Stripe Webhook] Missing metadata in checkout.session.completed", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error("[Stripe Webhook] No payment_intent in completed session", session.id);
    return;
  }

  const dbConn = await requireDb();
  // Update local payment intent record
  await dbConn
    .update(stripePaymentIntents)
    .set({ status: "succeeded", stripeSessionId: session.id })
    .where(eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId));

  // Mark offer as accepted and listing as sold
  await dbConn
    .update(marketplaceOffers)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(marketplaceOffers.id, offerId));

  await dbConn
    .update(marketplaceListings)
    .set({
      status: "sold",
      buyerId,
      transactionDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceListings.id, listingId));

  console.log(
    `[Stripe Webhook] Payment succeeded: offer #${offerId}, listing #${listingId} marked as sold`
  );
}

async function handlePaymentFailed(paymentIntentId: string) {
  const dbConn = await requireDb();
  await dbConn
    .update(stripePaymentIntents)
    .set({ status: "failed" })
    .where(eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId));
  console.log(`[Stripe Webhook] Payment failed: ${paymentIntentId}`);
}

async function handlePaymentCancelled(paymentIntentId: string) {
  const dbConn = await requireDb();
  await dbConn
    .update(stripePaymentIntents)
    .set({ status: "cancelled" })
    .where(eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId));
  console.log(`[Stripe Webhook] Payment cancelled: ${paymentIntentId}`);
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getPaymentByOfferId(offerId: number) {
  const dbConn = await requireDb();
  const rows = await dbConn
    .select()
    .from(stripePaymentIntents)
    .where(eq(stripePaymentIntents.offerId, offerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPaymentsByBuyerId(buyerId: number) {
  const dbConn = await requireDb();
  return dbConn
    .select()
    .from(stripePaymentIntents)
    .where(eq(stripePaymentIntents.buyerId, buyerId))
    .orderBy(stripePaymentIntents.createdAt);
}
