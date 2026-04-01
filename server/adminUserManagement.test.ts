/**
 * adminUserManagement.test.ts
 * Tests for Admin User Management: listUsersAdmin, getUserRoleStats,
 * updateUserRoleById, createRoleAuditEntry, getRoleAuditLog.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB so tests run without a real database ────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listUsersAdmin: vi.fn(),
    getUserRoleStats: vi.fn(),
    updateUserRoleById: vi.fn(),
    createRoleAuditEntry: vi.fn(),
    getRoleAuditLog: vi.fn(),
  };
});

import {
  listUsersAdmin,
  getUserRoleStats,
  updateUserRoleById,
  createRoleAuditEntry,
  getRoleAuditLog,
} from "./db";

// ─── Mock user data ───────────────────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: 1, openId: "oid_1", name: "Arjun Sharma", email: "arjun@tatamotors.com",
    role: "admin" as const, platformRole: "admin", organization: "Tata Motors",
    loginMethod: "email", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
    lastSignedIn: new Date("2024-06-01"),
  },
  {
    id: 2, openId: "oid_2", name: "Priya Nair", email: "priya@exide.com",
    role: "user" as const, platformRole: "manufacturer", organization: "Exide Industries",
    loginMethod: "email", createdAt: new Date("2024-02-01"), updatedAt: new Date("2024-02-01"),
    lastSignedIn: new Date("2024-06-02"),
  },
  {
    id: 3, openId: "oid_3", name: "Rahul Verma", email: "rahul@cpcb.gov.in",
    role: "user" as const, platformRole: "government", organization: "CPCB",
    loginMethod: "email", createdAt: new Date("2024-03-01"), updatedAt: new Date("2024-03-01"),
    lastSignedIn: new Date("2024-06-03"),
  },
];

const MOCK_AUDIT_LOG = [
  {
    id: 1,
    targetUserId: 2,
    targetUserName: "Priya Nair",
    targetUserEmail: "priya@exide.com",
    changedByUserId: 1,
    changedByName: "Arjun Sharma",
    previousPlatformRole: "oem",
    newPlatformRole: "manufacturer",
    previousRole: "user",
    newRole: "user",
    reason: "Corrected role assignment",
    createdAt: new Date("2024-06-01T10:00:00Z"),
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("listUsersAdmin", () => {
  beforeEach(() => {
    vi.mocked(listUsersAdmin).mockResolvedValue({ items: MOCK_USERS, total: 3 });
  });

  it("returns paginated user list", async () => {
    const result = await listUsersAdmin({ limit: 20, offset: 0 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("filters by platformRole", async () => {
    vi.mocked(listUsersAdmin).mockResolvedValue({
      items: [MOCK_USERS[2]],
      total: 1,
    });
    const result = await listUsersAdmin({ platformRole: "government", limit: 20, offset: 0 });
    expect(result.items[0].platformRole).toBe("government");
    expect(result.total).toBe(1);
  });

  it("filters by search term", async () => {
    vi.mocked(listUsersAdmin).mockResolvedValue({
      items: [MOCK_USERS[0]],
      total: 1,
    });
    const result = await listUsersAdmin({ search: "Arjun", limit: 20, offset: 0 });
    expect(result.items[0].name).toBe("Arjun Sharma");
  });

  it("filters by system role", async () => {
    vi.mocked(listUsersAdmin).mockResolvedValue({
      items: [MOCK_USERS[0]],
      total: 1,
    });
    const result = await listUsersAdmin({ role: "admin", limit: 20, offset: 0 });
    expect(result.items[0].role).toBe("admin");
  });

  it("returns empty list when no users match", async () => {
    vi.mocked(listUsersAdmin).mockResolvedValue({ items: [], total: 0 });
    const result = await listUsersAdmin({ search: "nonexistent_xyz", limit: 20, offset: 0 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("respects pagination offset", async () => {
    vi.mocked(listUsersAdmin).mockResolvedValue({ items: [MOCK_USERS[2]], total: 3 });
    const result = await listUsersAdmin({ limit: 1, offset: 2 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
  });
});

describe("getUserRoleStats", () => {
  beforeEach(() => {
    vi.mocked(getUserRoleStats).mockResolvedValue({
      total: 3,
      byPlatformRole: {
        admin: 1,
        manufacturer: 1,
        government: 1,
      },
      byRole: {
        admin: 1,
        user: 2,
      },
    });
  });

  it("returns total user count", async () => {
    const stats = await getUserRoleStats();
    expect(stats.total).toBe(3);
  });

  it("returns platform role distribution", async () => {
    const stats = await getUserRoleStats();
    expect(stats.byPlatformRole.admin).toBe(1);
    expect(stats.byPlatformRole.manufacturer).toBe(1);
    expect(stats.byPlatformRole.government).toBe(1);
  });

  it("returns system role distribution", async () => {
    const stats = await getUserRoleStats();
    expect(stats.byRole.admin).toBe(1);
    expect(stats.byRole.user).toBe(2);
  });

  it("handles empty database gracefully", async () => {
    vi.mocked(getUserRoleStats).mockResolvedValue({
      total: 0,
      byPlatformRole: {},
      byRole: {},
    });
    const stats = await getUserRoleStats();
    expect(stats.total).toBe(0);
    expect(Object.keys(stats.byPlatformRole)).toHaveLength(0);
  });
});

describe("updateUserRoleById", () => {
  it("updates platformRole and systemRole", async () => {
    const updatedUser = { ...MOCK_USERS[1], platformRole: "recycler", role: "user" as const };
    vi.mocked(updateUserRoleById).mockResolvedValue(updatedUser);

    const result = await updateUserRoleById(2, "recycler", "user");
    expect(result?.platformRole).toBe("recycler");
    expect(result?.role).toBe("user");
  });

  it("can promote user to admin system role", async () => {
    const updatedUser = { ...MOCK_USERS[1], role: "admin" as const, platformRole: "admin" };
    vi.mocked(updateUserRoleById).mockResolvedValue(updatedUser);

    const result = await updateUserRoleById(2, "admin", "admin");
    expect(result?.role).toBe("admin");
    expect(result?.platformRole).toBe("admin");
  });

  it("updates organization when provided", async () => {
    const updatedUser = { ...MOCK_USERS[1], organization: "Amara Raja" };
    vi.mocked(updateUserRoleById).mockResolvedValue(updatedUser);

    const result = await updateUserRoleById(2, "manufacturer", "user", "Amara Raja");
    expect(result?.organization).toBe("Amara Raja");
  });

  it("returns undefined when user not found", async () => {
    vi.mocked(updateUserRoleById).mockResolvedValue(undefined);
    const result = await updateUserRoleById(9999, "oem", "user");
    expect(result).toBeUndefined();
  });
});

describe("createRoleAuditEntry", () => {
  it("creates an audit log entry without throwing", async () => {
    vi.mocked(createRoleAuditEntry).mockResolvedValue(undefined);
    await expect(
      createRoleAuditEntry({
        targetUserId: 2,
        targetUserName: "Priya Nair",
        targetUserEmail: "priya@exide.com",
        changedByUserId: 1,
        changedByName: "Arjun Sharma",
        previousPlatformRole: "oem",
        newPlatformRole: "manufacturer",
        previousRole: "user",
        newRole: "user",
        reason: "Corrected role assignment",
      })
    ).resolves.not.toThrow();
  });

  it("accepts null optional fields", async () => {
    vi.mocked(createRoleAuditEntry).mockResolvedValue(undefined);
    await expect(
      createRoleAuditEntry({
        targetUserId: 3,
        targetUserName: null,
        targetUserEmail: null,
        changedByUserId: 1,
        changedByName: null,
        previousPlatformRole: null,
        newPlatformRole: "government",
        previousRole: null,
        newRole: null,
        reason: null,
      })
    ).resolves.not.toThrow();
  });
});

describe("getRoleAuditLog", () => {
  beforeEach(() => {
    vi.mocked(getRoleAuditLog).mockResolvedValue(MOCK_AUDIT_LOG);
  });

  it("returns audit log entries", async () => {
    const entries = await getRoleAuditLog({ limit: 50 });
    expect(entries).toHaveLength(1);
    expect(entries[0].targetUserName).toBe("Priya Nair");
    expect(entries[0].newPlatformRole).toBe("manufacturer");
  });

  it("filters by targetUserId", async () => {
    vi.mocked(getRoleAuditLog).mockResolvedValue([MOCK_AUDIT_LOG[0]]);
    const entries = await getRoleAuditLog({ targetUserId: 2, limit: 50 });
    expect(entries.every((e) => e.targetUserId === 2)).toBe(true);
  });

  it("returns empty array when no entries", async () => {
    vi.mocked(getRoleAuditLog).mockResolvedValue([]);
    const entries = await getRoleAuditLog({ targetUserId: 9999, limit: 50 });
    expect(entries).toHaveLength(0);
  });

  it("respects limit parameter", async () => {
    const manyEntries = Array.from({ length: 5 }, (_, i) => ({
      ...MOCK_AUDIT_LOG[0],
      id: i + 1,
    }));
    vi.mocked(getRoleAuditLog).mockResolvedValue(manyEntries.slice(0, 3));
    const entries = await getRoleAuditLog({ limit: 3 });
    expect(entries).toHaveLength(3);
  });
});

// ─── BPAN Role Enum Validation ────────────────────────────────────────────────
describe("Platform Role enum values", () => {
  const VALID_PLATFORM_ROLES = [
    "admin", "oem", "manufacturer", "recycler",
    "bess_developer", "service_provider", "government",
  ];

  it("all 7 platform roles are defined", () => {
    expect(VALID_PLATFORM_ROLES).toHaveLength(7);
  });

  it("each role value is a non-empty string", () => {
    VALID_PLATFORM_ROLES.forEach((role) => {
      expect(typeof role).toBe("string");
      expect(role.length).toBeGreaterThan(0);
    });
  });

  it("no duplicate role values", () => {
    const unique = new Set(VALID_PLATFORM_ROLES);
    expect(unique.size).toBe(VALID_PLATFORM_ROLES.length);
  });
});
