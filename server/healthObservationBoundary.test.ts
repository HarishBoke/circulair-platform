import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { isPostgresProbeReady } from "../shared/healthObservation";
import { createSeoRouter } from "./seoRoutes";

const ready = { status: "ok", db: "connected", dbType: "postgresql" };
describe("bounded health observations", () => {
  it("accepts only the exact successful PostgreSQL query-backed response", () => expect(isPostgresProbeReady(200, ready)).toBe(true));
  it.each([0, 201, 204, 301, 400, 401, 403, 429, 500, 503])("does not treat HTTP %s as readiness", status => expect(isPostgresProbeReady(status, ready)).toBe(false));
  it.each([null, undefined, [], "ok", true, 0, {}, { status: "ok" }, { ...ready, db: "disconnected" }, { ...ready, dbType: "mysql" }, { ...ready, status: "degraded" }])("does not infer readiness from incomplete or wrong response %#", body => expect(isPostgresProbeReady(200, body)).toBe(false));
});

describe("truthful public reference metadata", () => {
  const app = express().use(createSeoRouter());
  it("publishes a reference inventory rather than guessed executable request contracts", async () => {
    const res = await request(app).get("/api/v1/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(res.body.paths).toEqual({});
    expect(res.body["x-contract-status"]).toBe("reference-only");
    expect(res.body["x-unavailable"]).toContain("official BPAN allocation");
    expect(JSON.stringify(res.body)).not.toContain("app_session_id");
  });
  it("does not expose tenant data, token fields or fabricate accuracy and anchoring claims", async () => {
    const res = await request(app).get("/api/ai-context");
    expect(res.status).toBe(200);
    expect(res.body.identityBoundary).toContain("21-character draft");
    expect(res.body.disabledOrUnverified).toContain("instant phone delivery");
    expect(res.body.disabledOrUnverified).toContain("payment checkout and settlement");
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/CNN-LSTM|RMSE <|emqxsl|TiDB|Hyperledger Fabric v|\"password\"|\"token\"|\"tenantId\"/);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });
});
