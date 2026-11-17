import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  blockMarketplaceMoneyAction, requireMarketplaceId, requireOwnedBatteryForListing,
  requireListingOwner, requireOwnedListingPhoto, requireBoundAcceptedOffer, requireWithdrawableListing,
} from "./marketplaceSafety";
import { generateApiKey, parsePermissions, hasPermission, hashApiKey } from "./apiMarketplace";

const battery = { id: 10, bpan: "PILOT-CANONICAL-BPAN", ownerId: 42, registeredById: 7 };
const listing = { id: 20, sellerId: 42, status: "active" };
const offer = { id: 30, listingId: 20, buyerId: 8, status: "accepted" };
const binding = { listingId: 20, offerId: 30 };
const page = (name: string) => readFileSync(resolve(process.cwd(), `client/src/pages/${name}.tsx`), "utf8");

function rejects(fn: () => unknown, code: string) {
  expect(fn).toThrow(expect.objectContaining({ code }));
}

describe("marketplace offline authorization boundary (not payment certification)", () => {
  it("blocks money actions unconditionally", () => rejects(blockMarketplaceMoneyAction, "FORBIDDEN"));
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid resource ID %s", (id) => rejects(() => requireMarketplaceId(id), "BAD_REQUEST"));
  it("accepts canonical current ownership", () => expect(requireOwnedBatteryForListing(battery, { batteryId: 10, bpan: battery.bpan }, 42)).toBe(battery));
  it("rejects foreign-owner listing even when caller registered the battery", () => rejects(() => requireOwnedBatteryForListing(battery, { batteryId: 10, bpan: battery.bpan }, 7), "FORBIDDEN"));
  it("rejects unknown ownership rather than falling back to registration", () => rejects(() => requireOwnedBatteryForListing({ ...battery, ownerId: null }, { batteryId: 10, bpan: battery.bpan }, 7), "FORBIDDEN"));
  it("rejects a mismatched canonical BPAN", () => rejects(() => requireOwnedBatteryForListing(battery, { batteryId: 10, bpan: "OTHER" }, 42), "BAD_REQUEST"));
  it("rejects a mismatched battery ID", () => rejects(() => requireOwnedBatteryForListing(battery, { batteryId: 11, bpan: battery.bpan }, 42), "FORBIDDEN"));
  it("rejects missing battery", () => rejects(() => requireOwnedBatteryForListing(undefined, { batteryId: 10, bpan: battery.bpan }, 42), "FORBIDDEN"));
  it("requires exact listing ID and seller", () => {
    expect(requireListingOwner(listing, 20, 42)).toBe(listing);
    rejects(() => requireListingOwner(listing, 21, 42), "FORBIDDEN");
    rejects(() => requireListingOwner(listing, 20, 8), "FORBIDDEN");
  });
  it("accepts an exact owned listing/photo pair", () => expect(requireOwnedListingPhoto(listing, { id: 40, listingId: 20 }, { listingId: 20, photoId: 40 }, 42)).toBeUndefined());
  it("rejects cross-listing photo deletion", () => rejects(() => requireOwnedListingPhoto(listing, { id: 40, listingId: 99 }, { listingId: 20, photoId: 40 }, 42), "NOT_FOUND"));
  it("rejects wrong or absent photo ID", () => {
    rejects(() => requireOwnedListingPhoto(listing, { id: 41, listingId: 20 }, { listingId: 20, photoId: 40 }, 42), "NOT_FOUND");
    rejects(() => requireOwnedListingPhoto(listing, undefined, { listingId: 20, photoId: 40 }, 42), "NOT_FOUND");
  });
  it("requires owned listing before checking photo existence", () => rejects(() => requireOwnedListingPhoto(listing, { id: 40, listingId: 20 }, { listingId: 20, photoId: 40 }, 8), "FORBIDDEN"));
  it("passes necessary accepted-offer binding without enabling checkout", () => {
    expect(requireBoundAcceptedOffer(listing, offer, binding, 8)).toBeUndefined();
    rejects(blockMarketplaceMoneyAction, "FORBIDDEN");
  });
  it("rejects unrelated listing/offer binding", () => rejects(() => requireBoundAcceptedOffer(listing, { ...offer, listingId: 99 }, binding, 8), "BAD_REQUEST"));
  it("rejects mismatched offer ID", () => rejects(() => requireBoundAcceptedOffer(listing, offer, { ...binding, offerId: 31 }, 8), "BAD_REQUEST"));
  it("rejects foreign buyer and self purchase", () => {
    rejects(() => requireBoundAcceptedOffer(listing, offer, binding, 9), "FORBIDDEN");
    rejects(() => requireBoundAcceptedOffer(listing, { ...offer, buyerId: 42 }, binding, 42), "FORBIDDEN");
  });
  it.each(["pending", "rejected", "withdrawn", "expired"])("rejects nonaccepted offer %s", (status) => rejects(() => requireBoundAcceptedOffer(listing, { ...offer, status }, binding, 8), "CONFLICT"));
  it.each(["reserved", "sold", "withdrawn", "expired"])("rejects unsupported checkout listing state %s", (status) => rejects(() => requireBoundAcceptedOffer({ ...listing, status }, offer, binding, 8), "CONFLICT"));
  it.each(["reserved", "sold", "withdrawn", "expired"])("rejects withdrawal from %s", (status) => rejects(() => requireWithdrawableListing({ ...listing, status }, 20, 42), "CONFLICT"));
  it("allows active owned withdrawal precheck only", () => expect(requireWithdrawableListing(listing, 20, 42)).toBeUndefined());
});

describe("developer API local contracts (no account/key persisted)", () => {
  it("fits the existing PostgreSQL display-prefix contract without reducing secret entropy", () => {
    const key = generateApiKey(); // Ephemeral local material only; never emitted or persisted.
    expect(key.prefix).toHaveLength(12);
    expect(key.plaintext).toMatch(/^cai_live_[0-9a-f]{48}$/);
    expect(key.hash).toHaveLength(64);
    expect(hashApiKey(key.plaintext)).toBe(key.hash);
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    expect(schema).toContain('keyPrefix: varchar("keyPrefix", { length: 12 })');
  });
  it("understands the canonical persisted JSON scope array", () => expect(hasPermission(["marketplace_read", "telemetry_read"], "marketplace_read")).toBe(true));
  it("supports legacy comma scopes without duplicates", () => expect(parsePermissions(" marketplace_read,marketplace_read, unknown ")).toEqual(["marketplace_read"]));
  it.each([null, undefined, {}, 5, "*", ["*", 1], '["marketplace_read"]'])("denies malformed scopes %#", (scopes) => expect(hasPermission(scopes, "marketplace_read")).toBe(false));
});

describe("owned marketplace UI static safety contracts", () => {
  it.each(["Marketplace", "MarketplaceCreate", "MarketplaceDetail"])("%s contains no marketplace write mutation", (name) => {
    expect(page(name)).not.toMatch(/marketplace\.[A-Za-z]+\.useMutation/);
    expect(page(name)).toMatch(/unavailable/i);
  });
  it("detail no longer opens checkout or promises identity verification", () => {
    const source = page("MarketplaceDetail");
    expect(source).not.toContain("window.open");
    expect(source).not.toContain("Identity Verified");
    expect(source).not.toContain("Submit Offer & Pay");
    expect(source).toContain("Purchase unavailable");
  });
  it("payment return never trusts or renders query/session success", () => {
    const source = page("PaymentSuccess");
    expect(source).not.toMatch(/useSearch|URLSearchParams|params\.get|Payment Successful|payment has been processed successfully/);
    expect(source).toContain("Payment not verified");
    expect(source).toContain("Do not retry payment");
  });
  it("preparation has no publication/upload success claim", () => {
    const source = page("MarketplaceCreate");
    expect(source).not.toMatch(/listed successfully|Listing Published|fileToBase64|FileReader/);
    expect(source).toContain("Publication unavailable");
    expect(source).toContain("nothing is saved or uploaded");
  });
});
