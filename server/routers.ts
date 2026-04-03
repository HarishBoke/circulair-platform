import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
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
  listUsersAdmin, getUserRoleStats, updateUserRoleById, createRoleAuditEntry, getRoleAuditLog,
  getMonthlyBatteryActivity, getSohDistribution, getSohTrend,
  getChemistryDistribution, getTriageDistribution, getMarketplaceWeeklyActivity,
  insertConsentLog,
  insertIotDevice, listIotDevices, getIotDeviceById, getIotDeviceByDeviceId,
  updateIotDevice, deleteIotDevice, getIotDeviceStats, updateDeviceLastSeen,
} from "./db";
import { shouldCreateAlert, recordAlert } from "./alertCooldown";
import { batchGetCarbonClasses } from "./db-regulatory";
import { generateHealthPassportPdf, generateCpcbReportPdf } from "./pdfGenerator";
import { storagePut } from "./storage";
import {
  logAgentAction, listAgentActions, countAgentActions,
  getAgentActionStats, getRecentActivity, getSystemHealthMetrics,
} from "./db-agent";
import {
  createWarrantyRecord, getWarrantyByBpan, getWarrantyById, lookupWarranty,
  listWarrantyRecords, updateWarrantyStatus, getWarrantyStats,
  createWarrantyClaim, listWarrantyClaims, updateClaimStatus,
  createBulkOnboardingJob, updateBulkOnboardingJob, getBulkOnboardingJob, listBulkOnboardingJobs,
  computeWarrantyStatus,
} from "./db-warranty";
import {
  writeAuditLog, queryAuditLogs, getAuditStats,
  writeSecurityEvent, querySecurityEvents, getSecurityStats,
  createApiKey as createApiKeyFn, validateApiKey, revokeApiKey, listApiKeys,
  logApiUsage, getApiUsageStats,
  createWebhook as createWebhookFn, listWebhooks, deleteWebhook,
  generateTraceId, getDataClassification, DATA_CLASSIFICATION_MAP, ACCESS_CONTROL_MATRIX,
} from "./compliance";
import {
  submitFeedback, listFeedback, getFeedbackStats, getArticleFeedbackStats,
  reviewFeedback, getUserProgress, completeStep, resetProgress,
  getTutorialStats, TUTORIAL_STEPS,
} from "./db-wiki";

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
      .query(async ({ input }) => {
        const result = await listBatteries(input);
        const bpans = result.items.map((b) => b.bpan);
        const carbonClasses = await batchGetCarbonClasses(bpans);
        const itemsWithCarbon = result.items.map((b) => ({
          ...b,
          carbonClass: carbonClasses.get(b.bpan) ?? null,
        }));
        return { items: itemsWithCarbon, total: result.total };
      }),

    get: protectedProcedure
      .input(z.object({ bpan: z.string() }))
      .query(async ({ input }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new Error("Battery not found");
        const [latestTelemetry, latestSoh, history, serviceHist, warrantyRecords] = await Promise.all([
          getLatestTelemetry(input.bpan),
          getLatestSohPrediction(input.bpan),
          getSohPredictionHistory(input.bpan, 10),
          getServiceHistory(input.bpan),
          getWarrantyByBpan(input.bpan),
        ]);
        // Compute warranty status for each record
        const warranties = warrantyRecords.map(w => ({
          ...w,
          ...computeWarrantyStatus(w),
        }));
        const activeWarranty = warranties.find(w => w.effectiveStatus === "active") ?? null;
        return {
          battery, latestTelemetry, latestSoh, sohHistory: history, serviceHistory: serviceHist,
          warranties, activeWarranty,
        };
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
          // 5-minute deduplication cooldown — prevents alert flooding
          if (await shouldCreateAlert(input.bpan, "thermal_anomaly")) {
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
            recordAlert(input.bpan, "thermal_anomaly");
          }
        }
        // Broadcast live reading to WebSocket subscribers
        try {
          const { broadcastTelemetryReading } = await import("./telemetrySocket");
          broadcastTelemetryReading({
            bpan: input.bpan,
            batteryId: input.batteryId,
            vPack: input.vPack ?? 0,
            iPack: input.iPack ?? 0,
            vMin: input.vMin ?? 0,
            vMax: input.vMax ?? 0,
            tPack: input.tPack ?? 0,
            tMax: input.tMax ?? 0,
            cycleCount: input.cycleCount ?? 0,
            irPack: input.irPack ?? 0,
            sohEstimate: input.sohEstimate ?? 0,
            thermalAnomaly,
            anomalyType: thermalAnomaly ? `High temperature: ${input.tMax}°C` : undefined,
            source: "api",
            recordedAt: new Date().toISOString(),
          });
        } catch {
          // Socket not available — continue without broadcast
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
        askingPrice: z.number().optional(),
        currency: z.string().default("INR"),
        description: z.string().optional(),
        targetMarkets: z.array(z.string()).default(["IN"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const [battery, latestSoh, warrantyRecords] = await Promise.all([
          getBatteryById(input.batteryId),
          getLatestSohPrediction(input.bpan),
          getWarrantyByBpan(input.bpan),
        ]);
        if (!battery) throw new Error("Battery not found");
        // Warranty gate: in-warranty batteries cannot be listed on marketplace
        const activeWarranty = warrantyRecords.find(w => {
          const computed = computeWarrantyStatus(w);
          return computed.effectiveStatus === "active";
        });
        const warrantyInfo = activeWarranty ? {
          warrantyId: activeWarranty.id,
          warrantyEndDate: activeWarranty.warrantyEndDate,
          isInWarranty: true,
        } : { isInWarranty: false };
        const soh = Number(latestSoh?.predictedSoh ?? battery.currentSoh ?? 80);
        const spotPrice = calculateSpotPrice(soh, Number(battery.capacityKwh), battery.chemistry);
        // Store the original INR price for backward compat
        const askingPriceInr = input.currency === "INR" ? input.askingPrice : null;
        const listing = await createListing({
          bpan: input.bpan,
          batteryId: input.batteryId,
          sellerId: ctx.user.id,
          listingType: input.listingType,
          askingPriceInr: askingPriceInr ? String(askingPriceInr) : null,
          spotPriceInr: String(spotPrice),
          sohAtListing: latestSoh?.predictedSoh ?? battery.currentSoh,
          rulAtListing: latestSoh?.rulCycles,
          capacityKwh: battery.capacityKwh,
          chemistry: battery.chemistry,
          description: input.description,
        });
        // Also save to the currency table for multi-currency support
        if (listing && input.askingPrice) {
          try {
            const db = await import("./db").then((m) => m.getDb());
            if (db) {
              const { marketplaceListingsCurrency } = await import("../drizzle/schema");
              await db.insert(marketplaceListingsCurrency).values({
                listingId: listing.id,
                listingCurrency: input.currency,
                listingCurrencyAmount: String(input.askingPrice),
                targetMarkets: input.targetMarkets,
              });
            }
          } catch { /* currency record is supplementary */ }
        }
        return { listing, spotPrice, warrantyInfo };
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
      .query(async ({ input }) => {
        const result = await listMarketplace(input);
        // Enrich with currency data
        if (result.items.length === 0) return result;
        try {
          const db = await import("./db").then((m) => m.getDb());
          if (db) {
            const { marketplaceListingsCurrency } = await import("../drizzle/schema");
            const { inArray } = await import("drizzle-orm");
            const ids = result.items.map((i) => i.id);
            const currencyRows = await db.select().from(marketplaceListingsCurrency).where(inArray(marketplaceListingsCurrency.listingId, ids));
            const currencyMap = new Map(currencyRows.map((r) => [r.listingId, r]));
            const enriched = result.items.map((item) => {
              const cur = currencyMap.get(item.id);
              return {
                ...item,
                listingCurrency: cur?.listingCurrency ?? "INR",
                listingCurrencyAmount: cur?.listingCurrencyAmount ?? item.askingPriceInr,
                targetMarkets: cur?.targetMarkets ?? ["IN"],
              };
            });
            return { items: enriched, total: result.total };
          }
        } catch { /* fallback to INR */ }
        return {
          items: result.items.map((i) => ({ ...i, listingCurrency: "INR" as string, listingCurrencyAmount: i.askingPriceInr, targetMarkets: ["IN"] as string[] })),
          total: result.total,
        };
      }),

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

  // ─── CONSENT LOGGING (GDPR Article 7) ─────────────────────────────────────
  consent: router({
    log: publicProcedure
      .input(z.object({
        level: z.enum(["essential", "all", "rejected"]),
        analytics: z.boolean().default(false),
        marketing: z.boolean().default(false),
        source: z.enum(["banner", "settings", "withdraw"]).default("banner"),
        userAgent: z.string().max(512).optional(),
        ipHash: z.string().max(64).optional(),
        fingerprint: z.string().max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id ?? null;
        await insertConsentLog({
          userId,
          level: input.level,
          analytics: input.analytics,
          marketing: input.marketing,
          essential: true,
          source: input.source,
          userAgent: input.userAgent ?? null,
          ipHash: input.ipHash ?? null,
          fingerprint: input.fingerprint ?? null,
        });
        return { success: true } as const;
      }),
  }),

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────
  analytics: router({
    kpis: protectedProcedure.query(() => getPlatformKpis()),
    batteryStats: protectedProcedure.query(() => getBatteryStats()),
    marketStats: protectedProcedure.query(() => getMarketplaceStats()),
    eprStats: protectedProcedure.query(() => getEprStats()),
    monthlyActivity: protectedProcedure.query(() => getMonthlyBatteryActivity()),
    sohDistribution: protectedProcedure.query(() => getSohDistribution()),
    sohTrend: protectedProcedure.query(() => getSohTrend()),
    chemistryDistribution: protectedProcedure.query(() => getChemistryDistribution()),
    triageDistribution: protectedProcedure.query(() => getTriageDistribution()),
    marketplaceWeekly: protectedProcedure.query(() => getMarketplaceWeeklyActivity()),
  }),

  // ─── ADMIN ──────────────────────────────────────────────────────────────────
  admin: router({
    /** Legacy: get all users (no pagination) — admin only */
    users: adminProcedure.query(() => getAllUsers()),

    /** Paginated, searchable, filterable user list — admin only */
    listUsers: adminProcedure
      .input(z.object({
        search: z.string().max(200).optional(),
        platformRole: z.enum(["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => listUsersAdmin(input)),

    /** Role distribution statistics — admin only */
    roleStats: adminProcedure.query(() => getUserRoleStats()),

    /** Update a user's platform role and system role with audit logging — admin only */
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        platformRole: z.enum(["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"]),
        systemRole: z.enum(["user", "admin"]).default("user"),
        organization: z.string().max(255).optional(),
        reason: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { users } = await import("../drizzle/schema");
        const { eq, and, ne, sql: drizzleSql } = await import("drizzle-orm");

        // Fetch current state of the target user
        const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        // Guard: prevent self-demotion from admin
        if (targetUser.id === ctx.user.id && input.systemRole !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot remove your own administrator access." });
        }

        // Guard: ensure at least one admin remains after this change
        if (targetUser.role === "admin" && input.systemRole !== "admin") {
          const [countRow] = await db
            .select({ count: drizzleSql<number>`count(*)` })
            .from(users)
            .where(and(eq(users.role, "admin"), ne(users.id, input.userId)));
          if (Number(countRow?.count ?? 0) === 0) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot demote the last administrator. Promote another user first." });
          }
        }

        // Apply the role update
        const updated = await updateUserRoleById(
          input.userId,
          input.platformRole,
          input.systemRole,
          input.organization,
        );

        // Write immutable audit log entry
        await createRoleAuditEntry({
          targetUserId: input.userId,
          targetUserName: targetUser.name ?? null,
          targetUserEmail: targetUser.email ?? null,
          changedByUserId: ctx.user.id,
          changedByName: ctx.user.name ?? null,
          previousPlatformRole: targetUser.platformRole,
          newPlatformRole: input.platformRole,
          previousRole: targetUser.role,
          newRole: input.systemRole,
          reason: input.reason ?? null,
        });

        return { success: true, user: updated };
      }),

    /** Fetch role change audit log — admin only */
    auditLog: adminProcedure
      .input(z.object({
        targetUserId: z.number().int().positive().optional(),
        limit: z.number().min(1).max(200).default(50),
      }))
      .query(async ({ input }) => getRoleAuditLog(input)),
  }),
  // ─── MQTT MANAGEMENT ───────────────────────────────────────────────────────
  mqtt: router({
    /** Get current MQTT broker connection status */
    status: protectedProcedure.query(async () => {
      const { getMqttStatus, isStreamRunning } = await import("./mqttSubscriber");
      return { ...getMqttStatus(), streamRunning: isStreamRunning() };
    }),
    /** (Re)connect to MQTT broker — optionally override config */
    connect: protectedProcedure
      .input(z.object({
        brokerUrl: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        topicPrefix: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { startMqttSubscriber } = await import("./mqttSubscriber");
        startMqttSubscriber(input);
        return { success: true, message: "MQTT subscriber (re)started" };
      }),
    /** Disconnect from MQTT broker */
    disconnect: protectedProcedure.mutation(async () => {
      const { stopMqttSubscriber } = await import("./mqttSubscriber");
      stopMqttSubscriber();
      return { success: true, message: "MQTT subscriber stopped" };
    }),
    /** Publish a test message to verify connectivity */
    testPublish: protectedProcedure
      .input(z.object({ bpan: z.string().length(21) }))
      .mutation(async ({ input }) => {
        const { publishTestMessage } = await import("./mqttSubscriber");
        await publishTestMessage(input.bpan);
        return { success: true, message: `Test message published for BPAN ${input.bpan}` };
      }),
    /** Publish a fully custom telemetry payload to the broker */
    publish: protectedProcedure
      .input(z.object({
        bpan: z.string().length(21),
        payload: z.object({
          bpan: z.string(),
          vPack: z.number(),
          current: z.number(),
          tMax: z.number(),
          tMin: z.number(),
          tAvg: z.number(),
          soc: z.number(),
          sohEstimate: z.number(),
          cycleCount: z.number(),
          internalResistance: z.number(),
          dtcCodes: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { publishTelemetryMessage } = await import("./mqttSubscriber");
        await publishTelemetryMessage(input.bpan, input.payload);
        return { success: true, message: `Telemetry published for ${input.bpan}` };
      }),
    /** Start continuous telemetry stream for testing */
    startStream: protectedProcedure
      .input(z.object({
        bpans: z.array(z.string().length(21)),
        intervalMs: z.number().min(1000).max(60000).default(3000),
      }))
      .mutation(async ({ input }) => {
        const { startTelemetryStream } = await import("./mqttSubscriber");
        startTelemetryStream(input.bpans, input.intervalMs);
        return { success: true, message: `Stream started for ${input.bpans.length} BPANs at ${input.intervalMs}ms interval` };
      }),
    /** Stop continuous telemetry stream */
    stopStream: protectedProcedure.mutation(async () => {
      const { stopTelemetryStream } = await import("./mqttSubscriber");
      stopTelemetryStream();
      return { success: true, message: "Stream stopped" };
    }),
  }),
  // PDF EXPORT ROUTER
  pdf: router({
    healthPassport: protectedProcedure
      .input(z.object({ bpan: z.string().length(21) }))
      .mutation(async ({ input, ctx }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new Error("Battery not found");
        const [latestTelemetry, latestPrediction, serviceHistory] = await Promise.all([
          getLatestTelemetry(input.bpan),
          getLatestSohPrediction(input.bpan),
          getServiceHistory(input.bpan),
        ]);
        const pdfBuffer = await generateHealthPassportPdf({
          battery: battery as any,
          latestTelemetry: latestTelemetry as any,
          latestPrediction: latestPrediction as any,
          serviceHistory: (serviceHistory ?? []) as any,
          generatedAt: new Date(),
          generatedBy: ctx.user?.name ?? "Platform System",
        });
        const fileKey = `health-passports/${input.bpan}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        await createDocument({
          name: `Health Passport — ${input.bpan}`,
          type: "health_passport",
          bpan: input.bpan,
          batteryId: battery.id,
          uploadedById: ctx.user!.id,
          fileUrl: url,
          fileKey,
          fileSizeBytes: pdfBuffer.length,
          mimeType: "application/pdf",
          accessLevel: "organization",
        });
        return { url, fileKey, sizeBytes: pdfBuffer.length };
      }),

    cpcbReport: protectedProcedure
      .input(z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
        organizationName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [eprTokens, stats, batteryStats] = await Promise.all([
          listEprTokens({ limit: 500 }),
          getEprStats(),
          getBatteryStats(),
        ]);
        const { getDb } = await import("./db");
        const db = await getDb();
        let yieldData: any[] = [];
        if (db) {
          const { yieldVerifications } = await import("../drizzle/schema");
          yieldData = await db.select().from(yieldVerifications).limit(100);
        }
        const pdfBuffer = await generateCpcbReportPdf({
          reportPeriod: { year: input.year, month: input.month },
          organization: { name: input.organizationName ?? ctx.user?.name ?? "Circul-AI-r Platform" },
          eprTokens: eprTokens.map((t) => ({
            tokenId: t.tokenId,
            bpan: t.bpan,
            weightKg: t.actualYieldKg ?? 0,
            chemistry: null,
            status: t.status,
            issuedAt: t.createdAt,
          })),
          yieldVerifications: yieldData.map((v: any) => ({
            bpan: Array.isArray(v.bpanList) ? (v.bpanList as string[])[0] ?? null : null,
            blackMassKg: v.blackMassYieldKg ?? 0,
            lithiumRecoveredKg: v.lithiumYieldKg,
            cobaltRecoveredKg: v.cobaltYieldKg,
            nickelRecoveredKg: v.nickelYieldKg,
            verifiedAt: v.completedAt ?? v.createdAt,
          })),
          stats: {
            totalBatteries: batteryStats.total,
            operationalCount: batteryStats.operational,
            secondLifeCount: batteryStats.secondLife,
            endOfLifeCount: batteryStats.endOfLife,
            totalEprTokens: stats.total,
            totalWeightKg: stats.totalYieldKg,
            totalYieldKg: yieldData.reduce((s: number, v: any) => s + parseFloat(String(v.totalActualYieldKg ?? 0)), 0),
          },
          generatedAt: new Date(),
          generatedBy: ctx.user?.name ?? "Platform System",
        });
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const fileKey = `cpcb-reports/BW3-${input.year}-${String(input.month).padStart(2,"0")}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        await createDocument({
          name: `CPCB Form BW-3 — ${MONTHS[input.month - 1]} ${input.year}`,
          type: "cpcb_form",
          uploadedById: ctx.user!.id,
          fileUrl: url,
          fileKey,
          fileSizeBytes: pdfBuffer.length,
          mimeType: "application/pdf",
          accessLevel: "government",
        });
        return { url, fileKey, sizeBytes: pdfBuffer.length };
      }),

    listReports: protectedProcedure
      .input(z.object({
        type: z.enum(["health_passport", "cpcb_form", "all"]).default("all"),
        limit: z.number().int().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        const filters: { type?: string; limit?: number } = { limit: input.limit };
        if (input.type !== "all") filters.type = input.type;
        return listDocuments(filters);
      }),
  }),

  // ─── REGULATORY / MULTINATIONAL ────────────────────────────────────────────────
  regulatory: router({
    /** Get all regulatory profiles for a battery */
    getProfiles: protectedProcedure
      .input(z.object({ batteryId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getRegulatoryProfilesForBattery } = await import("./db-regulatory");
        return getRegulatoryProfilesForBattery(input.batteryId);
      }),

    /** Get a single profile for a battery + jurisdiction */
    getProfile: protectedProcedure
      .input(z.object({
        batteryId: z.number().int().positive(),
        jurisdiction: z.string().min(2).max(10),
      }))
      .query(async ({ input }) => {
        const { getRegulatoryProfile } = await import("./db-regulatory");
        return getRegulatoryProfile(input.batteryId, input.jurisdiction);
      }),

    /** Upsert a regulatory profile */
    upsertProfile: protectedProcedure
      .input(z.object({
        batteryId: z.number().int().positive(),
        bpan: z.string().min(1).max(21),
        jurisdiction: z.string().min(2).max(10),
        localId: z.string().max(128).optional(),
        status: z.enum(["compliant","non_compliant","pending","not_applicable","data_incomplete"]).default("pending"),
        profileData: z.record(z.string(), z.unknown()),
        govSyncStatus: z.enum(["synced","pending","failed","not_required"]).default("not_required"),
      }))
      .mutation(async ({ input }) => {
        const { upsertRegulatoryProfile } = await import("./db-regulatory");
        return upsertRegulatoryProfile(input.batteryId, input.jurisdiction, {
          bpan: input.bpan,
          localId: input.localId ?? null,
          status: input.status,
          profileData: input.profileData,
          govSyncStatus: input.govSyncStatus,
        });
      }),

    /** Get EU Battery Passport by localId — PUBLIC, no auth required */
    getEuPassport: publicProcedure
      .input(z.object({ localId: z.string().min(1).max(128) }))
      .query(async ({ input }) => {
        const { getRegulatoryProfileByLocalId } = await import("./db-regulatory");
        const profile = await getRegulatoryProfileByLocalId("EU", input.localId);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "EU Battery Passport not found" });
        return profile;
      }),

    /** Declare carbon footprint for a battery */
    declareCarbonFootprint: protectedProcedure
      .input(z.object({
        batteryId: z.number().int().positive(),
        bpan: z.string().min(1).max(21),
        totalKgCo2e: z.number().positive(),
        rawMaterialKgCo2e: z.number().optional(),
        productionKgCo2e: z.number().optional(),
        distributionKgCo2e: z.number().optional(),
        endOfLifeKgCo2e: z.number().optional(),
        performanceClass: z.enum(["A","B","C","D","E"]).optional(),
        methodology: z.enum(["GHG_PROTOCOL","ISO_14067","EU_PEF","GBA"]).default("GHG_PROTOCOL"),
        certifyingBody: z.string().max(255).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createCarbonFootprintDeclaration } = await import("./db-regulatory");
        return createCarbonFootprintDeclaration({
          batteryId: input.batteryId,
          bpan: input.bpan,
          totalKgCo2e: String(input.totalKgCo2e),
          rawMaterialKgCo2e: input.rawMaterialKgCo2e != null ? String(input.rawMaterialKgCo2e) : null,
          productionKgCo2e: input.productionKgCo2e != null ? String(input.productionKgCo2e) : null,
          distributionKgCo2e: input.distributionKgCo2e != null ? String(input.distributionKgCo2e) : null,
          endOfLifeKgCo2e: input.endOfLifeKgCo2e != null ? String(input.endOfLifeKgCo2e) : null,
          performanceClass: input.performanceClass ?? null,
          methodology: input.methodology,
          certifyingBody: input.certifyingBody ?? null,
          declaredById: ctx.user!.id,
        });
      }),

    /** Get carbon footprint declarations for a battery */
    getCarbonFootprint: protectedProcedure
      .input(z.object({ batteryId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getCarbonFootprintDeclarations } = await import("./db-regulatory");
        return getCarbonFootprintDeclarations(input.batteryId);
      }),
    /** Get latest carbon footprint declaration by BPAN */
    getCarbonFootprintByBpan: protectedProcedure
      .input(z.object({ bpan: z.string().min(1).max(21) }))
      .query(async ({ input }) => {
        const { getCarbonFootprintByBpan } = await import("./db-regulatory");
        return getCarbonFootprintByBpan(input.bpan);
      }),

    // ─── RECYCLED CONTENT ────────────────────────────────────────────────────
    declareRecycledContent: protectedProcedure
      .input(z.object({
        bpan: z.string().min(1).max(21),
        batteryId: z.number().int().positive(),
        cobaltPct: z.number().min(0).max(100).optional(),
        lithiumPct: z.number().min(0).max(100).optional(),
        nickelPct: z.number().min(0).max(100).optional(),
        leadPct: z.number().min(0).max(100).optional(),
        totalRecycledPct: z.number().min(0).max(100).optional(),
        verificationMethod: z.enum(["SELF_DECLARED", "THIRD_PARTY_AUDIT", "CERTIFIED_LAB"]).default("SELF_DECLARED"),
        certifyingBody: z.string().max(255).optional(),
        certificateRef: z.string().max(255).optional(),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createRecycledContentDeclaration } = await import("./db-regulatory");
        return createRecycledContentDeclaration({
          ...input,
          cobaltPct: input.cobaltPct?.toString(),
          lithiumPct: input.lithiumPct?.toString(),
          nickelPct: input.nickelPct?.toString(),
          leadPct: input.leadPct?.toString(),
          totalRecycledPct: input.totalRecycledPct?.toString(),
          declaredById: ctx.user!.id,
        });
      }),

    getRecycledContentByBpan: protectedProcedure
      .input(z.object({ bpan: z.string().min(1).max(21) }))
      .query(async ({ input }) => {
        const { getRecycledContentByBpan } = await import("./db-regulatory");
        return getRecycledContentByBpan(input.bpan);
      }),

    getRecycledContentHistory: protectedProcedure
      .input(z.object({ batteryId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getRecycledContentDeclarations } = await import("./db-regulatory");
        return getRecycledContentDeclarations(input.batteryId);
      }),
  }),

  // ─── PLATFORM SETTINGS ───────────────────────────────────────────────────────
  platformSettings: router({
    /** Get current user's platform settings (falls back to global default) */
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getPlatformSettings } = await import("./db-regulatory");
      const settings = await getPlatformSettings(ctx.user!.id);
      return settings ?? {
        locale: "en-IN",
        displayCurrency: "INR",
        timezone: "Asia/Kolkata",
        activeJurisdictions: ["IN"],
        dataResidencyRegion: "in",
        organisationName: null,
        organisationCountry: null,
      };
    }),

    /** Save current user's platform settings */
    save: protectedProcedure
      .input(z.object({
        locale: z.string().min(2).max(20).optional(),
        displayCurrency: z.string().min(3).max(10).optional(),
        timezone: z.string().min(1).max(64).optional(),
        activeJurisdictions: z.array(z.string()).min(1).optional(),
        dataResidencyRegion: z.enum(["in","eu","cn","us","global"]).optional(),
        organisationName: z.string().max(255).optional(),
        organisationCountry: z.string().length(2).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { upsertPlatformSettings } = await import("./db-regulatory");
        return upsertPlatformSettings(ctx.user!.id, input);
      }),

    /** Admin: get global platform defaults */
    getGlobal: adminProcedure.query(async () => {
      const { getGlobalPlatformSettings } = await import("./db-regulatory");
      return getGlobalPlatformSettings();
    }),

    /** Admin: set global platform defaults */
    saveGlobal: adminProcedure
      .input(z.object({
        locale: z.string().min(2).max(20).optional(),
        displayCurrency: z.string().min(3).max(10).optional(),
        timezone: z.string().min(1).max(64).optional(),
        activeJurisdictions: z.array(z.string()).min(1).optional(),
        dataResidencyRegion: z.enum(["in","eu","cn","us","global"]).optional(),
        organisationName: z.string().max(255).optional(),
        organisationCountry: z.string().length(2).optional(),
      }))
      .mutation(async ({ input }) => {
        const { upsertGlobalPlatformSettings } = await import("./db-regulatory");
        return upsertGlobalPlatformSettings(input);
      }),
  }),

  // ─── AGENT / SUPER ADMIN ────────────────────────────────────────────────────
  agent: router({
    /** Log an action performed by a human or AI agent */
    logAction: protectedProcedure
      .input(z.object({
        actorType: z.enum(["human", "agent", "system"]).default("human"),
        action: z.string().min(1).max(255),
        description: z.string().optional(),
        module: z.enum([
          "battery", "telemetry", "marketplace", "compliance",
          "logistics", "analytics", "admin", "system", "agent", "ai"
        ]).default("system"),
        inputParams: z.record(z.string(), z.unknown()).optional(),
        outputResult: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["success", "failure", "pending", "cancelled"]).default("success"),
        errorMessage: z.string().optional(),
        durationMs: z.number().int().optional(),
        targetEntity: z.string().max(255).optional(),
        targetEntityType: z.string().max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await logAgentAction({
          ...input,
          actorId: ctx.user.id,
          actorName: ctx.user.name ?? "Unknown",
          inputParams: input.inputParams ?? null,
          outputResult: input.outputResult ?? null,
          errorMessage: input.errorMessage ?? null,
          durationMs: input.durationMs ?? null,
          ipAddress: null,
          targetEntity: input.targetEntity ?? null,
          targetEntityType: input.targetEntityType ?? null,
        });
        return { success: true, id: result.id };
      }),

    /** Execute an agentic action — logs it and returns the action ID */
    execute: protectedProcedure
      .input(z.object({
        action: z.string().min(1).max(255),
        module: z.enum([
          "battery", "telemetry", "marketplace", "compliance",
          "logistics", "analytics", "admin", "system", "agent", "ai"
        ]).default("system"),
        description: z.string().optional(),
        inputParams: z.record(z.string(), z.unknown()).optional(),
        targetEntity: z.string().max(255).optional(),
        targetEntityType: z.string().max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const startTime = Date.now();
        try {
          const result = await logAgentAction({
            actorId: ctx.user.id,
            actorName: ctx.user.name ?? "Unknown",
            actorType: "agent",
            action: input.action,
            description: input.description ?? null,
            module: input.module,
            inputParams: input.inputParams ?? null,
            outputResult: null,
            status: "success",
            errorMessage: null,
            durationMs: Date.now() - startTime,
            ipAddress: null,
            targetEntity: input.targetEntity ?? null,
            targetEntityType: input.targetEntityType ?? null,
          });
          return { success: true, actionId: result.id };
        } catch (err: any) {
          await logAgentAction({
            actorId: ctx.user.id,
            actorName: ctx.user.name ?? "Unknown",
            actorType: "agent",
            action: input.action,
            description: input.description ?? null,
            module: input.module,
            inputParams: input.inputParams ?? null,
            outputResult: null,
            status: "failure",
            errorMessage: err?.message ?? "Unknown error",
            durationMs: Date.now() - startTime,
            ipAddress: null,
            targetEntity: input.targetEntity ?? null,
            targetEntityType: input.targetEntityType ?? null,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err?.message ?? "Agent execution failed" });
        }
      }),

    /** List agent actions with filters (admin only) */
    listActions: adminProcedure
      .input(z.object({
        actorType: z.enum(["human", "agent", "system"]).optional(),
        module: z.string().optional(),
        status: z.enum(["success", "failure", "pending", "cancelled"]).optional(),
        search: z.string().max(200).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const [actions, total] = await Promise.all([
          listAgentActions(input),
          countAgentActions(input),
        ]);
        return { actions, total };
      }),

    /** Get action statistics (admin only) */
    stats: adminProcedure.query(() => getAgentActionStats()),

    /** Get recent activity feed (admin only) */
    recentActivity: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(({ input }) => getRecentActivity(input.limit)),

    /** Get system health metrics (admin only) */
    systemHealth: adminProcedure.query(async () => {
      const metrics = await getSystemHealthMetrics();
      const stats = await getAgentActionStats();
      const mqttModule = await import("./mqttSubscriber");
      const mqttStatus = mqttModule.getMqttStatus();
      return {
        ...metrics,
        actionStats: stats,
        mqtt: {
          connected: mqttStatus.connected,
          messagesReceived: mqttStatus.messagesReceived,
          lastMessageAt: mqttStatus.lastMessageAt,
          errors: mqttStatus.errors,
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      };
    }),

    /** Batch execute multiple agentic actions in sequence */
    batchExecute: protectedProcedure
      .input(z.object({
        actions: z.array(z.object({
          action: z.string().min(1).max(255),
          module: z.enum([
            "battery", "telemetry", "marketplace", "compliance",
            "logistics", "analytics", "admin", "system", "agent", "ai"
          ]).default("system"),
          description: z.string().optional(),
          inputParams: z.record(z.string(), z.unknown()).optional(),
          targetEntity: z.string().max(255).optional(),
          targetEntityType: z.string().max(64).optional(),
        })).min(1).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        const results: { actionId: number; action: string; status: string }[] = [];
        for (const item of input.actions) {
          const startTime = Date.now();
          try {
            const result = await logAgentAction({
              actorId: ctx.user.id,
              actorName: ctx.user.name ?? "Unknown",
              actorType: "agent",
              action: item.action,
              description: item.description ?? null,
              module: item.module,
              inputParams: item.inputParams ?? null,
              outputResult: null,
              status: "success",
              errorMessage: null,
              durationMs: Date.now() - startTime,
              ipAddress: null,
              targetEntity: item.targetEntity ?? null,
              targetEntityType: item.targetEntityType ?? null,
            });
            results.push({ actionId: result.id, action: item.action, status: "success" });
          } catch (err: any) {
            results.push({ actionId: 0, action: item.action, status: "failure" });
          }
        }
        return { success: true, results, total: results.length, succeeded: results.filter(r => r.status === "success").length };
      }),

    /** Get available agentic capabilities — describes what actions agents can perform */
    capabilities: publicProcedure.query(() => ({
      version: "1.0.0",
      platform: "Circul-AI-r",
      modules: [
        {
          name: "battery",
          actions: ["bpan.generate", "bpan.register", "bpan.decode", "battery.updateStatus", "battery.list", "battery.getByBpan"],
          description: "Battery Pack Aadhaar Number management — register, decode, and track batteries",
        },
        {
          name: "telemetry",
          actions: ["telemetry.ingest", "telemetry.getLatest", "telemetry.getHistory", "telemetry.detectAnomalies"],
          description: "IoT telemetry ingestion and real-time monitoring",
        },
        {
          name: "ai",
          actions: ["ai.predictSoh", "ai.triage", "ai.chat", "ai.generateReport"],
          description: "AI-powered SOH prediction, triage routing, and intelligent analysis",
        },
        {
          name: "marketplace",
          actions: ["marketplace.createListing", "marketplace.list", "marketplace.getStats"],
          description: "Second-life battery marketplace operations",
        },
        {
          name: "compliance",
          actions: ["epr.createToken", "epr.list", "yield.verify", "regulatory.upsertProfile", "carbon.declare"],
          description: "EPR compliance, yield verification, and regulatory reporting",
        },
        {
          name: "logistics",
          actions: ["logistics.createShipment", "logistics.updateStatus", "logistics.list"],
          description: "Reverse logistics and hazmat transport management",
        },
        {
          name: "admin",
          actions: ["admin.listUsers", "admin.updateRole", "admin.auditLog", "admin.systemHealth"],
          description: "Platform administration and user management",
        },
      ],
      agenticEndpoints: {
        logAction: "POST /api/trpc/agent.logAction",
        execute: "POST /api/trpc/agent.execute",
        batchExecute: "POST /api/trpc/agent.batchExecute",
        listActions: "GET /api/trpc/agent.listActions",
        stats: "GET /api/trpc/agent.stats",
        recentActivity: "GET /api/trpc/agent.recentActivity",
        systemHealth: "GET /api/trpc/agent.systemHealth",
        capabilities: "GET /api/trpc/agent.capabilities",
      },
    })),
  }),

  // ─── WARRANTY & ONBOARDING ─────────────────────────────────────────────────
  warranty: router({
    /** Register a new warranty for a battery */
    register: protectedProcedure
      .input(z.object({
        batteryId: z.number(),
        bpan: z.string().length(21),
        serialNumber: z.string().max(100).optional(),
        modelNumber: z.string().max(100).optional(),
        warrantyType: z.enum(["standard", "extended", "premium", "commercial"]).default("standard"),
        coverageType: z.enum(["full_replacement", "pro_rata", "labor_only", "parts_only", "comprehensive"]).default("full_replacement"),
        warrantyTermMonths: z.number().int().min(1).max(120),
        purchaseDate: z.string(),
        warrantyStartDate: z.string().optional(),
        customerName: z.string().min(1).max(255),
        customerPhone: z.string().max(20).optional(),
        customerWhatsApp: z.string().max(20).optional(),
        customerEmail: z.string().email().optional(),
        customerAddress: z.string().optional(),
        dealerName: z.string().max(255).optional(),
        dealerCode: z.string().max(50).optional(),
        dealerPhone: z.string().max(20).optional(),
        dealerEmail: z.string().email().optional(),
        invoiceNumber: z.string().max(100).optional(),
        purchaseAmount: z.number().optional(),
        purchaseCurrency: z.string().max(10).default("INR"),
        manufacturer: z.string().max(255).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const purchaseDate = new Date(input.purchaseDate);
        const warrantyStartDate = input.warrantyStartDate ? new Date(input.warrantyStartDate) : purchaseDate;
        const warrantyEndDate = new Date(warrantyStartDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + input.warrantyTermMonths);

        const result = await createWarrantyRecord({
          batteryId: input.batteryId,
          bpan: input.bpan,
          serialNumber: input.serialNumber ?? null,
          modelNumber: input.modelNumber ?? null,
          warrantyType: input.warrantyType,
          coverageType: input.coverageType,
          warrantyTermMonths: input.warrantyTermMonths,
          purchaseDate,
          warrantyStartDate,
          warrantyEndDate,
          status: "active",
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? null,
          customerWhatsApp: input.customerWhatsApp ?? null,
          customerEmail: input.customerEmail ?? null,
          customerAddress: input.customerAddress ?? null,
          dealerName: input.dealerName ?? null,
          dealerCode: input.dealerCode ?? null,
          dealerPhone: input.dealerPhone ?? null,
          dealerEmail: input.dealerEmail ?? null,
          invoiceNumber: input.invoiceNumber ?? null,
          invoiceUrl: null,
          purchaseAmount: input.purchaseAmount?.toString() ?? null,
          purchaseCurrency: input.purchaseCurrency,
          manufacturer: input.manufacturer ?? null,
          notes: input.notes ?? null,
          metadata: null,
          registeredById: ctx.user.id,
          activatedAt: new Date(),
          voidedAt: null,
          voidReason: null,
          totalClaims: 0,
          lastClaimDate: null,
        });
        return { success: true, warrantyId: result.id, warrantyEndDate: warrantyEndDate.toISOString() };
      }),

    /** Get warranty records for a specific BPAN */
    getByBpan: publicProcedure
      .input(z.object({ bpan: z.string().length(21) }))
      .query(({ input }) => getWarrantyByBpan(input.bpan)),

    /** Get a single warranty record by ID */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getWarrantyById(input.id)),

    /** Multi-channel warranty lookup — public facing */
    lookup: publicProcedure
      .input(z.object({
        bpan: z.string().optional(),
        serialNumber: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        whatsApp: z.string().optional(),
      }))
      .query(({ input }) => lookupWarranty(input)),

    /** List all warranty records with filters */
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().max(200).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(({ input }) => listWarrantyRecords(input)),

    /** Update warranty status (activate, void, suspend) */
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "expired", "voided", "claimed", "suspended", "pending_activation"]),
        voidReason: z.string().optional(),
      }))
      .mutation(({ input }) => updateWarrantyStatus(input.id, input.status, { voidReason: input.voidReason })),

    /** Get warranty statistics */
    stats: protectedProcedure.query(() => getWarrantyStats()),

    // ─── CLAIMS ──────────────────────────────────────────────────────────────
    /** Submit a warranty claim */
    submitClaim: protectedProcedure
      .input(z.object({
        warrantyId: z.number(),
        batteryId: z.number(),
        bpan: z.string().length(21),
        claimType: z.enum(["defect", "performance_degradation", "physical_damage", "thermal_event", "capacity_loss", "premature_failure", "other"]),
        description: z.string().min(10),
        sohAtClaim: z.number().optional(),
        cycleCountAtClaim: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify warranty is active
        const warranty = await getWarrantyById(input.warrantyId);
        if (!warranty) throw new TRPCError({ code: "NOT_FOUND", message: "Warranty not found" });
        if (!warranty.isInWarranty) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot claim — warranty is ${warranty.effectiveStatus}` });
        }
        const result = await createWarrantyClaim({
          warrantyId: input.warrantyId,
          batteryId: input.batteryId,
          bpan: input.bpan,
          claimType: input.claimType,
          description: input.description,
          evidenceUrls: null,
          sohAtClaim: input.sohAtClaim?.toString() ?? null,
          cycleCountAtClaim: input.cycleCountAtClaim ?? null,
          status: "submitted",
          assignedTo: null,
          resolutionType: "pending",
          resolutionNotes: null,
          resolutionDate: null,
          claimedById: ctx.user.id,
        });
        return { success: true, claimId: result.id };
      }),

    /** List claims for a warranty */
    listClaims: protectedProcedure
      .input(z.object({ warrantyId: z.number() }))
      .query(({ input }) => listWarrantyClaims(input.warrantyId)),

    /** Update claim status (admin) */
    updateClaimStatus: adminProcedure
      .input(z.object({
        claimId: z.number(),
        status: z.enum(["submitted", "under_review", "approved", "rejected", "in_repair", "replacement_issued", "resolved", "escalated"]),
        resolutionType: z.enum(["replacement", "repair", "refund", "pro_rata_credit", "rejected", "pending"]).optional(),
        resolutionNotes: z.string().optional(),
      }))
      .mutation(({ input }) => updateClaimStatus(input.claimId, input.status, {
        resolutionType: input.resolutionType,
        resolutionNotes: input.resolutionNotes,
      })),
  }),

  // ─── BULK ONBOARDING ───────────────────────────────────────────────────────
  onboarding: router({
    /** Start a bulk onboarding job — processes batteries and auto-generates BPANs */
    bulkImport: protectedProcedure
      .input(z.object({
        jobName: z.string().min(1).max(255),
        batteries: z.array(z.object({
          // Required for BPAN generation
          countryCode: z.string().length(2).default("IN"),
          manufacturerId: z.string().length(3),
          capacityCode: z.string().length(2),
          chemistryCode: z.string().length(1),
          voltageCode: z.string().length(2),
          cellOriginCode: z.string().length(2).default("IN"),
          extinguisherClass: z.string().length(1).default("D"),
          mfgYear: z.number().int().min(2000).max(2030),
          mfgMonth: z.number().int().min(1).max(12),
          mfgDay: z.number().int().min(1).max(31),
          factoryCode: z.string().length(1).default("A"),
          serialNumber: z.string().min(1).max(4),
          // Optional enrichment
          vehicleId: z.string().optional(),
          currentSoh: z.number().optional(),
          cycleCount: z.number().optional(),
          status: z.enum(["operational", "second_life", "end_of_life", "in_transit", "recycling"]).default("operational"),
          // Optional material composition
          recyclabilityPct: z.number().optional(),
          lithiumPct: z.number().optional(),
          cobaltPct: z.number().optional(),
          nickelPct: z.number().optional(),
          manganesePct: z.number().optional(),
          carbonFootprintKgCo2: z.number().optional(),
        })).min(1).max(500),
        // Warranty options
        registerWarranty: z.boolean().default(false),
        defaultWarrantyMonths: z.number().int().min(1).max(120).optional(),
        defaultCustomerName: z.string().optional(),
        defaultCustomerPhone: z.string().optional(),
        defaultManufacturer: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create the job record
        const job = await createBulkOnboardingJob({
          jobName: input.jobName,
          source: "manual_entry",
          totalRecords: input.batteries.length,
          processedRecords: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          status: "processing",
          errorLog: null,
          generatedBpans: null,
          autoGenerateBpan: true,
          registerWarranty: input.registerWarranty,
          defaultWarrantyMonths: input.defaultWarrantyMonths ?? null,
          createdById: ctx.user.id,
          csvFileUrl: null,
          completedAt: null,
        });

        const errors: { row: number; error: string }[] = [];
        const generatedBpans: string[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < input.batteries.length; i++) {
          const bat = input.batteries[i];
          try {
            // Auto-generate BPAN
            const bpan = generateBpan({
              countryCode: bat.countryCode,
              manufacturerId: bat.manufacturerId,
              capacityCode: bat.capacityCode,
              chemistryCode: bat.chemistryCode,
              voltageCode: bat.voltageCode,
              cellOriginCode: bat.cellOriginCode,
              extinguisherClass: bat.extinguisherClass,
              mfgYear: bat.mfgYear,
              mfgMonth: bat.mfgMonth,
              mfgDay: bat.mfgDay,
              factoryCode: bat.factoryCode,
              serialNumber: bat.serialNumber.padStart(4, "0"),
            });

            // Check for duplicate BPAN
            const existing = await getBatteryByBpan(bpan);
            if (existing) {
              errors.push({ row: i + 1, error: `BPAN ${bpan} already exists` });
              failureCount++;
              continue;
            }

            // Register battery
            const capacityInfo = CAPACITY_MAP[bat.capacityCode];
            const chemistryName = CHEMISTRY_MAP[bat.chemistryCode] ?? "LFP";
            const voltageVal = VOLTAGE_MAP[bat.voltageCode] ?? 48;
            const originName = ORIGIN_MAP[bat.cellOriginCode] ?? bat.cellOriginCode;

            const battery = await createBattery({
              bpan,
              countryCode: bat.countryCode,
              manufacturerId: bat.manufacturerId,
              capacityCode: bat.capacityCode,
              capacityKwh: String(capacityInfo?.kwh ?? 0),
              chemistryCode: bat.chemistryCode,
              chemistry: chemistryName as any,
              voltageCode: bat.voltageCode,
              voltageV: String(voltageVal),
              cellOriginCode: bat.cellOriginCode,
              cellOriginCountry: originName,
              extinguisherClass: bat.extinguisherClass,
              mfgYear: bat.mfgYear,
              mfgMonth: bat.mfgMonth,
              mfgDay: bat.mfgDay,
              factoryCode: bat.factoryCode,
              serialNumber: bat.serialNumber.padStart(4, "0"),
              status: bat.status as any,
              currentSoh: bat.currentSoh?.toString() ?? "100.00",
              cycleCount: bat.cycleCount ?? 0,
              recyclabilityPct: bat.recyclabilityPct?.toString() ?? null,
              lithiumPct: bat.lithiumPct?.toString() ?? null,
              cobaltPct: bat.cobaltPct?.toString() ?? null,
              nickelPct: bat.nickelPct?.toString() ?? null,
              manganesePct: bat.manganesePct?.toString() ?? null,
              carbonFootprintKgCo2: bat.carbonFootprintKgCo2?.toString() ?? null,
              registeredById: ctx.user.id,
              ownerId: ctx.user.id,
              vehicleId: bat.vehicleId ?? null,
            });

            generatedBpans.push(bpan);

            // Auto-register warranty if requested
            if (input.registerWarranty && input.defaultWarrantyMonths) {
              const purchaseDate = new Date(bat.mfgYear, bat.mfgMonth - 1, bat.mfgDay);
              const warrantyEndDate = new Date(purchaseDate);
              warrantyEndDate.setMonth(warrantyEndDate.getMonth() + input.defaultWarrantyMonths);

              await createWarrantyRecord({
                batteryId: battery.id,
                bpan,
                serialNumber: bat.serialNumber,
                modelNumber: null,
                warrantyType: "standard",
                coverageType: "full_replacement",
                warrantyTermMonths: input.defaultWarrantyMonths,
                purchaseDate,
                warrantyStartDate: purchaseDate,
                warrantyEndDate,
                status: "active",
                customerName: input.defaultCustomerName ?? "Bulk Import",
                customerPhone: input.defaultCustomerPhone ?? null,
                customerWhatsApp: null,
                customerEmail: null,
                customerAddress: null,
                dealerName: null,
                dealerCode: null,
                dealerPhone: null,
                dealerEmail: null,
                invoiceNumber: null,
                invoiceUrl: null,
                purchaseAmount: null,
                purchaseCurrency: "INR",
                manufacturer: input.defaultManufacturer ?? null,
                notes: `Auto-registered via bulk onboarding job #${job.id}`,
                metadata: null,
                registeredById: ctx.user.id,
                activatedAt: new Date(),
                voidedAt: null,
                voidReason: null,
                totalClaims: 0,
                lastClaimDate: null,
              });
            }

            successCount++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err?.message ?? "Unknown error" });
            failureCount++;
          }
        }

        // Update job with results
        await updateBulkOnboardingJob(job.id, {
          processedRecords: input.batteries.length,
          successCount,
          failureCount,
          status: failureCount === input.batteries.length ? "failed" : "completed",
          errorLog: errors.length > 0 ? errors : undefined,
          generatedBpans,
          completedAt: new Date(),
        });

        return {
          success: true,
          jobId: job.id,
          totalProcessed: input.batteries.length,
          successCount,
          failureCount,
          generatedBpans,
          errors,
        };
      }),

    /** Get a bulk onboarding job status */
    getJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getBulkOnboardingJob(input.id)),

    /** List all bulk onboarding jobs */
    listJobs: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(({ input }) => listBulkOnboardingJobs(input)),
  }),

  // ─── COMPLIANCE & SECURITY (ISO 27001 / SOC 2) ────────────────────────────
  compliance: router({
    /** Query audit logs with filtering */
    auditLogs: adminProcedure
      .input(z.object({
        page: z.number().default(0),
        limit: z.number().default(50),
        userId: z.number().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
        status: z.string().optional(),
        dataClassification: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      }))
      .query(({ input }) => queryAuditLogs(input)),

    /** Get audit statistics */
    auditStats: adminProcedure.query(() => getAuditStats()),

    /** Query security events */
    securityEvents: adminProcedure
      .input(z.object({
        page: z.number().default(0),
        limit: z.number().default(50),
        eventType: z.string().optional(),
        severity: z.string().optional(),
        userId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(({ input }) => querySecurityEvents(input)),

    /** Get security event statistics */
    securityStats: adminProcedure.query(() => getSecurityStats()),

    /** Get data classification map */
    dataClassificationMap: adminProcedure.query(() => DATA_CLASSIFICATION_MAP),

    /** Get access control matrix */
    accessControlMatrix: adminProcedure.query(() => ACCESS_CONTROL_MATRIX),

    /** Export audit log as JSON (for SIEM integration) */
    exportAuditLog: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        format: z.enum(["json", "csv"]).default("json"),
      }))
      .mutation(async ({ input, ctx }) => {
        const traceId = generateTraceId();
        await writeSecurityEvent({
          eventType: "data_export",
          severity: "medium",
          userId: ctx.user!.id,
          userName: ctx.user!.name ?? undefined,
          description: `Audit log exported for ${input.startDate.toISOString()} to ${input.endDate.toISOString()}`,
          traceId,
        });
        const result = await queryAuditLogs({ startDate: input.startDate, endDate: input.endDate, limit: 10000 });
        return { items: result.items, total: result.total, traceId };
      }),
  }),

  // ─── API KEY MANAGEMENT ──────────────────────────────────────────────────
  apiKey: router({
    /** Create a new API key */
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        scopes: z.array(z.string()),
        rateLimitTier: z.enum(["free", "standard", "premium", "enterprise"]).default("standard"),
        rateLimit: z.number().default(100),
        expiresInDays: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : undefined;
        const result = await createApiKeyFn({
          name: input.name,
          description: input.description,
          userId: ctx.user!.id,
          scopes: input.scopes,
          rateLimitTier: input.rateLimitTier,
          rateLimit: input.rateLimit,
          expiresAt,
        });
        await writeSecurityEvent({
          eventType: "api_key_created",
          severity: "medium",
          userId: ctx.user!.id,
          userName: ctx.user!.name ?? undefined,
          description: `API key '${input.name}' created with prefix ${result.prefix}`,
        });
        return result;
      }),

    /** List API keys */
    list: adminProcedure.query(({ ctx }) => listApiKeys(ctx.user!.id)),

    /** Revoke an API key */
    revoke: adminProcedure
      .input(z.object({ keyId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await revokeApiKey(input.keyId, input.reason);
        await writeSecurityEvent({
          eventType: "api_key_revoked",
          severity: "medium",
          userId: ctx.user!.id,
          userName: ctx.user!.name ?? undefined,
          description: `API key ${input.keyId} revoked: ${input.reason ?? "No reason"}`,
        });
        return { success: true };
      }),

    /** Get API usage statistics */
    usageStats: adminProcedure
      .input(z.object({ apiKeyId: z.number().optional() }))
      .query(({ input }) => getApiUsageStats(input.apiKeyId)),
  }),

  // ─── WIKI CHAT (AI-POWERED Q&A) ────────────────────────────────────────
  wiki: router({
    /** AI-powered chat about the platform */
    chat: publicProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        context: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are CirculWiki AI, the intelligent assistant for the Circul-AI-r Battery Intelligence Platform. You have deep knowledge of:

1. The Circul-AI-r platform — all modules, features, and workflows
2. Battery science — chemistries (NMC, LFP, NCA, Na-ion, solid-state), degradation, SOH prediction
3. Regulatory compliance — ISO 27001, SOC 2, EPR, BWMR, EU Battery Regulation
4. Integration — REST API at /api/v1, MCP server at /api/mcp, MQTT, webhooks
5. Architecture — modular monolith, tRPC + REST + MCP, Drizzle ORM, MySQL
6. BPAN system — Battery Passport Aadhaar Number format and generation
7. Warranty system — multi-channel lookup (phone, WhatsApp, email, BPAN, serial)
8. Marketplace — second-life battery trading with SOH verification

Relevant context from knowledge base:\n${input.context || "No specific context"}

Rules:
- Be specific and reference platform features by name
- Use tables for comparisons when helpful
- Provide code examples for API/integration questions
- Keep responses concise but comprehensive
- If unsure, say so honestly`;

        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemPrompt },
        ];

        // Add history if provided
        if (input.history) {
          for (const msg of input.history.slice(-6)) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }

        messages.push({ role: "user", content: input.message });

        try {
          const response = await invokeLLM({ messages });
          const reply = response.choices?.[0]?.message?.content || "I apologize, I could not generate a response.";
          return { reply };
        } catch {
          return { reply: "I'm having trouble connecting to the AI service right now. Please try searching the knowledge base directly." };
        }
      }),
  }),

  // ─── WEBHOOK MANAGEMENT ──────────────────────────────────────────────────
  webhook: router({
    /** Create a webhook subscription */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        events: z.array(z.string()),
        maxRetries: z.number().default(3),
      }))
      .mutation(({ input, ctx }) => createWebhookFn({
        userId: ctx.user!.id,
        name: input.name,
        url: input.url,
        events: input.events,
        maxRetries: input.maxRetries,
      })),

    /** List webhooks */
    list: protectedProcedure.query(({ ctx }) => listWebhooks(ctx.user!.id)),

    /** Delete a webhook */
    delete: protectedProcedure
      .input(z.object({ webhookId: z.number() }))
      .mutation(({ input }) => deleteWebhook(input.webhookId)),
  }),

  // ─── WIKI FEEDBACK ───────────────────────────────────────────────────────
  wikiFeedback: router({
    /** Submit feedback on a wiki article */
    submit: protectedProcedure
      .input(z.object({
        articleId: z.string(),
        articleTitle: z.string(),
        type: z.enum(["suggest_edit", "flag_outdated", "flag_inaccurate", "request_topic", "rate_helpful", "rate_not_helpful", "general"]),
        content: z.string().optional(),
        suggestedContent: z.string().optional(),
        section: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return submitFeedback({
          ...input,
          userId: ctx.user!.id,
          userName: ctx.user!.name ?? undefined,
          userEmail: ctx.user!.email ?? undefined,
        });
      }),

    /** List feedback (admin) */
    list: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected", "merged"]).optional(),
        type: z.enum(["suggest_edit", "flag_outdated", "flag_inaccurate", "request_topic", "rate_helpful", "rate_not_helpful", "general"]).optional(),
        articleId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => listFeedback(input ?? {})),

    /** Get feedback stats (admin) */
    stats: adminProcedure.query(() => getFeedbackStats()),

    /** Get article-specific feedback stats */
    articleStats: protectedProcedure
      .input(z.object({ articleId: z.string() }))
      .query(({ input }) => getArticleFeedbackStats(input.articleId)),

    /** Review feedback (admin) */
    review: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected", "merged"]),
        reviewNotes: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => reviewFeedback({
        ...input,
        reviewedBy: ctx.user!.id,
      })),
  }),

  // ─── TUTORIAL PROGRESS ─────────────────────────────────────────────────────
  tutorial: router({
    /** Get all tutorial steps with progress for current user */
    progress: protectedProcedure.query(({ ctx }) => getUserProgress(ctx.user!.id)),

    /** Mark a step as completed */
    complete: protectedProcedure
      .input(z.object({ stepKey: z.string() }))
      .mutation(({ input, ctx }) => completeStep(ctx.user!.id, input.stepKey)),

    /** Reset tutorial progress */
    reset: protectedProcedure.mutation(({ ctx }) => resetProgress(ctx.user!.id)),

    /** Get tutorial steps metadata */
    steps: publicProcedure.query(() => TUTORIAL_STEPS),

    /** Get tutorial stats (admin) */
     stats: adminProcedure.query(() => getTutorialStats()),
  }),

  // ─── IOT DEVICE PROVISIONING ────────────────────────────────────────────────
  device: router({
    register: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        deviceType: z.enum(["gateway", "bms", "sensor", "edge_node"]),
        bpan: z.string().optional(),
        firmwareVersion: z.string().optional(),
        hardwareModel: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const deviceId = `DEV-${nanoid(8).toUpperCase()}`;
        const mqttUsername = `dev_${nanoid(12)}`;
        const mqttPassword = nanoid(24);
        const topicPrefix = process.env.MQTT_TOPIC_PREFIX ?? "circulair/telemetry";
        const mqttTopic = input.bpan ? `${topicPrefix}/${input.bpan}` : `${topicPrefix}/device/${deviceId}`;
        const result = await insertIotDevice({
          deviceId,
          name: input.name,
          deviceType: input.deviceType,
          bpan: input.bpan ?? null,
          mqttTopic,
          mqttUsername,
          mqttPassword,
          status: "pending",
          firmwareVersion: input.firmwareVersion ?? null,
          hardwareModel: input.hardwareModel ?? null,
          location: input.location ?? null,
          notes: input.notes ?? null,
          registeredBy: ctx.user.id,
        });
        return { id: result.id, deviceId, mqttTopic, mqttUsername, mqttPassword };
      }),

    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        status: z.string().optional(),
        bpan: z.string().optional(),
      }).optional())
      .query(({ input }) => listIotDevices(input)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const device = await getIotDeviceById(input.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        return device;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        bpan: z.string().nullable().optional(),
        status: z.enum(["active", "inactive", "pending", "revoked"]).optional(),
        firmwareVersion: z.string().nullable().optional(),
        hardwareModel: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const device = await getIotDeviceById(id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        // If BPAN changed, update MQTT topic
        const updates: any = { ...data };
        if (data.bpan !== undefined && data.bpan !== device.bpan) {
          const topicPrefix = process.env.MQTT_TOPIC_PREFIX ?? "circulair/telemetry";
          updates.mqttTopic = data.bpan ? `${topicPrefix}/${data.bpan}` : `${topicPrefix}/device/${device.deviceId}`;
        }
        await updateIotDevice(id, updates);
        return { success: true };
      }),

    regenerateCredentials: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const device = await getIotDeviceById(input.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        const mqttUsername = `dev_${nanoid(12)}`;
        const mqttPassword = nanoid(24);
        await updateIotDevice(input.id, { mqttUsername, mqttPassword });
        return { mqttUsername, mqttPassword, mqttTopic: device.mqttTopic };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteIotDevice(input.id);
        return { success: true };
      }),

    stats: protectedProcedure.query(() => getIotDeviceStats()),
  }),
});
export type AppRouter = typeof appRouter;
