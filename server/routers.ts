import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import {
  createBattery, getBatteryByBpan, getBatteryById, listBatteries, updateBatteryStatus, getBatteryStats,
  insertTelemetry, getLatestTelemetry, getTelemetryHistory, getThermalAnomalies,
  saveSohPrediction, getLatestSohPrediction, getSohPredictionHistory,
  createListing, listMarketplace, getMarketplaceStats,
  createShipment, listShipments, updateShipmentStatus,
  createEprToken, listEprTokens, getEprStats,
  createAlert, listAlerts, markAlertRead, getUnreadAlertCount,
  createDocument, listDocuments,
  createServiceRecord, getServiceHistory,
  createChatSession, getChatSessions, addChatMessage, getChatMessages,
  getPlatformKpis, getAllUsers, upsertUser,
} from "./db";

// ─── BPAN GENERATION UTILITY ──────────────────────────────────────────────────
const CAPACITY_MAP: Record<string, { kwh: number; label: string }> = {
  "A1": { kwh: 1.5, label: "1.5 kWh" }, "A2": { kwh: 2.0, label: "2.0 kWh" },
  "A3": { kwh: 2.5, label: "2.5 kWh" }, "A4": { kwh: 3.0, label: "3.0 kWh" },
  "A5": { kwh: 3.5, label: "3.5 kWh" }, "A6": { kwh: 30.0, label: "30 kWh" },
  "B1": { kwh: 5.0, label: "5.0 kWh" }, "B2": { kwh: 7.5, label: "7.5 kWh" },
  "B3": { kwh: 10.0, label: "10 kWh" }, "B4": { kwh: 15.0, label: "15 kWh" },
  "B5": { kwh: 20.0, label: "20 kWh" }, "B6": { kwh: 25.0, label: "25 kWh" },
  "C1": { kwh: 40.0, label: "40 kWh" }, "C2": { kwh: 50.0, label: "50 kWh" },
  "C3": { kwh: 60.0, label: "60 kWh" }, "C4": { kwh: 75.0, label: "75 kWh" },
  "C5": { kwh: 100.0, label: "100 kWh" },
};
const CHEMISTRY_MAP: Record<string, string> = {
  A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA",
};
const VOLTAGE_MAP: Record<string, number> = {
  KK: 307, KL: 400, KM: 450, KN: 500, KO: 600, KP: 700, KQ: 800,
  LA: 48, LB: 60, LC: 72, LD: 96, LE: 120, LF: 144, LG: 192,
};
const ORIGIN_MAP: Record<string, string> = {
  IN: "India", CN: "China", KR: "South Korea", JP: "Japan", US: "United States",
  DE: "Germany", FR: "France", KL: "South Korea",
};
const MONTH_CODES = "ABCDEFGHIJKL";
const DAY_CODES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567";

function generateBpan(params: {
  countryCode: string; manufacturerId: string; capacityCode: string;
  chemistryCode: string; voltageCode: string; cellOriginCode: string;
  extinguisherClass: string; mfgYear: number; mfgMonth: number; mfgDay: number;
  factoryCode: string; serialNumber: string;
}): string {
  const yearCode = String(params.mfgYear).slice(-1);
  const monthCode = MONTH_CODES[params.mfgMonth - 1] ?? "A";
  const dayCode = DAY_CODES[params.mfgDay - 1] ?? "A";
  return `${params.countryCode}${params.manufacturerId}${params.capacityCode}${params.chemistryCode}${params.voltageCode}${params.cellOriginCode}${params.extinguisherClass}${yearCode}${monthCode}${dayCode}${params.factoryCode}${params.serialNumber}`;
}

function decodeBpan(bpan: string) {
  if (bpan.length !== 21) return null;
  const countryCode = bpan.slice(0, 2);
  const manufacturerId = bpan.slice(2, 5);
  const capacityCode = bpan.slice(5, 7);
  const chemistryCode = bpan.slice(7, 8);
  const voltageCode = bpan.slice(8, 10);
  const cellOriginCode = bpan.slice(10, 12);
  const extinguisherClass = bpan.slice(12, 13);
  const yearCode = bpan.slice(13, 14);
  const monthCode = bpan.slice(14, 15);
  const dayCode = bpan.slice(15, 16);
  const factoryCode = bpan.slice(16, 17);
  const serialNumber = bpan.slice(17, 21);
  const mfgYear = 2020 + parseInt(yearCode, 10);
  const mfgMonth = MONTH_CODES.indexOf(monthCode) + 1;
  const mfgDay = DAY_CODES.indexOf(dayCode) + 1;
  return {
    bpan, countryCode, manufacturerId, capacityCode, chemistryCode, voltageCode,
    cellOriginCode, extinguisherClass, yearCode, monthCode, dayCode, factoryCode, serialNumber,
    mfgYear, mfgMonth, mfgDay,
    capacityKwh: CAPACITY_MAP[capacityCode]?.kwh ?? 0,
    chemistry: CHEMISTRY_MAP[chemistryCode] ?? "Unknown",
    voltageV: VOLTAGE_MAP[voltageCode] ?? 0,
    cellOriginCountry: ORIGIN_MAP[cellOriginCode] ?? cellOriginCode,
    segments: {
      bmi: `${countryCode}${manufacturerId}`,
      bds: `${capacityCode}${chemistryCode}${voltageCode}${cellOriginCode}${extinguisherClass}`,
      bi: `${yearCode}${monthCode}${dayCode}${factoryCode}${serialNumber}`,
    },
  };
}

function calculateSpotPrice(soh: number, capacityKwh: number, chemistry: string): number {
  const basePrice = chemistry === "NMC" ? 8500 : chemistry === "LFP" ? 6500 : 7000;
  const sohMultiplier = soh > 75 ? 1.0 : soh > 60 ? 0.7 : soh > 50 ? 0.45 : 0.2;
  return Math.round(basePrice * capacityKwh * sohMultiplier);
}

// ─── APP ROUTER ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── BPAN REGISTRY ──────────────────────────────────────────────────────────
  bpan: router({
    generate: protectedProcedure
      .input(z.object({
        countryCode: z.string().length(2),
        manufacturerId: z.string().length(3),
        capacityCode: z.string().length(2),
        chemistryCode: z.string().length(1),
        voltageCode: z.string().length(2),
        cellOriginCode: z.string().length(2),
        extinguisherClass: z.string().length(1),
        mfgYear: z.number().min(2020).max(2035),
        mfgMonth: z.number().min(1).max(12),
        mfgDay: z.number().min(1).max(31),
        factoryCode: z.string().length(1),
        serialNumber: z.string().length(4),
        recyclabilityPct: z.number().optional(),
        lithiumPct: z.number().optional(),
        cobaltPct: z.number().optional(),
        nickelPct: z.number().optional(),
        manganesePct: z.number().optional(),
        carbonFootprintKgCo2: z.number().optional(),
        vehicleId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const bpan = generateBpan(input);
        const existing = await getBatteryByBpan(bpan);
        if (existing) throw new Error(`BPAN ${bpan} already exists`);
        const battery = await createBattery({
          bpan,
          countryCode: input.countryCode,
          manufacturerId: input.manufacturerId,
          capacityCode: input.capacityCode,
          capacityKwh: String(CAPACITY_MAP[input.capacityCode]?.kwh ?? 0),
          chemistryCode: input.chemistryCode,
          chemistry: (CHEMISTRY_MAP[input.chemistryCode] ?? "NMC") as any,
          voltageCode: input.voltageCode,
          voltageV: String(VOLTAGE_MAP[input.voltageCode] ?? 0),
          cellOriginCode: input.cellOriginCode,
          cellOriginCountry: ORIGIN_MAP[input.cellOriginCode] ?? input.cellOriginCode,
          extinguisherClass: input.extinguisherClass,
          mfgYear: input.mfgYear,
          mfgMonth: input.mfgMonth,
          mfgDay: input.mfgDay,
          factoryCode: input.factoryCode,
          serialNumber: input.serialNumber,
          recyclabilityPct: input.recyclabilityPct ? String(input.recyclabilityPct) : null,
          lithiumPct: input.lithiumPct ? String(input.lithiumPct) : null,
          cobaltPct: input.cobaltPct ? String(input.cobaltPct) : null,
          nickelPct: input.nickelPct ? String(input.nickelPct) : null,
          manganesePct: input.manganesePct ? String(input.manganesePct) : null,
          carbonFootprintKgCo2: input.carbonFootprintKgCo2 ? String(input.carbonFootprintKgCo2) : null,
          vehicleId: input.vehicleId,
          registeredById: ctx.user.id,
          ownerId: ctx.user.id,
          currentSoh: "100.00",
        });
        await createAlert({
          userId: ctx.user.id,
          bpan,
          batteryId: battery?.id,
          type: "system",
          severity: "info",
          title: "Battery Registered",
          message: `New battery ${bpan} registered successfully.`,
        });
        return { bpan, battery };
      }),

    decode: publicProcedure
      .input(z.object({ bpan: z.string().min(21).max(21) }))
      .query(async ({ input }) => {
        const decoded = decodeBpan(input.bpan);
        if (!decoded) throw new Error("Invalid BPAN format");
        const battery = await getBatteryByBpan(input.bpan);
        const latestSoh = battery ? await getLatestSohPrediction(input.bpan) : undefined;
        return { decoded, battery, latestSoh };
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        chemistry: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => listBatteries(input)),

    get: protectedProcedure
      .input(z.object({ bpan: z.string() }))
      .query(async ({ input }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new Error("Battery not found");
        const [latestTelemetry, latestSoh, history, serviceHist] = await Promise.all([
          getLatestTelemetry(input.bpan),
          getLatestSohPrediction(input.bpan),
          getSohPredictionHistory(input.bpan, 10),
          getServiceHistory(input.bpan),
        ]);
        return { battery, latestTelemetry, latestSoh, sohHistory: history, serviceHistory: serviceHist };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ bpan: z.string(), status: z.enum(["operational", "second_life", "end_of_life", "in_transit", "recycling"]), soh: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await updateBatteryStatus(input.bpan, input.status, input.soh);
        return { success: true };
      }),

    stats: protectedProcedure.query(() => getBatteryStats()),
  }),

  // ─── TELEMETRY ──────────────────────────────────────────────────────────────
  telemetry: router({
    ingest: protectedProcedure
      .input(z.object({
        bpan: z.string(),
        batteryId: z.number(),
        vPack: z.number().optional(),
        iPack: z.number().optional(),
        vMin: z.number().optional(),
        vMax: z.number().optional(),
        tPack: z.number().optional(),
        tMax: z.number().optional(),
        cycleCount: z.number().optional(),
        irPack: z.number().optional(),
        sohEstimate: z.number().optional(),
        dtcCodes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const thermalAnomaly = (input.tMax ?? 0) > 51;
        const anomalyType = thermalAnomaly ? `High temperature: ${input.tMax}°C` : undefined;
        await insertTelemetry({
          bpan: input.bpan,
          batteryId: input.batteryId,
          vPack: input.vPack ? String(input.vPack) : null,
          iPack: input.iPack ? String(input.iPack) : null,
          vMin: input.vMin ? String(input.vMin) : null,
          vMax: input.vMax ? String(input.vMax) : null,
          tPack: input.tPack ? String(input.tPack) : null,
          tMax: input.tMax ? String(input.tMax) : null,
          cycleCount: input.cycleCount,
          irPack: input.irPack ? String(input.irPack) : null,
          sohEstimate: input.sohEstimate ? String(input.sohEstimate) : null,
          dtcCodes: input.dtcCodes ?? null,
          thermalAnomaly,
          anomalyType,
          source: "api",
        });
        if (thermalAnomaly) {
          await createAlert({
            userId: ctx.user.id,
            bpan: input.bpan,
            batteryId: input.batteryId,
            type: "thermal_anomaly",
            severity: "critical",
            title: "Thermal Anomaly Detected",
            message: `Battery ${input.bpan} temperature exceeded 51°C. Current: ${input.tMax}°C. Immediate action required.`,
            metadata: { tMax: input.tMax, tPack: input.tPack },
          });
        }
        return { success: true, thermalAnomaly };
      }),

    simulate: protectedProcedure
      .input(z.object({ bpan: z.string(), batteryId: z.number(), cycles: z.number().default(1) }))
      .mutation(async ({ input, ctx }) => {
        const battery = await getBatteryById(input.batteryId);
        const baseSOH = Number(battery?.currentSoh ?? 85);
        const records = [];
        for (let i = 0; i < input.cycles; i++) {
          const soh = Math.max(20, baseSOH - Math.random() * 0.5);
          const tMax = 25 + Math.random() * 20;
          const record = {
            bpan: input.bpan,
            batteryId: input.batteryId,
            vPack: String((3.6 + Math.random() * 0.8) * 96),
            iPack: String((-50 + Math.random() * 100).toFixed(1)),
            vMin: String((3.4 + Math.random() * 0.3).toFixed(3)),
            vMax: String((3.7 + Math.random() * 0.3).toFixed(3)),
            tPack: String((22 + Math.random() * 15).toFixed(1)),
            tMax: String(tMax.toFixed(1)),
            cycleCount: (battery?.cycleCount ?? 0) + i + 1,
            irPack: String((15 + Math.random() * 10).toFixed(3)),
            sohEstimate: String(soh.toFixed(2)),
            dtcCodes: null,
            thermalAnomaly: tMax > 51,
            anomalyType: tMax > 51 ? `High temperature: ${tMax.toFixed(1)}°C` : null,
            source: "simulated" as const,
          };
          await insertTelemetry(record);
          records.push(record);
        }
        return { success: true, records: records.length };
      }),

    latest: protectedProcedure
      .input(z.object({ bpan: z.string() }))
      .query(({ input }) => getLatestTelemetry(input.bpan)),

    history: protectedProcedure
      .input(z.object({ bpan: z.string(), limit: z.number().default(100) }))
      .query(({ input }) => getTelemetryHistory(input.bpan, input.limit)),

    thermalAnomalies: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(({ input }) => getThermalAnomalies(input.limit)),
  }),

  // ─── AI / SOH PREDICTION ────────────────────────────────────────────────────
  ai: router({
    predictSoh: protectedProcedure
      .input(z.object({ bpan: z.string(), batteryId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [battery, latestTelemetry] = await Promise.all([
          getBatteryById(input.batteryId),
          getLatestTelemetry(input.bpan),
        ]);
        if (!battery) throw new Error("Battery not found");
        const telemetryContext = latestTelemetry ? `
          Latest telemetry:
          - Pack Voltage: ${latestTelemetry.vPack}V
          - Pack Current: ${latestTelemetry.iPack}A
          - Max Temperature: ${latestTelemetry.tMax}°C
          - Cycle Count: ${latestTelemetry.cycleCount}
          - Internal Resistance: ${latestTelemetry.irPack}mΩ
          - BMS SOH Estimate: ${latestTelemetry.sohEstimate}%
        ` : "No telemetry available";
        const prompt = `You are a CNN-LSTM battery SOH prediction model (v3.2.1). Analyze this battery and provide predictions.

Battery: ${input.bpan}
Chemistry: ${battery.chemistry}
Capacity: ${battery.capacityKwh} kWh
Voltage: ${battery.voltageV}V
Manufacture Date: ${battery.mfgYear}-${battery.mfgMonth}-${battery.mfgDay}
Current Status: ${battery.status}
Current SOH: ${battery.currentSoh}%
${telemetryContext}

Provide a JSON response with:
- predictedSoh: number (0-100, percentage)
- rulCycles: number (remaining useful life in cycles)
- confidence: number (0-100, model confidence)
- rmse: number (prediction error, target < 0.02)
- triagePath: "direct_reuse" | "module_repurposing" | "material_recycling"
- triageReason: string (explanation)
- maintenanceRecommendations: array of strings (3-5 recommendations)

Rules: SOH > 75% = direct_reuse, 50-75% = module_repurposing, < 50% = material_recycling`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a battery AI prediction system. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "soh_prediction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  predictedSoh: { type: "number" },
                  rulCycles: { type: "number" },
                  confidence: { type: "number" },
                  rmse: { type: "number" },
                  triagePath: { type: "string", enum: ["direct_reuse", "module_repurposing", "material_recycling"] },
                  triageReason: { type: "string" },
                  maintenanceRecommendations: { type: "array", items: { type: "string" } },
                },
                required: ["predictedSoh", "rulCycles", "confidence", "rmse", "triagePath", "triageReason", "maintenanceRecommendations"],
                additionalProperties: false,
              },
            },
          } as any,
        });
        const content = response.choices[0]?.message?.content;
        const prediction = typeof content === "string" ? JSON.parse(content) : content;
        const saved = await saveSohPrediction({
          bpan: input.bpan,
          batteryId: input.batteryId,
          predictedSoh: String(prediction.predictedSoh),
          rulCycles: prediction.rulCycles,
          confidence: String(prediction.confidence),
          rmse: String(prediction.rmse),
          triagePath: prediction.triagePath,
          triageReason: prediction.triageReason,
          maintenanceRecommendations: prediction.maintenanceRecommendations,
        });
        await updateBatteryStatus(input.bpan, battery.status, prediction.predictedSoh);
        if (prediction.predictedSoh < 50) {
          await createAlert({
            userId: ctx.user.id,
            bpan: input.bpan,
            batteryId: input.batteryId,
            type: "eol_detected",
            severity: "warning",
            title: "End-of-Life Battery Detected",
            message: `Battery ${input.bpan} SOH is ${prediction.predictedSoh.toFixed(1)}%. Recommended for material recycling.`,
          });
        }
        return { prediction, saved };
      }),

    getLatestPrediction: protectedProcedure
      .input(z.object({ bpan: z.string() }))
      .query(({ input }) => getLatestSohPrediction(input.bpan)),

    predictionHistory: protectedProcedure
      .input(z.object({ bpan: z.string(), limit: z.number().default(20) }))
      .query(({ input }) => getSohPredictionHistory(input.bpan, input.limit)),
  }),

  // ─── MARKETPLACE ────────────────────────────────────────────────────────────
  marketplace: router({
    createListing: protectedProcedure
      .input(z.object({
        bpan: z.string(),
        batteryId: z.number(),
        listingType: z.enum(["direct_reuse", "module_repurposing", "black_mass", "second_life_pack"]),
        askingPriceInr: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [battery, latestSoh] = await Promise.all([
          getBatteryById(input.batteryId),
          getLatestSohPrediction(input.bpan),
        ]);
        if (!battery) throw new Error("Battery not found");
        const soh = Number(latestSoh?.predictedSoh ?? battery.currentSoh ?? 80);
        const spotPrice = calculateSpotPrice(soh, Number(battery.capacityKwh), battery.chemistry);
        const listing = await createListing({
          bpan: input.bpan,
          batteryId: input.batteryId,
          sellerId: ctx.user.id,
          listingType: input.listingType,
          askingPriceInr: input.askingPriceInr ? String(input.askingPriceInr) : null,
          spotPriceInr: String(spotPrice),
          sohAtListing: latestSoh?.predictedSoh ?? battery.currentSoh,
          rulAtListing: latestSoh?.rulCycles,
          capacityKwh: battery.capacityKwh,
          chemistry: battery.chemistry,
          description: input.description,
        });
        return { listing, spotPrice };
      }),

    list: publicProcedure
      .input(z.object({
        listingType: z.string().optional(),
        chemistry: z.string().optional(),
        minSoh: z.number().optional(),
        maxPrice: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(({ input }) => listMarketplace(input)),

    stats: protectedProcedure.query(() => getMarketplaceStats()),

    purchase: protectedProcedure
      .input(z.object({ listingId: z.number(), offeredPriceInr: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new Error("Database not available");
        const { marketplaceListings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(marketplaceListings).set({
          status: "sold",
          buyerId: ctx.user.id,
          transactionDate: new Date(),
          finalPriceInr: input.offeredPriceInr ? String(input.offeredPriceInr) : undefined,
        } as any).where(eq(marketplaceListings.id, input.listingId));
        return { success: true };
      }),
  }),

  // ─── LOGISTICS ──────────────────────────────────────────────────────────────
  logistics: router({
    requestPickup: protectedProcedure
      .input(z.object({
        bpan: z.string(),
        batteryId: z.number(),
        pickupAddress: z.string(),
        deliveryAddress: z.string(),
        slaTier: z.enum(["24h", "48h", "72h"]).default("48h"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const shipmentId = `SHP${Date.now().toString(36).toUpperCase()}`;
        const slaHours = input.slaTier === "24h" ? 24 : input.slaTier === "48h" ? 48 : 72;
        const estimatedDelivery = new Date(Date.now() + slaHours * 60 * 60 * 1000);
        const shipment = await createShipment({
          shipmentId,
          bpan: input.bpan,
          batteryId: input.batteryId,
          requestedById: ctx.user.id,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          slaTier: input.slaTier,
          estimatedDelivery,
          notes: input.notes,
          logisticsPartner: "CirculAIr Certified Logistics",
          driverName: "Assigned on dispatch",
        });
        await createAlert({
          userId: ctx.user.id,
          bpan: input.bpan,
          batteryId: input.batteryId,
          type: "logistics_dispatch",
          severity: "info",
          title: "Pickup Requested",
          message: `Shipment ${shipmentId} created for battery ${input.bpan}. SLA: ${input.slaTier}.`,
          metadata: { shipmentId },
        });
        return { shipment, shipmentId };
      }),

    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => listShipments(input)),

    updateStatus: protectedProcedure
      .input(z.object({
        shipmentId: z.string(),
        status: z.enum(["pending", "dispatched", "in_transit", "delivered", "failed"]),
      }))
      .mutation(async ({ input }) => {
        const extra: Record<string, unknown> = {};
        if (input.status === "dispatched") extra.dispatchedAt = new Date();
        if (input.status === "delivered") extra.deliveredAt = new Date();
        await updateShipmentStatus(input.shipmentId, input.status, extra);
        return { success: true };
      }),
  }),

  // ─── EPR COMPLIANCE ─────────────────────────────────────────────────────────
  epr: router({
    verifyYield: protectedProcedure
      .input(z.object({
        bpan: z.string(),
        batteryId: z.number(),
        actualYieldKg: z.number(),
        theoreticalYieldKg: z.number(),
        blackMassKg: z.number().optional(),
        lithiumRecoveredKg: z.number().optional(),
        cobaltRecoveredKg: z.number().optional(),
        nickelRecoveredKg: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const yieldRatio = input.actualYieldKg / input.theoreticalYieldKg;
        const status = yieldRatio >= 0.85 ? "verified" : "rejected";
        const tokenId = `EPR${nanoid(16).toUpperCase()}`;
        const blockchainTxHash = `0x${nanoid(64)}`;
        const blockchainBlock = Math.floor(Math.random() * 1000000) + 500000;
        const token = await createEprToken({
          tokenId,
          bpan: input.bpan,
          batteryId: input.batteryId,
          recyclerId: ctx.user.id,
          actualYieldKg: String(input.actualYieldKg),
          theoreticalYieldKg: String(input.theoreticalYieldKg),
          yieldRatio: String(yieldRatio),
          blackMassKg: input.blackMassKg ? String(input.blackMassKg) : null,
          lithiumRecoveredKg: input.lithiumRecoveredKg ? String(input.lithiumRecoveredKg) : null,
          cobaltRecoveredKg: input.cobaltRecoveredKg ? String(input.cobaltRecoveredKg) : null,
          nickelRecoveredKg: input.nickelRecoveredKg ? String(input.nickelRecoveredKg) : null,
          status,
          blockchainTxHash,
          blockchainBlock,
          verifiedAt: status === "verified" ? new Date() : null,
        });
        if (status === "verified") {
          await createAlert({
            userId: ctx.user.id,
            bpan: input.bpan,
            batteryId: input.batteryId,
            type: "epr_token_issued",
            severity: "info",
            title: "EPR Token Issued",
            message: `EPR token ${tokenId} issued for battery ${input.bpan}. Yield ratio: ${(yieldRatio * 100).toFixed(1)}%.`,
            metadata: { tokenId, blockchainTxHash },
          });
        }
        return { token, yieldRatio, status };
      }),

    listTokens: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }))
      .query(({ input, ctx }) => listEprTokens({ recyclerId: ctx.user.id, status: input.status, limit: input.limit })),

    allTokens: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }))
      .query(({ input }) => listEprTokens({ status: input.status, limit: input.limit })),

    stats: protectedProcedure.query(() => getEprStats()),
  }),

  // ─── ALERTS ─────────────────────────────────────────────────────────────────
  alerts: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(({ input, ctx }) => listAlerts(ctx.user.id, input.limit)),

    listAll: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(({ input }) => listAlerts(undefined, input.limit)),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => markAlertRead(input.id)),

    unreadCount: protectedProcedure
      .query(({ ctx }) => getUnreadAlertCount(ctx.user.id)),
  }),

  // ─── DOCUMENTS ──────────────────────────────────────────────────────────────
  documents: router({
    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["battery_certificate", "health_passport", "compliance_report", "recycling_manifest", "hazmat_manifest", "audit_trail", "cpcb_form", "pli_passport", "material_composition", "other"]),
        bpan: z.string().optional(),
        batteryId: z.number().optional(),
        fileUrl: z.string(),
        fileKey: z.string().optional(),
        fileSizeBytes: z.number().optional(),
        mimeType: z.string().optional(),
        accessLevel: z.enum(["public", "organization", "private", "government"]).default("organization"),
      }))
      .mutation(async ({ input, ctx }) => {
        const doc = await createDocument({
          ...input,
          uploadedById: ctx.user.id,
          bpan: input.bpan ?? null,
          batteryId: input.batteryId ?? null,
          fileKey: input.fileKey ?? null,
          fileSizeBytes: input.fileSizeBytes ?? null,
          mimeType: input.mimeType ?? null,
        });
        return { doc };
      }),

    list: protectedProcedure
      .input(z.object({ type: z.string().optional(), bpan: z.string().optional(), limit: z.number().default(50) }))
      .query(({ input, ctx }) => listDocuments({ ...input, uploadedById: ctx.user.id })),

    listAll: protectedProcedure
      .input(z.object({ type: z.string().optional(), bpan: z.string().optional(), limit: z.number().default(50) }))
      .query(({ input }) => listDocuments(input)),
  }),

  // ─── SERVICE HISTORY ────────────────────────────────────────────────────────
  service: router({
    addRecord: protectedProcedure
      .input(z.object({
        bpan: z.string(),
        batteryId: z.number(),
        serviceType: z.enum(["inspection", "maintenance", "repair", "replacement", "eol_assessment", "triage"]),
        sohBefore: z.number().optional(),
        sohAfter: z.number().optional(),
        cycleCountAtService: z.number().optional(),
        notes: z.string().optional(),
        technicianName: z.string().optional(),
        location: z.string().optional(),
        nextServiceDue: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createServiceRecord({
          ...input,
          serviceProviderId: ctx.user.id,
          sohBefore: input.sohBefore ? String(input.sohBefore) : null,
          sohAfter: input.sohAfter ? String(input.sohAfter) : null,
          nextServiceDue: input.nextServiceDue ?? null,
        });
        return { success: true };
      }),

    history: protectedProcedure
      .input(z.object({ bpan: z.string() }))
      .query(({ input }) => getServiceHistory(input.bpan)),
  }),

  // ─── AI ASSISTANT ────────────────────────────────────────────────────────────
  assistant: router({
    createSession: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(({ input, ctx }) => createChatSession(ctx.user.id, input.title)),

    getSessions: protectedProcedure
      .query(({ ctx }) => getChatSessions(ctx.user.id)),

    getMessages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(({ input }) => getChatMessages(input.sessionId)),

    chat: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        message: z.string(),
        bpanContext: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await addChatMessage(input.sessionId, "user", input.message);
        let contextData = "";
        if (input.bpanContext) {
          const [battery, latestSoh, latestTel] = await Promise.all([
            getBatteryByBpan(input.bpanContext),
            getLatestSohPrediction(input.bpanContext),
            getLatestTelemetry(input.bpanContext),
          ]);
          if (battery) {
            contextData = `
Battery Context (BPAN: ${input.bpanContext}):
- Chemistry: ${battery.chemistry}, Capacity: ${battery.capacityKwh} kWh
- Status: ${battery.status}, Current SOH: ${battery.currentSoh}%
- Latest AI Prediction: SOH ${latestSoh?.predictedSoh}%, RUL ${latestSoh?.rulCycles} cycles
- Triage Path: ${latestSoh?.triagePath ?? "Not assessed"}
- Latest Temperature: ${latestTel?.tMax}°C
- Cycle Count: ${latestTel?.cycleCount ?? battery.cycleCount}
`;
          }
        }
        const messages = await getChatMessages(input.sessionId);
        const history = messages.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        const systemPrompt = `You are the Circul-AI-r Battery Intelligence Assistant, an expert AI for the Battery Pack Aadhaar (BPAN) platform. You help users with:
1. BPAN decoding and interpretation (21-character alphanumeric codes)
2. Battery State of Health (SOH) analysis and Remaining Useful Life (RUL) estimation
3. AI triage routing: Direct Reuse (SOH>75%), Module Repurposing (50-75%), Material Recycling (<50%)
4. EPR compliance, CPCB reporting, and PLI provenance passports
5. Reverse logistics, hazmat transport, and chain-of-custody
6. Marketplace guidance for second-life batteries and Black Mass
7. Thermal anomaly detection and safety protocols
8. Regulatory compliance (BWMR 2022, MoRTH Battery Aadhaar guidelines)

${contextData ? `Current battery context:\n${contextData}` : ""}

Be precise, data-driven, and reference specific BPAN fields, SOH values, and regulatory requirements when relevant.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: input.message },
          ],
        });
        const assistantMessage = response.choices[0]?.message?.content ?? "I apologize, I could not process your request.";
        await addChatMessage(input.sessionId, "assistant", typeof assistantMessage === "string" ? assistantMessage : JSON.stringify(assistantMessage));
        return { message: assistantMessage };
      }),
  }),

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────
  analytics: router({
    kpis: protectedProcedure.query(() => getPlatformKpis()),
    batteryStats: protectedProcedure.query(() => getBatteryStats()),
    marketStats: protectedProcedure.query(() => getMarketplaceStats()),
    eprStats: protectedProcedure.query(() => getEprStats()),
  }),

  // ─── ADMIN ──────────────────────────────────────────────────────────────────
  admin: router({
    users: protectedProcedure.query(() => getAllUsers()),
    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number(), platformRole: z.enum(["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"]) }))
      .mutation(async ({ input }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new Error("Database not available");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ platformRole: input.platformRole }).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
