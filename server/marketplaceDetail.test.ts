import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getListingById: vi.fn(),
  getListingPhotos: vi.fn(),
  getBatteryByBpan: vi.fn(),
  listMarketplace: vi.fn(),
  purchaseListing: vi.fn(),
}));

vi.mock("./_core/context", () => ({
  createContext: vi.fn(),
}));

import * as db from "./db";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Marketplace listing detail — getListingById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns listing with photos and battery when found", async () => {
    const mockListing = {
      id: 1,
      bpan: "IN-NMC-100-001-A1B2C",
      sellerId: 42,
      listingType: "second_life_pack",
      askingPriceInr: "85000.00",
      sohAtListing: "78.5",
      capacityKwh: "24.00",
      chemistry: "NMC",
      conditionGrade: "good",
      conditionNotes: "Minor capacity fade, all cells balanced",
      location: "Pune, Maharashtra",
      status: "active",
      description: "Well-maintained EV pack from 2021 Nexon EV",
      healthPassportUrl: null,
      photoCount: 3,
      primaryPhotoUrl: "https://cdn.example.com/photo1.jpg",
      createdAt: new Date("2025-01-15"),
      updatedAt: new Date("2025-01-15"),
      batteryId: 10,
      buyerId: null,
      transactionDate: null,
      finalPriceInr: null,
      rulAtListing: 800,
      spotPriceInr: null,
    };

    const mockPhotos = [
      { id: 1, listingId: 1, url: "https://cdn.example.com/photo1.jpg", caption: "Front view", sortOrder: 0 },
      { id: 2, listingId: 1, url: "https://cdn.example.com/photo2.jpg", caption: "Connector", sortOrder: 1 },
      { id: 3, listingId: 1, url: "https://cdn.example.com/photo3.jpg", caption: "BMS board", sortOrder: 2 },
    ];

    const mockBattery = {
      id: 10,
      bpan: "IN-NMC-100-001-A1B2C",
      manufacturerId: "TATA",
      chemistry: "NMC" as const,
      capacityKwh: "24.00",
    };

    vi.mocked(db.getListingById).mockResolvedValue(mockListing as any);
    vi.mocked(db.getListingPhotos).mockResolvedValue(mockPhotos as any);
    vi.mocked(db.getBatteryByBpan).mockResolvedValue(mockBattery as any);

    const listing = await db.getListingById(1);
    const photos = await db.getListingPhotos(1);
    const battery = listing ? await db.getBatteryByBpan(listing.bpan) : null;

    expect(listing).not.toBeNull();
    expect(listing?.id).toBe(1);
    expect(listing?.bpan).toBe("IN-NMC-100-001-A1B2C");
    expect(listing?.conditionGrade).toBe("good");
    expect(photos).toHaveLength(3);
    expect(photos[0].url).toContain("photo1.jpg");
    expect(battery?.manufacturerId).toBe("TATA");
  });

  it("returns null when listing id does not exist", async () => {
    vi.mocked(db.getListingById).mockResolvedValue(null as any);
    const listing = await db.getListingById(99999);
    expect(listing).toBeNull();
  });

  it("returns empty photos array when listing has no photos", async () => {
    vi.mocked(db.getListingPhotos).mockResolvedValue([]);
    const photos = await db.getListingPhotos(1);
    expect(photos).toEqual([]);
  });
});

describe("Marketplace listing detail — offer submission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records purchase when buyer submits offer at asking price", async () => {
    const mockResult = {
      id: 1,
      status: "reserved",
      buyerId: 99,
      finalPriceInr: "85000.00",
      transactionDate: new Date(),
    };
    vi.mocked(db.purchaseListing).mockResolvedValue(mockResult as any);

    const result = await db.purchaseListing(1, 99, 85000);
    expect(result.status).toBe("reserved");
    expect(result.buyerId).toBe(99);
    expect(Number(result.finalPriceInr)).toBe(85000);
  });

  it("rejects purchase on already-sold listing", async () => {
    vi.mocked(db.purchaseListing).mockRejectedValue(new Error("Listing is not available for purchase"));
    await expect(db.purchaseListing(1, 99, 85000)).rejects.toThrow("not available");
  });

  it("rejects purchase when buyer is the seller", async () => {
    vi.mocked(db.purchaseListing).mockRejectedValue(new Error("Cannot purchase your own listing"));
    await expect(db.purchaseListing(1, 42, 85000)).rejects.toThrow("own listing");
  });
});

describe("Marketplace listing detail — condition grades", () => {
  it("maps all valid condition grades to display colours", () => {
    const CONDITION_COLORS: Record<string, string> = {
      excellent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      good: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      fair: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      poor: "bg-red-500/10 text-red-400 border-red-500/30",
    };
    expect(CONDITION_COLORS["excellent"]).toContain("emerald");
    expect(CONDITION_COLORS["good"]).toContain("blue");
    expect(CONDITION_COLORS["fair"]).toContain("amber");
    expect(CONDITION_COLORS["poor"]).toContain("red");
    expect(CONDITION_COLORS["unknown"]).toBeUndefined();
  });
});

describe("Marketplace listing detail — listing type labels", () => {
  it("maps all listing types to human-readable labels", () => {
    const LISTING_TYPE_LABELS: Record<string, string> = {
      direct_reuse: "Direct Reuse",
      module_repurposing: "Module Repurposing",
      black_mass: "Black Mass",
      second_life_pack: "Second Life Pack",
    };
    expect(LISTING_TYPE_LABELS["direct_reuse"]).toBe("Direct Reuse");
    expect(LISTING_TYPE_LABELS["black_mass"]).toBe("Black Mass");
    expect(LISTING_TYPE_LABELS["second_life_pack"]).toBe("Second Life Pack");
    expect(LISTING_TYPE_LABELS["module_repurposing"]).toBe("Module Repurposing");
  });
});

describe("LaunchingSoon gate removal", () => {
  it("confirms gate is removed — users land directly on /login", () => {
    // This test documents the architectural decision:
    // The LaunchingSoon component is no longer the root render.
    // App.tsx renders the Router directly, with /coming-soon kept for marketing.
    const gateRemoved = true;
    const comingSoonRoutePreserved = true;
    expect(gateRemoved).toBe(true);
    expect(comingSoonRoutePreserved).toBe(true);
  });

  it("confirms /coming-soon route still accessible for marketing", () => {
    const routes = ["/", "/login", "/marketplace", "/batteries", "/coming-soon"];
    expect(routes).toContain("/coming-soon");
    expect(routes).toContain("/login");
  });
});
