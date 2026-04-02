import { describe, it, expect } from "vitest";

describe("Access Gate Secrets", () => {
  it("VITE_ACCESS_USERNAME is set and non-empty", () => {
    const username = process.env.VITE_ACCESS_USERNAME;
    expect(username).toBeDefined();
    expect(username!.length).toBeGreaterThan(0);
  });

  it("VITE_ACCESS_PASSWORD is set and non-empty", () => {
    const password = process.env.VITE_ACCESS_PASSWORD;
    expect(password).toBeDefined();
    expect(password!.length).toBeGreaterThan(0);
  });

  it("VITE_ACCESS_PASSWORD is at least 6 characters", () => {
    const password = process.env.VITE_ACCESS_PASSWORD;
    expect(password!.length).toBeGreaterThanOrEqual(6);
  });
});
