import express, { type RequestHandler, type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { localPilotStore, type LocalPilotStore } from "./localPilotDb";
import { PilotError, PILOT_MAX_BYTES, pilotAssetRefSchema, pilotReadingSchema, pilotEnabled } from "../shared/localPilotContract";
import { parsePilotJson } from "../shared/localPilotJson";
export const pilotRestPreflight: RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!pilotEnabled()) { res.status(503).json({ error: "local_pilot_disabled_pending_acceptance" }); return; }
  if (!pilotAssetRefSchema.safeParse(req.params.assetRef).success) { res.status(404).json({ error: "pilot_asset_not_found" }); return; }
  if (!/^Bearer lp1_[A-Za-z0-9_-]{43}$/.test(req.headers.authorization ?? "")) { res.status(401).json({ error: "pilot_device_not_authorized" }); return; }
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] ?? "") || (req.headers["content-encoding"] && req.headers["content-encoding"] !== "identity")) { res.status(415).json({ error: "pilot_json_required" }); return; }
  const length = req.headers["content-length"];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > PILOT_MAX_BYTES)) { res.status(413).json({ error: "pilot_payload_too_large" }); return; }
  next();
};
export function pilotReadingHandler(store: Pick<LocalPilotStore, "ingest">): RequestHandler {
  return async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.byteLength > PILOT_MAX_BYTES) throw new PilotError(400, "pilot_raw_json_required");
      const payload = pilotReadingSchema.parse(parsePilotJson(req.body));
      const receipt = await store.ingest(req.params.assetRef, req.headers.authorization!.slice(7), payload);
      if (!Number.isSafeInteger(receipt.readingId) || receipt.readingId <= 0) throw new PilotError(503, "pilot_persistence_unconfirmed");
      res.status(receipt.duplicate ? 200 : 201).json(receipt);
    } catch (error) {
      if (error instanceof PilotError) { res.status(error.status).json({ error: error.code }); return; }
      if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) { res.status(400).json({ error: "pilot_input_invalid" }); return; }
      res.status(503).json({ error: "pilot_store_unavailable" });
    }
  };
}
export function createLocalPilotRestRouter(store: Pick<LocalPilotStore, "ingest"> = localPilotStore) {
  const router = express.Router();
  router.post("/assets/:assetRef/readings", pilotRestPreflight, express.raw({ type: "application/json", limit: PILOT_MAX_BYTES, inflate: false }), pilotReadingHandler(store));
  const parserError: ErrorRequestHandler = (error, _req, res, _next) => {
    const oversized = error?.type === "entity.too.large";
    res.status(oversized ? 413 : 400).json({ error: oversized ? "pilot_payload_too_large" : "pilot_input_invalid" });
  };
  router.use(parserError);
  return router;
}
