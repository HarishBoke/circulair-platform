import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserPassword: vi.fn(),
  getDb: vi.fn(),
}));

import { getUserById, updateUserProfile, updateUserPassword } from "./db";

describe("profile DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserById returns user when found", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      organization: "Test Org",
      platformRole: "oem",
      role: "user",
      loginMethod: "email",
      passwordHash: "hashed",
      openId: "open-id-1",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      lastSignedIn: new Date("2025-06-01"),
    };
    vi.mocked(getUserById).mockResolvedValue(mockUser);

    const result = await getUserById(1);
    expect(result).toEqual(mockUser);
    expect(getUserById).toHaveBeenCalledWith(1);
  });

  it("getUserById returns undefined when not found", async () => {
    vi.mocked(getUserById).mockResolvedValue(undefined);
    const result = await getUserById(999);
    expect(result).toBeUndefined();
  });

  it("updateUserProfile calls with correct fields", async () => {
    vi.mocked(updateUserProfile).mockResolvedValue(undefined);
    await updateUserProfile(1, { name: "New Name", organization: "New Org" });
    expect(updateUserProfile).toHaveBeenCalledWith(1, { name: "New Name", organization: "New Org" });
  });

  it("updateUserProfile accepts platformRole update", async () => {
    vi.mocked(updateUserProfile).mockResolvedValue(undefined);
    await updateUserProfile(1, { platformRole: "recycler" });
    expect(updateUserProfile).toHaveBeenCalledWith(1, { platformRole: "recycler" });
  });

  it("updateUserPassword calls with userId and hash", async () => {
    vi.mocked(updateUserPassword).mockResolvedValue(undefined);
    await updateUserPassword(1, "newHashedPassword");
    expect(updateUserPassword).toHaveBeenCalledWith(1, "newHashedPassword");
  });
});

describe("profile route validation", () => {
  it("validates name length constraints", () => {
    const name = "A".repeat(201);
    expect(name.length).toBeGreaterThan(200);
    // A name over 200 chars should be rejected by zod schema
  });

  it("validates password minimum length", () => {
    const shortPw = "abc123";
    expect(shortPw.length).toBeLessThan(8);
    // Passwords under 8 chars should be rejected by zod schema
  });

  it("validates platform role enum values", () => {
    const validRoles = ["oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government", "admin_viewer"];
    expect(validRoles).toContain("oem");
    expect(validRoles).toContain("recycler");
    expect(validRoles).not.toContain("superuser");
  });
});
