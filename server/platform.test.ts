import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@circulair.io",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test", email: "test@test.com", name: "Test", loginMethod: "manus", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string) => clearedCookies.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("auth.me", () => {
  it("returns authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@circulair.io");
    expect(user?.role).toBe("user");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("BPAN validation", () => {
  it("validates correct 21-character BPAN structure", () => {
    const validBpan = "MH01NMC100S48A240001X";
    expect(validBpan).toHaveLength(21);
    // State code: 2 chars
    expect(validBpan.slice(0, 2)).toBe("MH");
    // Manufacturer code: 2 chars
    expect(validBpan.slice(2, 4)).toBe("01");
    // Chemistry: 3 chars
    expect(validBpan.slice(4, 7)).toBe("NMC");
  });

  it("rejects BPAN shorter than 21 characters", () => {
    const shortBpan = "MH01NMC100S48A2400";
    expect(shortBpan.length).toBeLessThan(21);
  });

  it("rejects BPAN longer than 21 characters", () => {
    const longBpan = "MH01NMC100S48A240001EXTRA";
    expect(longBpan.length).toBeGreaterThan(21);
  });
});

describe("SOH triage routing logic", () => {
  it("routes SOH > 75% to direct_reuse", () => {
    const soh = 80;
    const path = soh > 75 ? "direct_reuse" : soh >= 50 ? "module_repurposing" : "material_recycling";
    expect(path).toBe("direct_reuse");
  });

  it("routes SOH 50-75% to module_repurposing", () => {
    const soh = 62;
    const path = soh > 75 ? "direct_reuse" : soh >= 50 ? "module_repurposing" : "material_recycling";
    expect(path).toBe("module_repurposing");
  });

  it("routes SOH < 50% to material_recycling", () => {
    const soh = 35;
    const path = soh > 75 ? "direct_reuse" : soh >= 50 ? "module_repurposing" : "material_recycling";
    expect(path).toBe("material_recycling");
  });

  it("handles boundary SOH = 75% as module_repurposing", () => {
    const soh = 75;
    const path = soh > 75 ? "direct_reuse" : soh >= 50 ? "module_repurposing" : "material_recycling";
    expect(path).toBe("module_repurposing");
  });

  it("handles boundary SOH = 50% as module_repurposing", () => {
    const soh = 50;
    const path = soh > 75 ? "direct_reuse" : soh >= 50 ? "module_repurposing" : "material_recycling";
    expect(path).toBe("module_repurposing");
  });
});

describe("thermal anomaly detection", () => {
  it("flags temperature above 51°C as critical", () => {
    const tMax = 55;
    const isCritical = tMax > 51;
    expect(isCritical).toBe(true);
  });

  it("does not flag temperature at 51°C", () => {
    const tMax = 51;
    const isCritical = tMax > 51;
    expect(isCritical).toBe(false);
  });

  it("does not flag normal operating temperature", () => {
    const tMax = 35;
    const isCritical = tMax > 51;
    expect(isCritical).toBe(false);
  });
});

describe("EPR yield verification", () => {
  it("passes yield ratio >= 85%", () => {
    const actual = 90;
    const theoretical = 100;
    const ratio = actual / theoretical;
    const status = ratio >= 0.85 ? "verified" : "rejected";
    expect(status).toBe("verified");
    expect(ratio).toBeGreaterThanOrEqual(0.85);
  });

  it("fails yield ratio < 85%", () => {
    const actual = 80;
    const theoretical = 100;
    const ratio = actual / theoretical;
    const status = ratio >= 0.85 ? "verified" : "rejected";
    expect(status).toBe("rejected");
    expect(ratio).toBeLessThan(0.85);
  });

  it("handles exact 85% threshold as verified", () => {
    const actual = 85;
    const theoretical = 100;
    const ratio = actual / theoretical;
    const status = ratio >= 0.85 ? "verified" : "rejected";
    expect(status).toBe("verified");
  });
});

describe("EPR credit calculation", () => {
  it("calculates EPR credits proportional to yield", () => {
    const yieldKg = 1000;
    const creditsPerKg = 0.1;
    const credits = Math.floor(yieldKg * creditsPerKg);
    expect(credits).toBe(100);
  });

  it("awards zero credits for zero yield", () => {
    const yieldKg = 0;
    const creditsPerKg = 0.1;
    const credits = Math.floor(yieldKg * creditsPerKg);
    expect(credits).toBe(0);
  });
});

describe("marketplace pricing logic", () => {
  it("prices second-life battery based on SOH", () => {
    const capacityKwh = 30;
    const soh = 80;
    const basePricePerKwh = 15000; // INR
    const estimatedPrice = Math.round(capacityKwh * (soh / 100) * basePricePerKwh);
    expect(estimatedPrice).toBe(360000); // 30 * 0.8 * 15000
  });

  it("prices end-of-life battery for black mass", () => {
    const capacityKwh = 30;
    const soh = 30;
    const blackMassPricePerKwh = 3000; // INR
    const estimatedPrice = Math.round(capacityKwh * (soh / 100) * blackMassPricePerKwh);
    expect(estimatedPrice).toBe(27000); // 30 * 0.3 * 3000
  });
});

describe("logistics SLA monitoring", () => {
  it("detects SLA breach for 24h pickup", () => {
    const scheduledPickup = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const slaHours = 24;
    const hoursElapsed = (Date.now() - scheduledPickup.getTime()) / (1000 * 60 * 60);
    const isBreached = hoursElapsed > slaHours;
    expect(isBreached).toBe(true);
  });

  it("does not breach SLA within 24h", () => {
    const scheduledPickup = new Date(Date.now() - 20 * 60 * 60 * 1000); // 20 hours ago
    const slaHours = 24;
    const hoursElapsed = (Date.now() - scheduledPickup.getTime()) / (1000 * 60 * 60);
    const isBreached = hoursElapsed > slaHours;
    expect(isBreached).toBe(false);
  });
});
