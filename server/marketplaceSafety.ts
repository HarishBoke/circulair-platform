import { TRPCError } from "@trpc/server";

/** No environment toggle: real-money actions remain unavailable pending release evidence. */
export const MARKETPLACE_MONEY_UNAVAILABLE =
  "Payments, purchase and seller acceptance are unavailable pending verified reservation, settlement, refund and payout evidence.";

// Void keeps dormant legacy branches typecheckable; execution still always throws before side effects.
export function blockMarketplaceMoneyAction(): void {
  throw new TRPCError({ code: "FORBIDDEN", message: MARKETPLACE_MONEY_UNAVAILABLE });
}

export function requireMarketplaceId(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid marketplace resource identifier" });
  }
}

type BatteryOwnership = { id: number; bpan: string; ownerId: number | null; registeredById?: number | null };
type ListingOwnership = { id: number; sellerId: number; status: string };
type OfferBinding = { id: number; listingId: number; buyerId: number; status: string };

/** Registration history or an admin role is not proof of current authority to sell. */
export function requireOwnedBatteryForListing(
  battery: BatteryOwnership | null | undefined,
  input: { batteryId: number; bpan: string },
  sellerId: number,
): BatteryOwnership {
  requireMarketplaceId(input.batteryId);
  requireMarketplaceId(sellerId);
  if (!battery || battery.id !== input.batteryId || battery.ownerId !== sellerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Current battery ownership is required to list" });
  }
  if (!battery.bpan || battery.bpan !== input.bpan) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Battery and BPAN must identify the same record" });
  }
  return battery;
}

export function requireListingOwner(
  listing: ListingOwnership | null | undefined,
  listingId: number,
  sellerId: number,
): ListingOwnership {
  requireMarketplaceId(listingId);
  requireMarketplaceId(sellerId);
  if (!listing || listing.id !== listingId || listing.sellerId !== sellerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your listing" });
  }
  return listing;
}

export function requireOwnedListingPhoto(
  listing: ListingOwnership | null | undefined,
  photo: { id: number; listingId: number } | null | undefined,
  input: { listingId: number; photoId: number },
  sellerId: number,
): void {
  requireListingOwner(listing, input.listingId, sellerId);
  requireMarketplaceId(input.photoId);
  if (!photo || photo.id !== input.photoId || photo.listingId !== input.listingId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found on this listing" });
  }
}

/** Necessary binding checks only; this is not checkout/reservation/settlement authorization. */
export function requireBoundAcceptedOffer(
  listing: ListingOwnership | null | undefined,
  offer: OfferBinding | null | undefined,
  input: { listingId: number; offerId: number },
  buyerId: number,
): void {
  requireMarketplaceId(input.listingId);
  requireMarketplaceId(input.offerId);
  requireMarketplaceId(buyerId);
  if (!listing || listing.id !== input.listingId || !offer || offer.id !== input.offerId || offer.listingId !== listing.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Offer and listing must identify the same transaction" });
  }
  if (offer.buyerId !== buyerId || listing.sellerId === buyerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Buyer does not own this offer or is the seller" });
  }
  if (offer.status !== "accepted" || listing.status !== "active") {
    throw new TRPCError({ code: "CONFLICT", message: "A seller-accepted offer and active listing are required; reservations need separate ownership evidence" });
  }
}

export function requireWithdrawableListing(listing: ListingOwnership, listingId: number, sellerId: number): void {
  requireListingOwner(listing, listingId, sellerId);
  if (listing.status !== "active") {
    throw new TRPCError({ code: "CONFLICT", message: "Only an active, unreserved listing may be withdrawn" });
  }
}
