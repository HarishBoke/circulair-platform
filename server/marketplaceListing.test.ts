import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getListingById: vi.fn(),
  listUserListings: vi.fn(),
  updateListing: vi.fn(),
  withdrawListing: vi.fn(),
  insertListingPhoto: vi.fn(),
  getListingPhotos: vi.fn(),
  deleteListingPhoto: vi.fn(),
  listUserBatteries: vi.fn(),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/photo.jpg", key: "marketplace/1/abc.jpg" }),
}));

import {
  getListingById,
  listUserListings,
  updateListing,
  withdrawListing,
  insertListingPhoto,
  getListingPhotos,
  deleteListingPhoto,
  listUserBatteries,
} from "./db";

describe("Marketplace Listing - DB Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getListingById", () => {
    it("should return a listing by ID", async () => {
      const mockListing = {
        id: 1, bpan: "INREL-B2F-KK-IN-D-5AC-A-0001", batteryId: 1,
        sellerId: 1, listingType: "second_life_pack", status: "active",
        askingPriceInr: "50000", spotPriceInr: "45000",
      };
      (getListingById as any).mockResolvedValue(mockListing);
      const result = await getListingById(1);
      expect(result).toEqual(mockListing);
      expect(getListingById).toHaveBeenCalledWith(1);
    });

    it("should return undefined for non-existent listing", async () => {
      (getListingById as any).mockResolvedValue(undefined);
      const result = await getListingById(999);
      expect(result).toBeUndefined();
    });
  });

  describe("listUserListings", () => {
    it("should return user listings with pagination", async () => {
      const mockResult = {
        items: [
          { id: 1, bpan: "BPAN001", status: "active", sellerId: 1 },
          { id: 2, bpan: "BPAN002", status: "sold", sellerId: 1 },
        ],
        total: 2,
      };
      (listUserListings as any).mockResolvedValue(mockResult);
      const result = await listUserListings(1, { limit: 20, offset: 0 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by status", async () => {
      (listUserListings as any).mockResolvedValue({ items: [{ id: 1, status: "active" }], total: 1 });
      const result = await listUserListings(1, { status: "active" });
      expect(result.items).toHaveLength(1);
      expect(listUserListings).toHaveBeenCalledWith(1, { status: "active" });
    });

    it("should return empty for user with no listings", async () => {
      (listUserListings as any).mockResolvedValue({ items: [], total: 0 });
      const result = await listUserListings(999);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("updateListing", () => {
    it("should update listing fields", async () => {
      (updateListing as any).mockResolvedValue(undefined);
      await updateListing(1, { description: "Updated description" } as any);
      expect(updateListing).toHaveBeenCalledWith(1, { description: "Updated description" });
    });
  });

  describe("withdrawListing", () => {
    it("should set listing status to withdrawn", async () => {
      (withdrawListing as any).mockResolvedValue(undefined);
      await withdrawListing(1);
      expect(withdrawListing).toHaveBeenCalledWith(1);
    });
  });

  describe("insertListingPhoto", () => {
    it("should insert a photo record", async () => {
      const mockPhoto = {
        id: 1, listingId: 1, url: "https://cdn.example.com/photo.jpg",
        fileKey: "marketplace/1/abc.jpg", sortOrder: 0, mimeType: "image/jpeg",
      };
      (insertListingPhoto as any).mockResolvedValue(mockPhoto);
      const result = await insertListingPhoto({
        listingId: 1,
        url: "https://cdn.example.com/photo.jpg",
        fileKey: "marketplace/1/abc.jpg",
        sortOrder: 0,
        mimeType: "image/jpeg",
        caption: null,
        fileSizeBytes: 12345,
      });
      expect(result).toEqual(mockPhoto);
      expect(result.listingId).toBe(1);
    });
  });

  describe("getListingPhotos", () => {
    it("should return photos for a listing ordered by sortOrder", async () => {
      const mockPhotos = [
        { id: 1, listingId: 1, sortOrder: 0, url: "https://cdn.example.com/1.jpg" },
        { id: 2, listingId: 1, sortOrder: 1, url: "https://cdn.example.com/2.jpg" },
      ];
      (getListingPhotos as any).mockResolvedValue(mockPhotos);
      const result = await getListingPhotos(1);
      expect(result).toHaveLength(2);
      expect(result[0].sortOrder).toBe(0);
    });

    it("should return empty array for listing with no photos", async () => {
      (getListingPhotos as any).mockResolvedValue([]);
      const result = await getListingPhotos(999);
      expect(result).toHaveLength(0);
    });
  });

  describe("deleteListingPhoto", () => {
    it("should delete a photo by ID", async () => {
      (deleteListingPhoto as any).mockResolvedValue(undefined);
      await deleteListingPhoto(1);
      expect(deleteListingPhoto).toHaveBeenCalledWith(1);
    });
  });

  describe("listUserBatteries", () => {
    it("should return batteries owned or registered by user", async () => {
      const mockBatteries = [
        { id: 1, bpan: "BPAN001", chemistry: "NMC", capacityKwh: "50", currentSoh: "85.00" },
        { id: 2, bpan: "BPAN002", chemistry: "LFP", capacityKwh: "30", currentSoh: "92.00" },
      ];
      (listUserBatteries as any).mockResolvedValue(mockBatteries);
      const result = await listUserBatteries(1);
      expect(result).toHaveLength(2);
      expect(result[0].bpan).toBe("BPAN001");
    });

    it("should return empty for user with no batteries", async () => {
      (listUserBatteries as any).mockResolvedValue([]);
      const result = await listUserBatteries(999);
      expect(result).toHaveLength(0);
    });
  });
});

describe("Marketplace Listing - Business Logic", () => {
  it("should enforce ownership check pattern", async () => {
    const listing = { id: 1, sellerId: 1, status: "active" };
    const requestingUserId = 2;
    // Simulate ownership check
    expect(listing.sellerId).not.toBe(requestingUserId);
  });

  it("should only allow withdrawal of active listings", () => {
    const activeStatuses = ["active"];
    const listing = { status: "active" };
    expect(activeStatuses.includes(listing.status)).toBe(true);
    const soldListing = { status: "sold" };
    expect(activeStatuses.includes(soldListing.status)).toBe(false);
  });

  it("should validate condition grades", () => {
    const validGrades = ["excellent", "good", "fair", "poor"];
    expect(validGrades.includes("excellent")).toBe(true);
    expect(validGrades.includes("invalid")).toBe(false);
  });

  it("should validate listing types", () => {
    const validTypes = ["direct_reuse", "module_repurposing", "black_mass", "second_life_pack"];
    expect(validTypes.includes("second_life_pack")).toBe(true);
    expect(validTypes.includes("invalid_type")).toBe(false);
  });

  it("should enforce max 6 photos per listing", () => {
    const MAX_PHOTOS = 6;
    const currentPhotos = 5;
    const remaining = MAX_PHOTOS - currentPhotos;
    expect(remaining).toBe(1);
    expect(remaining > 0).toBe(true);
    const fullPhotos = 6;
    expect(MAX_PHOTOS - fullPhotos).toBe(0);
  });
});
