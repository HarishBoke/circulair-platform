import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySecurityMiddleware } from "./security";
import { getApplicationOrigin } from "./requestSecurity";

function app() {
  const server = express();
  applySecurityMiddleware(server);
  server.post("/api/origin-boundary", (_req, res) => res.json({ reached: true }));
  return server;
}

describe("configured-origin failure boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3001");
    vi.stubEnv("ALLOWED_APP_ORIGINS", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("still rejects a non-HTTPS configured production recovery origin", () => {
    expect(() => getApplicationOrigin()).toThrow("HTTPS in production");
  });

  it("returns controlled 403 rather than 500 for a hostile origin with invalid production configuration", async () => {
    const response = await request(app()).post("/api/origin-boundary").set("Origin", "https://attacker.invalid");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Cross-origin mutation rejected" });
    expect(response.body).not.toHaveProperty("reached");
  });

  it.each(["not a URL", "https://name:password@invalid.example", "file:///tmp/invalid"])(
    "fails closed without leaking configuration for malformed APP_URL %s", async (configured) => {
      vi.stubEnv("APP_URL", configured);
      const response = await request(app()).post("/api/origin-boundary").set("Origin", "https://attacker.invalid");
      expect(response.status).toBe(403);
      expect(JSON.stringify(response.body)).not.toContain(configured);
    },
  );

  it("preserves the previously accepted exact request-origin short circuit", async () => {
    const response = await request(app()).post("/api/origin-boundary").set("Host", "127.0.0.1:3001").set("Origin", "http://127.0.0.1:3001");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reached: true });
  });

  it("continues rejecting a hostile origin under valid production HTTPS configuration", async () => {
    vi.stubEnv("APP_URL", "https://circulair.energy");
    const response = await request(app()).post("/api/origin-boundary").set("Origin", "https://attacker.invalid");
    expect(response.status).toBe(403);
  });

  it("preserves the configured trusted HTTPS origin", async () => {
    vi.stubEnv("APP_URL", "https://circulair.energy");
    const response = await request(app()).post("/api/origin-boundary").set("Origin", "https://circulair.energy");
    expect(response.status).toBe(200);
  });
});
