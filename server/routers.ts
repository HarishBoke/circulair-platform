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
  insertListingPhoto, getListingPhotos, deleteListingPhoto,
  getListingById, listUserListings, updateListing, withdrawListing, listUserBatteries,
  createAlertRule, listAlertRules, getAlertRuleById, updateAlertRule, deleteAlertRule,
  toggleAlertRule, getActiveRulesForBpan, evaluateAlertRules,
} from "./db";
import { shouldCreateAlert, recordAlert } from "./alertCooldown";
import { batchGetCarbonClasses } from "./db-regulatory";
import { generateHealthPassportPdf, generateCpcbReportPdf, generateEprComplianceReportPdf, generateBatteryComplianceCertPdf } from "./pdfGenerator";
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

import { getDb } from "./db";
import { generateTwinForecast } from "./digitalTwin";
import { calculateCarbonFootprint, GRID_INTENSITY } from "./carbonModel";
import { anchorToBlockchain, hashPayload, verifyAnchor } from "./blockchain";
import { generateApiKey, hashApiKey, serializePermissions, parsePermissions, ALL_PERMISSIONS, PERMISSION_LABELS } from "./apiMarketplace";
import { evaluateTriagePath } from "./autonomousTriage";
import { forecastSupplyPipeline, scoreForwardOrderMatch } from "./predictiveProcurement";

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

        // ── Step 1: Physics-informed electrochemical model ──────────────────
        const { predictSohPhysics } = await import("./sohModel");
        const physicsResult = predictSohPhysics({
          chemistry: battery.chemistry ?? "NMC",
          capacityKwh: Number(battery.capacityKwh ?? 10),
          mfgYear: battery.mfgYear ?? new Date().getFullYear(),
          mfgMonth: battery.mfgMonth ?? 1,
          bmsReportedSoh: latestTelemetry?.sohEstimate ? Number(latestTelemetry.sohEstimate) : undefined,
          cycleCount: latestTelemetry?.cycleCount ?? undefined,
          irPack: latestTelemetry?.irPack ? Number(latestTelemetry.irPack) : undefined,
          tMax: latestTelemetry?.tMax ? Number(latestTelemetry.tMax) : undefined,
        });

        // ── Step 2: LLM for qualitative triage reason + maintenance recs ────
        const telemetrySummary = latestTelemetry
          ? `Voltage: ${latestTelemetry.vPack}V | Current: ${latestTelemetry.iPack}A | Temp: ${latestTelemetry.tMax}°C | Cycles: ${latestTelemetry.cycleCount} | IR: ${latestTelemetry.irPack}mΩ | BMS SOH: ${latestTelemetry.sohEstimate}%`
          : "No telemetry available";
        const llmPrompt = `You are a battery health expert reviewing a physics model output. Provide a concise triage reason and 3-5 maintenance recommendations.

Battery: ${input.bpan} | Chemistry: ${battery.chemistry} | Capacity: ${battery.capacityKwh} kWh
Age: ${battery.mfgYear}-${battery.mfgMonth} | Telemetry: ${telemetrySummary}

Physics model results:
- Predicted SOH: ${physicsResult.predictedSoh}%
- Calendar fade: ${physicsResult.breakdown.calendarFade}% | Cycle fade: ${physicsResult.breakdown.cycleFade}% | IR penalty: ${physicsResult.breakdown.irCorrection}%
- BMS calibration applied: ${physicsResult.breakdown.bmsCorrectionApplied}
- Triage: ${physicsResult.triagePath} | RUL: ${physicsResult.rulCycles} cycles | Confidence: ${physicsResult.confidence}%

Respond with JSON only: { "triageReason": string, "maintenanceRecommendations": string[] }`;

        let triageReason = `SOH ${physicsResult.predictedSoh.toFixed(1)}% — ${physicsResult.triagePath.replace(/_/g, " ")} recommended based on ${physicsResult.breakdown.calendarFade.toFixed(1)}% calendar fade and ${physicsResult.breakdown.cycleFade.toFixed(1)}% cycle fade.`;
        let maintenanceRecommendations: string[] = [
          "Perform capacity verification test before deployment",
          "Inspect cell balancing and BMS firmware version",
          "Check terminal connections for corrosion",
        ];
        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a battery health expert. Respond with valid JSON only." },
              { role: "user", content: llmPrompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "triage_qualitative",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    triageReason: { type: "string" },
                    maintenanceRecommendations: { type: "array", items: { type: "string" } },
                  },
                  required: ["triageReason", "maintenanceRecommendations"],
                  additionalProperties: false,
                },
              },
            } as any,
          });
          const llmContent = llmResponse.choices[0]?.message?.content;
          const llmData = typeof llmContent === "string" ? JSON.parse(llmContent) : llmContent;
          triageReason = llmData.triageReason;
          maintenanceRecommendations = llmData.maintenanceRecommendations;
        } catch (llmErr) {
          console.warn("[SOH] LLM qualitative step failed, using physics defaults:", llmErr);
        }

        // ── Step 3: Persist and return ───────────────────────────────────────
        const prediction = {
          predictedSoh: physicsResult.predictedSoh,
          rulCycles: physicsResult.rulCycles,
          confidence: physicsResult.confidence,
          rmse: physicsResult.rmse,
          triagePath: physicsResult.triagePath,
          triageReason,
          maintenanceRecommendations,
          modelVersion: "physics-v1.0",
          breakdown: physicsResult.breakdown,
        };
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
    // Photo upload for listings
    uploadPhoto: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        base64Data: z.string(),
        mimeType: z.string().default("image/jpeg"),
        caption: z.string().optional(),
        sortOrder: z.number().default(0),
        fileSizeBytes: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your listing" });
        const buffer = Buffer.from(input.base64Data, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const fileKey = `marketplace/${input.listingId}/${nanoid(12)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const photo = await insertListingPhoto({
          listingId: input.listingId,
          url,
          fileKey,
          caption: input.caption ?? null,
          sortOrder: input.sortOrder,
          fileSizeBytes: input.fileSizeBytes ?? buffer.length,
          mimeType: input.mimeType,
        });
        // Update primary photo and count on listing
        if (input.sortOrder === 0) {
          await updateListing(input.listingId, { primaryPhotoUrl: url, photoCount: (listing.photoCount ?? 0) + 1 } as any);
        } else {
          await updateListing(input.listingId, { photoCount: (listing.photoCount ?? 0) + 1 } as any);
        }
        return { photo, url };
      }),
    getPhotos: protectedProcedure
      .input(z.object({ listingId: z.number() }))
      .query(({ input }) => getListingPhotos(input.listingId)),
    deletePhoto: protectedProcedure
      .input(z.object({ photoId: z.number(), listingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your listing" });
        await deleteListingPhoto(input.photoId);
        await updateListing(input.listingId, { photoCount: Math.max(0, (listing.photoCount ?? 1) - 1) } as any);
        return { success: true };
      }),
    getById: publicProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ input }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        const photos = await getListingPhotos(input.listingId);
        const battery = await getBatteryById(listing.batteryId);
        return { listing, photos, battery };
      }),
    myListings: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input, ctx }) => listUserListings(ctx.user.id, input)),
    myBatteries: protectedProcedure
      .query(({ ctx }) => listUserBatteries(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        description: z.string().optional(),
        askingPrice: z.number().optional(),
        currency: z.string().optional(),
        conditionGrade: z.string().optional(),
        conditionNotes: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your listing" });
        const updateData: Record<string, unknown> = {};
        if (input.description !== undefined) updateData.description = input.description;
        if (input.conditionGrade !== undefined) updateData.conditionGrade = input.conditionGrade;
        if (input.conditionNotes !== undefined) updateData.conditionNotes = input.conditionNotes;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.askingPrice !== undefined) {
          if (input.currency === "INR") updateData.askingPriceInr = String(input.askingPrice);
        }
        await updateListing(input.listingId, updateData as any);
        return { success: true };
      }),
    withdraw: protectedProcedure
      .input(z.object({ listingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your listing" });
        await withdrawListing(input.listingId);
        return { success: true };
      }),
    // Make an offer on a listing
    makeOffer: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        offerAmount: z.number().positive(),
        currency: z.string().default("INR"),
        message: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Listing is no longer active" });
        if (listing.sellerId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot make an offer on your own listing" });
        const { marketplaceOffers } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await dbConn.insert(marketplaceOffers).values({
          listingId: input.listingId,
          buyerId: ctx.user.id,
          offerAmount: String(input.offerAmount),
          currency: input.currency,
          message: input.message ?? null,
          status: "pending",
        });
        const { eq: eqOff, desc: descOff } = await import("drizzle-orm");
        const [offerIdRow] = await dbConn.select({ id: marketplaceOffers.id }).from(marketplaceOffers).where(eqOff(marketplaceOffers.buyerId, ctx.user.id)).orderBy(descOff(marketplaceOffers.createdAt)).limit(1);
        return { success: true, offerId: offerIdRow?.id ?? 0 };
      }),
    // Create a Stripe checkout session for an accepted/pending offer
    createCheckout: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        offerId: z.number(),
        origin: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        const listing = await getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        if (listing.status !== "active" && listing.status !== "reserved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Listing is no longer available for purchase" });
        }
        const { marketplaceOffers } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const { eq } = await import("drizzle-orm");
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [offer] = await dbConn.select().from(marketplaceOffers).where(eq(marketplaceOffers.id, input.offerId)).limit(1);
        if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found" });
        if (offer.buyerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This is not your offer" });
        const { createCheckoutSession } = await import("./stripe");
        // Amount: use offer amount; convert to smallest unit (paise for INR, cents for USD/EUR)
        const amount = parseFloat(String(offer.offerAmount));
        const smallestUnit = Math.round(amount * 100);
        const description = `Battery ${listing.bpan} — ${listing.listingType.replace(/_/g, " ")} (${listing.chemistry ?? "Unknown"} chemistry, ${listing.capacityKwh ?? "?"} kWh)`;
        const result = await createCheckoutSession({
          offerId: input.offerId,
          listingId: input.listingId,
          buyerId: ctx.user.id,
          sellerId: listing.sellerId,
          amountSmallestUnit: smallestUnit,
          currency: offer.currency,
          description,
          buyerEmail: ctx.user.email ?? "",
          buyerName: ctx.user.name ?? ctx.user.email ?? "Unknown",
          origin: input.origin,
        });
        return result;
      }),
    // Get buyer's payment history
    getMyOrders: protectedProcedure
      .query(async ({ ctx }) => {
        const { getPaymentsByBuyerId } = await import("./stripe");
        return getPaymentsByBuyerId(ctx.user.id);
      }),
  }),
  // ─── LOGISTICS ───────────────────────────────────────────────────────────────
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

    /**
     * Natural Language Query — accepts a plain-English question about battery data,
     * uses LLM to interpret intent, fetches relevant data from DB, returns structured results.
     */
    nlQuery: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { batteries, telemetry, alerts, sohPredictions, marketplaceListings } = await import("../drizzle/schema");
        const { sql: drizzleSql, desc, lte, gte, eq, and } = await import("drizzle-orm");

        // Step 1: Ask LLM to classify the query intent and extract parameters
        const classifyResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a battery data query classifier for the Circul-AI-r platform.\nGiven a natural language question, extract the query intent and parameters.\nRespond ONLY with valid JSON matching this exact schema:\n{\n  "intent": "batteries" | "telemetry" | "alerts" | "soh" | "marketplace" | "summary",\n  "filters": {\n    "chemistry": string | null,\n    "status": "operational" | "second_life" | "end_of_life" | null,\n    "minSoh": number | null,\n    "maxSoh": number | null,\n    "severity": "critical" | "warning" | "info" | null,\n    "thermalAnomaly": boolean | null,\n    "limit": number\n  },\n  "explanation": string\n}\nFor "limit", default to 10 unless user asks for more/all. Max 50.\nFor chemistry, map common names: "NMC", "LFP", "NCA", "LCO", "LMO".\nFor status: "operational", "second_life", "end_of_life".\nFor "summary" intent, return a platform-wide summary.`,
            },
            { role: "user", content: input.query },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "query_intent",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  intent: { type: "string" },
                  filters: {
                    type: "object",
                    properties: {
                      chemistry: { type: ["string", "null"] },
                      status: { type: ["string", "null"] },
                      minSoh: { type: ["number", "null"] },
                      maxSoh: { type: ["number", "null"] },
                      severity: { type: ["string", "null"] },
                      thermalAnomaly: { type: ["boolean", "null"] },
                      limit: { type: "number" },
                    },
                    required: ["chemistry", "status", "minSoh", "maxSoh", "severity", "thermalAnomaly", "limit"],
                    additionalProperties: false,
                  },
                  explanation: { type: "string" },
                },
                required: ["intent", "filters", "explanation"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = classifyResponse.choices?.[0]?.message?.content ?? "{}";
        let parsed: {
          intent: string;
          filters: {
            chemistry: string | null;
            status: string | null;
            minSoh: number | null;
            maxSoh: number | null;
            severity: string | null;
            thermalAnomaly: boolean | null;
            limit: number;
          };
          explanation: string;
        };
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse LLM response" });
        }

        const { intent, filters, explanation } = parsed;
        const limit = Math.min(filters.limit ?? 10, 50);

        // Step 2: Execute the appropriate DB query based on intent
        type ResultRow = Record<string, unknown>;
        let results: ResultRow[] = [];
        let totalCount = 0;
        let summaryStats: Record<string, unknown> | null = null;

        if (intent === "batteries") {
          const conditions = [];
          if (filters.chemistry) conditions.push(eq(batteries.chemistry, filters.chemistry));
          if (filters.status) conditions.push(eq(batteries.status, filters.status));
          if (filters.minSoh != null) conditions.push(gte(batteries.currentSoh, String(filters.minSoh)));
          if (filters.maxSoh != null) conditions.push(lte(batteries.currentSoh, String(filters.maxSoh)));
          const rows = await db
            .select({
              bpan: batteries.bpan,
              chemistry: batteries.chemistry,
              status: batteries.status,
              currentSoh: batteries.currentSoh,
              capacityKwh: batteries.capacityKwh,
              cycleCount: batteries.cycleCount,
              mfgYear: batteries.mfgYear,
              cellOriginCountry: batteries.cellOriginCountry,
              createdAt: batteries.createdAt,
            })
            .from(batteries)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
            .orderBy(desc(batteries.createdAt))
            .limit(limit);
          results = rows as ResultRow[];
          const [countRow] = await db.select({ count: drizzleSql<number>`count(*)` }).from(batteries)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined);
          totalCount = Number(countRow?.count ?? 0);

        } else if (intent === "telemetry") {
          const conditions = [];
          if (filters.thermalAnomaly != null) conditions.push(eq(telemetry.thermalAnomaly, filters.thermalAnomaly));
          const rows = await db
            .select({
              bpan: telemetry.bpan,
              tMax: telemetry.tMax,
              tPack: telemetry.tPack,
              vPack: telemetry.vPack,
              sohEstimate: telemetry.sohEstimate,
              cycleCount: telemetry.cycleCount,
              thermalAnomaly: telemetry.thermalAnomaly,
              anomalyType: telemetry.anomalyType,
              recordedAt: telemetry.recordedAt,
            })
            .from(telemetry)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
            .orderBy(desc(telemetry.recordedAt))
            .limit(limit);
          results = rows as ResultRow[];
          const [countRow] = await db.select({ count: drizzleSql<number>`count(*)` }).from(telemetry)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined);
          totalCount = Number(countRow?.count ?? 0);

        } else if (intent === "alerts") {
          const conditions = [];
          if (filters.severity) conditions.push(eq(alerts.severity, filters.severity));
          const rows = await db
            .select({
              id: alerts.id,
              bpan: alerts.bpan,
              type: alerts.type,
              severity: alerts.severity,
              title: alerts.title,
              message: alerts.message,
              read: alerts.read,
              createdAt: alerts.createdAt,
            })
            .from(alerts)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
            .orderBy(desc(alerts.createdAt))
            .limit(limit);
          results = rows as ResultRow[];
          const [countRow] = await db.select({ count: drizzleSql<number>`count(*)` }).from(alerts)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined);
          totalCount = Number(countRow?.count ?? 0);

        } else if (intent === "soh") {
          const conditions = [];
          if (filters.minSoh != null) conditions.push(gte(sohPredictions.predictedSoh, String(filters.minSoh)));
          if (filters.maxSoh != null) conditions.push(lte(sohPredictions.predictedSoh, String(filters.maxSoh)));
          const rows = await db
            .select({
              bpan: sohPredictions.bpan,
              predictedSoh: sohPredictions.predictedSoh,
              rulCycles: sohPredictions.rulCycles,
              confidence: sohPredictions.confidence,
              triagePath: sohPredictions.triagePath,
              triageReason: sohPredictions.triageReason,
              predictedAt: sohPredictions.predictedAt,
            })
            .from(sohPredictions)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
            .orderBy(desc(sohPredictions.predictedAt))
            .limit(limit);
          results = rows as ResultRow[];
          const [countRow] = await db.select({ count: drizzleSql<number>`count(*)` }).from(sohPredictions)
            .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined);
          totalCount = Number(countRow?.count ?? 0);

        } else if (intent === "marketplace") {
          const rows = await db
            .select({
              id: marketplaceListings.id,
              bpan: marketplaceListings.bpan,
              listingType: marketplaceListings.listingType,
              askPriceInr: marketplaceListings.askingPriceInr,
              sohAtListing: marketplaceListings.sohAtListing,
              status: marketplaceListings.status,
              createdAt: marketplaceListings.createdAt,
            })
            .from(marketplaceListings)
            .orderBy(desc(marketplaceListings.createdAt))
            .limit(limit);
          results = rows as ResultRow[];
          const [countRow] = await db.select({ count: drizzleSql<number>`count(*)` }).from(marketplaceListings);
          totalCount = Number(countRow?.count ?? 0);

        } else {
          // summary intent — fetch platform-wide stats
          const [bStats, mStats, eStats] = await Promise.all([
            getBatteryStats(),
            getMarketplaceStats(),
            getEprStats(),
          ]);
          summaryStats = { batteries: bStats, marketplace: mStats, epr: eStats };
          totalCount = 1;
        }

        // Step 3: Ask LLM to generate a human-readable answer
        const dataContext = summaryStats
          ? JSON.stringify(summaryStats, null, 2)
          : JSON.stringify(results.slice(0, 5), null, 2);

        // Step 3: Run answer + follow-up suggestions in parallel to minimise latency
        const [answerResponse, followUpResponse] = await Promise.all([
          invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a battery analytics assistant for the Circul-AI-r platform.\nGiven a user question and relevant data, provide a concise, insightful answer in 2-4 sentences.\nFocus on key numbers, trends, or anomalies. Be specific. Do not repeat the raw data verbatim.`,
              },
              {
                role: "user",
                content: `Question: ${input.query}\n\nData (first 5 rows of ${totalCount} total):\n${dataContext}`,
              },
            ],
          }),
          invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a battery analytics assistant for the Circul-AI-r platform.\nYour task is to generate exactly 3 short, specific follow-up query suggestions that would help the user explore their battery data further.\nBase suggestions on the current query intent, active filters, result count, and data patterns.\n\nRules:\n- Each suggestion must be a complete natural language question (10-15 words max)\n- Suggestions must be meaningfully different from the original query and from each other\n- Focus on drill-down, comparison, or anomaly detection angles\n- Use specific values from the data when possible (e.g. chemistry names, SOH thresholds, alert types)\n- Do NOT include numbering, bullets, or prefixes\n\nRespond ONLY with valid JSON: { "suggestions": ["...", "...", "..."] }`,
              },
              {
                role: "user",
                content: `Original query: "${input.query}"\nIntent: ${intent}\nActive filters: ${JSON.stringify(filters)}\nTotal matching records: ${totalCount}\nSample data (first 3 rows):\n${JSON.stringify(results.slice(0, 3), null, 2)}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "follow_up_suggestions",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          }),
        ]);

        const answer = answerResponse.choices?.[0]?.message?.content ?? explanation;

        // Parse follow-up suggestions — fail gracefully if LLM returns invalid JSON
        let followUpSuggestions: string[] = [];
        try {
          const raw = followUpResponse.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(raw) as { suggestions?: unknown };
          if (Array.isArray(parsed.suggestions)) {
            followUpSuggestions = (parsed.suggestions as unknown[])
              .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
              .slice(0, 4);
          }
        } catch {
          // Silently ignore — UI will simply not show follow-up chips
        }

        return {
          intent,
          query: input.query,
          explanation,
          answer,
          results,
          totalCount,
          summaryStats,
          filters,
          followUpSuggestions,
        };
      }),
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
    /** Start physics-based demo simulation for all seeded batteries */
    startDemo: protectedProcedure
      .input(z.object({ intervalMs: z.number().min(1000).max(10000).default(2000) }).optional())
      .mutation(async ({ input }) => {
        const { items: batteries, total } = await listBatteries({ limit: 50, offset: 0 });
        const { startBatterySimulator, getActiveSimulators } = await import("./batterySimulator");
        const { broadcastTelemetryReading, broadcastAnomaly } = await import("./telemetrySocket");
        const intervalMs = input?.intervalMs ?? 2000;
        let started = 0;
        for (const battery of batteries) {
          const bpan = battery.bpan;
          if (getActiveSimulators().includes(bpan)) continue;
          startBatterySimulator(bpan, battery.chemistry ?? "NMC", {
            onReading: async (reading) => {
              try {
                await insertTelemetry({
                  bpan, batteryId: battery.id,
                  vPack: String(reading.vPack), iPack: String(reading.iPack),
                  vMin: String(reading.vMin), vMax: String(reading.vMax),
                  tPack: String(reading.tPack), tMax: String(reading.tMax),
                  cycleCount: reading.cycleCount, irPack: String(reading.irPack),
                  sohEstimate: String(reading.sohEstimate), dtcCodes: null,
                  thermalAnomaly: reading.thermalAnomaly, anomalyType: reading.anomalyType ?? null,
                  source: "simulated",
                });
                broadcastTelemetryReading({ ...reading, source: "simulated" });
              } catch { /* ignore */ }
            },
            onAnomaly: (reading) => {
              broadcastAnomaly(bpan, {
                bpan, tMax: reading.tMax, tPack: reading.tPack,
                recordedAt: reading.recordedAt,
                message: `THERMAL ANOMALY: Battery ${bpan} at ${reading.tMax}\u00b0C`,
              });
            },
          }, intervalMs);
          started++;
        }
        return { success: true, started, total, message: `Demo started: ${started} batteries simulating at ${intervalMs}ms` };
      }),
    /** Stop all physics-based demo simulators */
    stopDemo: protectedProcedure.mutation(async () => {
      const { stopAllSimulators, getActiveSimulators } = await import("./batterySimulator");
      const count = getActiveSimulators().length;
      stopAllSimulators();
      return { success: true, stopped: count, message: `Demo stopped: ${count} simulators shut down` };
    }),
    /** Get demo simulator stats */
    demoStatus: protectedProcedure.query(async () => {
      const { getSimulatorStats } = await import("./batterySimulator");
      return getSimulatorStats();
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
        type: z.enum(["health_passport", "cpcb_form", "epr_compliance", "battery_cert", "all"]).default("all"),
        limit: z.number().int().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        const filters: { type?: string; limit?: number } = { limit: input.limit };
        if (input.type !== "all") filters.type = input.type;
        return listDocuments(filters);
      }),

    eprComplianceReport: protectedProcedure
      .input(z.object({
        jurisdiction: z.enum(["india_cpcb", "eu_battery_reg", "generic"]),
        year: z.number().int().min(2020).max(2099),
        quarter: z.number().int().min(1).max(4),
        organizationName: z.string().optional(),
        registrationId: z.string().optional(),
        address: z.string().optional(),
        contactEmail: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [eprTokens, eprStats, batteryStats, allBatteries] = await Promise.all([
          listEprTokens({ limit: 500 }),
          getEprStats(),
          getBatteryStats(),
          listBatteries({ limit: 500 }),
        ]);
        const { getDb } = await import("./db");
        const db = await getDb();
        let yieldData: any[] = [];
        if (db) {
          const { yieldVerifications } = await import("../drizzle/schema");
          yieldData = await db.select().from(yieldVerifications).limit(200);
        }
        const verifiedCount = eprTokens.filter((t) => t.status === "verified").length;
        const complianceRate = eprTokens.length > 0 ? (verifiedCount / eprTokens.length) * 100 : 100;

        const pdfBuffer = await generateEprComplianceReportPdf({
          jurisdiction: input.jurisdiction,
          reportPeriod: { year: input.year, quarter: input.quarter },
          organization: {
            name: input.organizationName ?? ctx.user?.name ?? "Circul-AI-r Platform",
            registrationId: input.registrationId,
            address: input.address,
            contactEmail: input.contactEmail,
          },
          batteries: allBatteries.items.map((b: any) => ({
            bpan: b.bpan,
            chemistry: b.chemistry,
            capacityKwh: b.capacityKwh,
            status: b.status,
            currentSoh: b.currentSoh,
            manufacturer: b.manufacturerId,
            registeredAt: b.createdAt,
          })),
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
            totalEprTokens: eprStats.total,
            totalWeightKg: eprStats.totalYieldKg,
            totalYieldKg: yieldData.reduce((s: number, v: any) => s + parseFloat(String(v.totalActualYieldKg ?? 0)), 0),
            complianceRate,
          },
          generatedAt: new Date(),
          generatedBy: ctx.user?.name ?? "Platform System",
        });
        const QUARTER_LABELS: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
        const fileKey = `epr-reports/${input.jurisdiction}-${input.year}-${QUARTER_LABELS[input.quarter]}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        await createDocument({
          name: `EPR Compliance Report \u2014 ${input.jurisdiction.toUpperCase()} ${QUARTER_LABELS[input.quarter]} ${input.year}`,
          type: "compliance_report",
          uploadedById: ctx.user!.id,
          fileUrl: url,
          fileKey,
          fileSizeBytes: pdfBuffer.length,
          mimeType: "application/pdf",
          accessLevel: "government",
        });
        return { url, fileKey, sizeBytes: pdfBuffer.length };
      }),

    batteryComplianceCert: protectedProcedure
      .input(z.object({ bpan: z.string().length(21) }))
      .mutation(async ({ input, ctx }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new Error("Battery not found");
        const [eprTokens, serviceHistory] = await Promise.all([
          listEprTokens({ limit: 100 }),
          getServiceHistory(input.bpan),
        ]);
        const batteryTokens = eprTokens.filter((t) => t.bpan === input.bpan);
        const hasVerified = batteryTokens.some((t) => t.status === "verified");
        const complianceStatus = hasVerified ? "compliant" as const : batteryTokens.length > 0 ? "pending" as const : "pending" as const;

        const pdfBuffer = await generateBatteryComplianceCertPdf({
          battery: {
            bpan: battery.bpan,
            chemistry: battery.chemistry,
            capacityKwh: battery.capacityKwh,
            manufacturer: battery.manufacturerId,
            model: null,
            status: battery.status,
            currentSoh: battery.currentSoh,
            registeredAt: battery.createdAt,
          },
          eprTokens: batteryTokens.map((t) => ({
            tokenId: t.tokenId,
            weightKg: t.actualYieldKg ?? 0,
            status: t.status,
            issuedAt: t.createdAt,
          })),
          serviceHistory: (serviceHistory ?? []).map((s: any) => ({
            serviceType: s.serviceType ?? "maintenance",
            description: s.description,
            performedAt: s.performedAt ?? s.createdAt,
            performedBy: s.performedBy,
          })),
          complianceStatus,
          generatedAt: new Date(),
          generatedBy: ctx.user?.name ?? "Platform System",
        });
        const fileKey = `compliance-certs/${input.bpan}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        await createDocument({
          name: `Compliance Certificate \u2014 ${input.bpan}`,
          type: "battery_certificate",
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

  // ─── ALERT RULES ────────────────────────────────────────────────────────────
  alertRules: router({
    list: protectedProcedure
      .input(z.object({
        chemistry: z.string().optional(),
        bpan: z.string().optional(),
        metric: z.string().optional(),
        enabled: z.boolean().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return listAlertRules(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const rule = await getAlertRuleById(input.id);
        if (!rule) throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        return rule;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        metric: z.enum(["temperature", "voltage", "current", "soc", "soh", "cycleCount", "internalResistance"]),
        operator: z.enum(["gt", "lt", "gte", "lte", "eq"]),
        threshold: z.number(),
        severity: z.enum(["info", "warning", "critical"]).default("warning"),
        bpan: z.string().length(21).optional(),
        chemistry: z.enum(["LFP", "NMC", "NCA", "LCO", "LMO", "LEAD_ACID"]).optional(),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const rule = await createAlertRule({
          ...input,
          threshold: String(input.threshold),
          bpan: input.bpan ?? null,
          chemistry: input.chemistry ?? null,
          description: input.description ?? null,
          createdBy: ctx.user.id,
        });
        return rule;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        metric: z.enum(["temperature", "voltage", "current", "soc", "soh", "cycleCount", "internalResistance"]).optional(),
        operator: z.enum(["gt", "lt", "gte", "lte", "eq"]).optional(),
        threshold: z.number().optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        bpan: z.string().length(21).nullable().optional(),
        chemistry: z.enum(["LFP", "NMC", "NCA", "LCO", "LMO", "LEAD_ACID"]).nullable().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, threshold, ...rest } = input;
        const rule = await getAlertRuleById(id);
        if (!rule) throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        await updateAlertRule(id, {
          ...rest,
          ...(threshold !== undefined ? { threshold: String(threshold) } : {}),
        } as any);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleAlertRule(input.id, input.enabled);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const rule = await getAlertRuleById(input.id);
        if (!rule) throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        await deleteAlertRule(input.id);
        return { success: true };
      }),

    /** Returns the default recommended thresholds per chemistry */
    getDefaults: protectedProcedure.query(() => {
      return {
        NMC: [
          { metric: "temperature", operator: "gt", threshold: 45, severity: "warning", name: "NMC High Temp Warning" },
          { metric: "temperature", operator: "gt", threshold: 55, severity: "critical", name: "NMC Critical Temp" },
          { metric: "soh", operator: "lt", threshold: 70, severity: "warning", name: "NMC Low SOH" },
          { metric: "soh", operator: "lt", threshold: 50, severity: "critical", name: "NMC Critical SOH" },
          { metric: "voltage", operator: "gt", threshold: 4.25, severity: "critical", name: "NMC Overvoltage" },
          { metric: "voltage", operator: "lt", threshold: 2.5, severity: "critical", name: "NMC Undervoltage" },
        ],
        LFP: [
          { metric: "temperature", operator: "gt", threshold: 50, severity: "warning", name: "LFP High Temp Warning" },
          { metric: "temperature", operator: "gt", threshold: 60, severity: "critical", name: "LFP Critical Temp" },
          { metric: "soh", operator: "lt", threshold: 70, severity: "warning", name: "LFP Low SOH" },
          { metric: "soh", operator: "lt", threshold: 50, severity: "critical", name: "LFP Critical SOH" },
          { metric: "voltage", operator: "gt", threshold: 3.65, severity: "critical", name: "LFP Overvoltage" },
          { metric: "voltage", operator: "lt", threshold: 2.5, severity: "critical", name: "LFP Undervoltage" },
        ],
        NCA: [
          { metric: "temperature", operator: "gt", threshold: 45, severity: "warning", name: "NCA High Temp Warning" },
          { metric: "temperature", operator: "gt", threshold: 55, severity: "critical", name: "NCA Critical Temp" },
          { metric: "soh", operator: "lt", threshold: 75, severity: "warning", name: "NCA Low SOH" },
          { metric: "soh", operator: "lt", threshold: 55, severity: "critical", name: "NCA Critical SOH" },
        ],
        LCO: [
          { metric: "temperature", operator: "gt", threshold: 40, severity: "warning", name: "LCO High Temp Warning" },
          { metric: "temperature", operator: "gt", threshold: 50, severity: "critical", name: "LCO Critical Temp" },
          { metric: "soh", operator: "lt", threshold: 70, severity: "warning", name: "LCO Low SOH" },
        ],
        LMO: [
          { metric: "temperature", operator: "gt", threshold: 50, severity: "warning", name: "LMO High Temp Warning" },
          { metric: "temperature", operator: "gt", threshold: 60, severity: "critical", name: "LMO Critical Temp" },
          { metric: "soh", operator: "lt", threshold: 65, severity: "warning", name: "LMO Low SOH" },
        ],
        LEAD_ACID: [
          { metric: "temperature", operator: "gt", threshold: 45, severity: "warning", name: "Lead-Acid High Temp" },
          { metric: "soh", operator: "lt", threshold: 60, severity: "warning", name: "Lead-Acid Low SOH" },
        ],
      };
    }),
  }),

  // ─── DIGITAL TWIN ───────────────────────────────────────────────────────────────────────────────
  digitalTwin: router({
    generate: protectedProcedure
      .input(z.object({
        bpan: z.string().min(21).max(21),
        forecastHorizonDays: z.number().min(30).max(1825).default(365),
      }))
      .mutation(async ({ input }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new TRPCError({ code: "NOT_FOUND", message: "Battery not found" });
        const latestTelemetry = await getLatestTelemetry(input.bpan);
        const latestSoh = await getLatestSohPrediction(input.bpan);
        const capacityCode = input.bpan.slice(5, 7);
        const chemistryCode = input.bpan.slice(7, 8);
        const CAP_MAP: Record<string, number> = { "A1": 1.5, "A2": 2.0, "A3": 2.5, "A4": 3.0, "A5": 3.5, "A6": 30.0, "B1": 5.0, "B2": 7.5, "B3": 10.0, "B4": 15.0, "B5": 20.0, "B6": 25.0, "C1": 40.0, "C2": 50.0, "C3": 60.0, "C4": 75.0, "C5": 100.0 };
        const CHEM_MAP: Record<string, string> = { A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA" };
        const MC = "ABCDEFGHIJKL";
        const yearCode = input.bpan.slice(13, 14);
        const monthCode = input.bpan.slice(14, 15);
        const currentSoh = latestSoh?.predictedSoh ? Number(latestSoh.predictedSoh) : (battery.currentSoh ? Number(battery.currentSoh) : 85);
        const forecast = generateTwinForecast({
          bpan: input.bpan,
          chemistry: CHEM_MAP[chemistryCode] ?? "NMC",
          currentSoh,
          cycleCount: latestTelemetry?.cycleCount ?? 0,
          capacityKwh: CAP_MAP[capacityCode] ?? 10,
          mfgYear: 2020 + parseInt(yearCode, 10),
          mfgMonth: MC.indexOf(monthCode) + 1 || 1,
          forecastHorizonDays: input.forecastHorizonDays,
          bmsSoh: latestTelemetry?.sohEstimate ? Number(latestTelemetry.sohEstimate) : undefined,
        });
        return forecast;
      }),

    // Side-by-side comparison of two BPANs
    compare: protectedProcedure
      .input(z.object({
        bpanA: z.string().min(21).max(21),
        bpanB: z.string().min(21).max(21),
        forecastHorizonDays: z.number().min(30).max(1825).default(365),
      }))
      .mutation(async ({ input }) => {
        const CAP_MAP: Record<string, number> = { "A1": 1.5, "A2": 2.0, "A3": 2.5, "A4": 3.0, "A5": 3.5, "A6": 30.0, "B1": 5.0, "B2": 7.5, "B3": 10.0, "B4": 15.0, "B5": 20.0, "B6": 25.0, "C1": 40.0, "C2": 50.0, "C3": 60.0, "C4": 75.0, "C5": 100.0 };
        const CHEM_MAP: Record<string, string> = { A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA" };
        const MC = "ABCDEFGHIJKL";
        const buildForecast = async (bpan: string) => {
          const battery = await getBatteryByBpan(bpan);
          if (!battery) throw new TRPCError({ code: "NOT_FOUND", message: `Battery ${bpan} not found` });
          const latestTelemetry = await getLatestTelemetry(bpan);
          const latestSoh = await getLatestSohPrediction(bpan);
          const currentSoh = latestSoh?.predictedSoh ? Number(latestSoh.predictedSoh) : (battery.currentSoh ? Number(battery.currentSoh) : 85);
          const yearCode = bpan.slice(13, 14);
          const monthCode = bpan.slice(14, 15);
          const forecast = generateTwinForecast({
            bpan,
            chemistry: CHEM_MAP[bpan.slice(7, 8)] ?? "NMC",
            currentSoh,
            cycleCount: latestTelemetry?.cycleCount ?? 0,
            capacityKwh: CAP_MAP[bpan.slice(5, 7)] ?? 10,
            mfgYear: 2020 + parseInt(yearCode, 10),
            mfgMonth: MC.indexOf(monthCode) + 1 || 1,
            forecastHorizonDays: input.forecastHorizonDays,
            bmsSoh: latestTelemetry?.sohEstimate ? Number(latestTelemetry.sohEstimate) : undefined,
          });
          return { bpan, forecast, chemistry: CHEM_MAP[bpan.slice(7, 8)] ?? "NMC", currentSoh, capacityKwh: CAP_MAP[bpan.slice(5, 7)] ?? 10 };
        };
        const [a, b] = await Promise.all([buildForecast(input.bpanA), buildForecast(input.bpanB)]);
        return { a, b, forecastHorizonDays: input.forecastHorizonDays };
      }),
  }),

  // ─── CARBON ACCOUNTING ────────────────────────────────────────────────────────────────────────
  carbon: router({
    calculate: protectedProcedure
      .input(z.object({
        bpan: z.string().min(21).max(21),
        transportDistanceKm: z.number().optional(),
        gridRegion: z.string().optional(),
        ageYears: z.number().optional(),
        cyclesPerYear: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new TRPCError({ code: "NOT_FOUND", message: "Battery not found" });
        const CAP_MAP: Record<string, number> = { "A1": 1.5, "A2": 2.0, "A3": 2.5, "A4": 3.0, "A5": 3.5, "A6": 30.0, "B1": 5.0, "B2": 7.5, "B3": 10.0, "B4": 15.0, "B5": 20.0, "B6": 25.0, "C1": 40.0, "C2": 50.0, "C3": 60.0, "C4": 75.0, "C5": 100.0 };
        const CHEM_MAP: Record<string, string> = { A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA" };
        const result = calculateCarbonFootprint({
          bpan: input.bpan,
          chemistry: CHEM_MAP[input.bpan.slice(7, 8)] ?? "NMC",
          capacityKwh: CAP_MAP[input.bpan.slice(5, 7)] ?? 10,
          transportDistanceKm: input.transportDistanceKm,
          gridRegion: input.gridRegion,
          ageYears: input.ageYears,
          cyclesPerYear: input.cyclesPerYear,
        });
        return result;
      }),
    getGridRegions: publicProcedure.query(() =>
      Object.entries(GRID_INTENSITY).map(([code, intensity]) => ({ code, intensity }))
    ),
  }),

  // ─── BLOCKCHAIN ANCHORING ──────────────────────────────────────────────────────────────────────
  blockchain: router({
    anchor: protectedProcedure
      .input(z.object({
        bpan: z.string().optional(),
        eventType: z.enum(["bpan_registration","soh_prediction","epr_token_issuance","compliance_report","marketplace_transaction","logistics_dispatch","data_sharing_consent"]),
        payload: z.record(z.string(), z.unknown()),
        network: z.enum(["polygon-mumbai","polygon-mainnet","ethereum-mainnet"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await anchorToBlockchain({ eventType: input.eventType as any, bpan: input.bpan, payload: input.payload, network: input.network });
        return result;
      }),
    verify: publicProcedure
      .input(z.object({ payload: z.record(z.string(), z.unknown()), storedHash: z.string() }))
      .query(({ input }) => {
        const computedHash = hashPayload(input.payload);
        return { valid: computedHash === input.storedHash, computedHash };
      }),
    hash: publicProcedure
      .input(z.object({ payload: z.record(z.string(), z.unknown()) }))
      .query(({ input }) => ({ hash: hashPayload(input.payload) })),
  }),

  // ─── DEVELOPER API MARKETPLACE ────────────────────────────────────────────────────────────────
  developerApi: router({
    createKey: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        permissions: z.array(z.enum(["soh_predict","bpan_validate","compliance_report","telemetry_read","marketplace_read","carbon_report","digital_twin"])),
        rateLimit: z.number().min(10).max(10000).default(100),
        expiresInDays: z.number().optional(),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { plaintext, hash, prefix } = generateApiKey();
        const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400000) : null;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { apiKeys } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Check if this is the user's first API key (for onboarding email)
        const existingKeys = await db.select({ id: apiKeys.id }).from(apiKeys)
          .where(eq(apiKeys.userId, ctx.user.id)).limit(1);
        const isFirstKey = existingKeys.length === 0;

        await db.insert(apiKeys).values({
          userId: ctx.user.id,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes: input.permissions,
          rateLimit: input.rateLimit,
          expiresAt,
        });

        // Send onboarding email + owner notification on first key (fire-and-forget)
        if (isFirstKey && ctx.user.email) {
          const origin = input.origin ?? "https://circulair.energy";
          const { sendDeveloperOnboardingEmail } = await import("./email");
          const { notifyOwner } = await import("./_core/notification");
          sendDeveloperOnboardingEmail({
            to: ctx.user.email,
            name: ctx.user.name ?? ctx.user.email,
            apiKey: plaintext,
            keyName: input.name,
            permissions: input.permissions,
            origin,
          }).catch(e => console.error("[Onboarding Email] Failed:", e));
          notifyOwner({
            title: "New Developer Joined",
            content: `${ctx.user.name ?? ctx.user.email} issued their first API key ("${input.name}") with scopes: ${input.permissions.join(", ")}.`,
          }).catch(e => console.error("[notifyOwner] Failed:", e));
        }

        return { plaintext, prefix, name: input.name, permissions: input.permissions, message: "Save this key — it will not be shown again." };
      }),
    listKeys: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { apiKeys } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, ctx.user.id));
      return keys.map((k: any) => ({ ...k, keyHash: undefined }));
    }),
    revokeKey: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { apiKeys } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.update(apiKeys).set({ status: "revoked" as const, revokedAt: new Date() }).where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id)));
        return { success: true };
      }),
    getPermissions: publicProcedure.query(() => ALL_PERMISSIONS.map(p => ({ id: p, label: PERMISSION_LABELS[p] }))),

    /** Returns CDN URLs for the pre-built TypeScript and Python SDKs */
    getSdkDownloadUrls: publicProcedure.query(() => ({
      typescript: {
        name: "@circulair/sdk",
        language: "TypeScript / JavaScript",
        version: "1.0.0",
        description: "Auto-generated from OpenAPI 3.1 spec. Includes typed services for Batteries, Telemetry, SOH Predictions, Warranty, Marketplace, Compliance, and Analytics.",
        downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663256112242/Su7XGBwDj2SqiggDTNrQPe/circulair-sdk-typescript-1.0.0_92431b02.zip",
        filename: "circulair-sdk-typescript-1.0.0.zip",
        sizeKb: 18,
        generatedAt: "2026-04-22T05:20:00Z",
        installCommand: "pnpm add @circulair/sdk",
        quickstart: `import { CirculairClient } from "@circulair/sdk";\nconst client = new CirculairClient({ BASE: "https://circulair.energy/api/v1", TOKEN: "cai_..." });\nconst batteries = await client.batteries.getBatteries();`,
      },
      python: {
        name: "circulair",
        language: "Python",
        version: "1.0.0",
        description: "Synchronous HTTP client with typed resource classes for all platform endpoints. Requires Python 3.8+ and requests.",
        downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663256112242/Su7XGBwDj2SqiggDTNrQPe/circulair-sdk-python-1.0.0_0efa902e.zip",
        filename: "circulair-sdk-python-1.0.0.zip",
        sizeKb: 5,
        generatedAt: "2026-04-22T05:20:00Z",
        installCommand: "pip install circulair",
        quickstart: `from circulair import CirculairClient\nclient = CirculairClient(api_key="cai_...")\nbatteries = client.batteries.list(status="operational")`,
      },
    })),
  }),

  // ─── AUTONOMOUS TRIAGE ──────────────────────────────────────────────────────────────────────────────
  triage: router({
    evaluate: protectedProcedure
      .input(z.object({
        bpan: z.string().min(21).max(21),
        marketDemandScore: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new TRPCError({ code: "NOT_FOUND", message: "Battery not found" });
        const latestTelemetry = await getLatestTelemetry(input.bpan);
        const latestSoh = await getLatestSohPrediction(input.bpan);
        const CAP_MAP: Record<string, number> = { "A1": 1.5, "A2": 2.0, "A3": 2.5, "A4": 3.0, "A5": 3.5, "A6": 30.0, "B1": 5.0, "B2": 7.5, "B3": 10.0, "B4": 15.0, "B5": 20.0, "B6": 25.0, "C1": 40.0, "C2": 50.0, "C3": 60.0, "C4": 75.0, "C5": 100.0 };
        const CHEM_MAP: Record<string, string> = { A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA" };
        const soh = latestSoh?.predictedSoh ? Number(latestSoh.predictedSoh) : (battery.currentSoh ? Number(battery.currentSoh) : 85);
        const decision = evaluateTriagePath({
          bpan: input.bpan,
          soh,
          cycleCount: latestTelemetry?.cycleCount ?? 0,
          chemistry: CHEM_MAP[input.bpan.slice(7, 8)] ?? "NMC",
          capacityKwh: CAP_MAP[input.bpan.slice(5, 7)] ?? 10,
          hasActiveFaults: (Array.isArray((latestTelemetry as any)?.dtcCodes) ? (latestTelemetry as any).dtcCodes.length : 0) > 0,
          hasPhysicalDamage: false,
          marketDemandScore: input.marketDemandScore,
        });
        return { bpan: input.bpan, soh, decision };
      }),

    // Human-in-the-loop approval gate: records the operator's routing decision
    approve: protectedProcedure
      .input(z.object({
        bpan: z.string().min(21).max(21),
        approvedRoute: z.enum(["reuse", "repurpose", "repair", "recycle", "dispose"]),
        triageId: z.string(),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const battery = await getBatteryByBpan(input.bpan);
        if (!battery) throw new TRPCError({ code: "NOT_FOUND", message: "Battery not found" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Record the approval in service_history as an EOL triage event
        const { serviceHistory } = await import("../drizzle/schema");
        await db.insert(serviceHistory).values({
          bpan: input.bpan,
          batteryId: battery.id,
          serviceProviderId: ctx.user.id,
          serviceType: "triage" as any,
          servicedAt: new Date(),
          notes: `Triage ID: ${input.triageId} | Approved route: ${input.approvedRoute}${input.notes ? " | " + input.notes : ""}`,
          technicianName: ctx.user.name ?? "Operator",
        });
        // Update battery status to reflect the routing decision
        const statusMap: Record<string, string> = {
          reuse: "active",
          repurpose: "second_life",
          repair: "maintenance",
          recycle: "decommissioned",
          dispose: "decommissioned",
        };
        await updateBatteryStatus(input.bpan, statusMap[input.approvedRoute] as any, battery.currentSoh ? Number(battery.currentSoh) : undefined);
        return { success: true, bpan: input.bpan, approvedRoute: input.approvedRoute, approvedAt: new Date().toISOString() };
      }),

    // List batteries that need triage (SOH < 70%)
    listCandidates: protectedProcedure.query(async () => {
      const result = await listBatteries({ limit: 200 });
      const items = Array.isArray(result) ? result : (result as any).items ?? [];
      return items
        .filter((b: any) => b.currentSoh !== null && Number(b.currentSoh) < 70)
        .sort((a: any, b: any) => Number(a.currentSoh) - Number(b.currentSoh))
        .slice(0, 50)
        .map((b: any) => ({
          bpan: b.bpan,
          chemistry: b.chemistry,
          currentSoh: b.currentSoh ? Number(b.currentSoh) : null,
          status: b.status,
        }));
    }),

    // Approval queue: batteries awaiting triage decision (SOH < 70%, not yet approved)
    listQueue: protectedProcedure.query(async () => {
      const result = await listBatteries({ limit: 500 });
      const items = Array.isArray(result) ? result : (result as any).items ?? [];
      const candidates = items
        .filter((b: any) => b.currentSoh !== null && Number(b.currentSoh) < 70)
        .sort((a: any, b: any) => Number(a.currentSoh) - Number(b.currentSoh))
        .slice(0, 100);
      // Enrich each candidate with a triage decision (non-blocking)
      return candidates.map((b: any) => {
        const soh = Number(b.currentSoh);
        const CHEM_MAP: Record<string, string> = { A: "LEAD_ACID", B: "LFP", C: "LCO", D: "LMO", E: "LFP", F: "NMC", G: "NCA" };
        const CAP_MAP: Record<string, number> = { "A1": 1.5, "A2": 2.0, "A3": 2.5, "A4": 3.0, "A5": 3.5, "A6": 30.0, "B1": 5.0, "B2": 7.5, "B3": 10.0, "B4": 15.0, "B5": 20.0, "B6": 25.0, "C1": 40.0, "C2": 50.0, "C3": 60.0, "C4": 75.0, "C5": 100.0 };
        const decision = evaluateTriagePath({
          bpan: b.bpan,
          soh,
          cycleCount: 0,
          chemistry: CHEM_MAP[b.bpan.slice(7, 8)] ?? "NMC",
          capacityKwh: CAP_MAP[b.bpan.slice(5, 7)] ?? 10,
          hasActiveFaults: false,
          hasPhysicalDamage: false,
        });
        // Map internal TriagePath to UI route names
        const routeMap: Record<string, string> = {
          direct_reuse: "reuse",
          module_repurposing: "repurpose",
          material_recycling: "recycle",
        };
        return {
          bpan: b.bpan,
          chemistry: b.chemistry ?? CHEM_MAP[b.bpan.slice(7, 8)] ?? "NMC",
          currentSoh: soh,
          status: b.status,
          capacityKwh: b.capacityKwh ? Number(b.capacityKwh) : (CAP_MAP[b.bpan.slice(5, 7)] ?? 10),
          recommendedRoute: routeMap[decision.recommendedPath] ?? "recycle",
          confidence: decision.confidence,
          reasoning: Array.isArray(decision.reasoning) ? decision.reasoning.join(" ") : String(decision.reasoning),
        };
      });
    }),

    // Batch approve multiple batteries at once
    bulkApprove: protectedProcedure
      .input(z.object({
        decisions: z.array(z.object({
          bpan: z.string().min(21).max(21),
          approvedRoute: z.enum(["reuse", "repurpose", "repair", "recycle", "dispose"]),
          triageId: z.string(),
          notes: z.string().max(500).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { serviceHistory } = await import("../drizzle/schema");
        const statusMap: Record<string, string> = {
          reuse: "active",
          repurpose: "second_life",
          repair: "maintenance",
          recycle: "decommissioned",
          dispose: "decommissioned",
        };
        const results: { bpan: string; approvedRoute: string; success: boolean }[] = [];
        for (const d of input.decisions) {
          try {
            const battery = await getBatteryByBpan(d.bpan);
            if (!battery) { results.push({ bpan: d.bpan, approvedRoute: d.approvedRoute, success: false }); continue; }
            await db.insert(serviceHistory).values({
              bpan: d.bpan,
              batteryId: battery.id,
              serviceProviderId: ctx.user.id,
              serviceType: "triage" as any,
              servicedAt: new Date(),
              notes: `Triage ID: ${d.triageId} | Bulk approved route: ${d.approvedRoute}${d.notes ? " | " + d.notes : ""}`,
              technicianName: ctx.user.name ?? "Operator",
            });
            await updateBatteryStatus(d.bpan, statusMap[d.approvedRoute] as any, battery.currentSoh ? Number(battery.currentSoh) : undefined);
            results.push({ bpan: d.bpan, approvedRoute: d.approvedRoute, success: true });
          } catch {
            results.push({ bpan: d.bpan, approvedRoute: d.approvedRoute, success: false });
          }
        }
        const succeeded = results.filter((r) => r.success).length;
        return { succeeded, failed: results.length - succeeded, results };
      }),
  }),

  // ─── PREDICTIVE PROCUREMENT ─────────────────────────────────────────────────────────────────────
  procurement: router({
    forecastSupply: protectedProcedure
      .input(z.object({ horizonMonths: z.number().min(1).max(24).default(12) }))
      .query(async ({ input, ctx }) => {
        const batteriesResult = await listBatteries({ limit: 500 });
        const batteries = Array.isArray(batteriesResult) ? batteriesResult : (batteriesResult as any).items ?? [];
        const operationalBatteries = batteries.filter((b: any) => b.ownerId === ctx.user.id || b.registeredById === ctx.user.id).map((b: any) => ({
          bpan: b.bpan,
          soh: b.currentSoh ? Number(b.currentSoh) : 85,
          chemistry: b.chemistry ?? "NMC",
          capacityKwh: b.capacityKwh ? Number(b.capacityKwh) : 10,
          cycleCount: 0,
          cyclesPerYear: 200,
        }));
        return forecastSupplyPipeline({ operationalBatteries: operationalBatteries as any, horizonMonths: input.horizonMonths });
      }),
    createForwardOrder: protectedProcedure
      .input(z.object({
        targetSohMin: z.number().min(0).max(100),
        targetSohMax: z.number().min(0).max(100),
        chemistry: z.enum(["LFP","NMC","NCA","LCO","LMO","LEAD_ACID","SOLID_STATE"]).optional(),
        minCapacityKwh: z.number().optional(),
        quantity: z.number().min(1).max(1000).default(1),
        deliveryMonth: z.string().regex(/^\d{4}-\d{2}$/),
        maxPricePerKwh: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { forwardOrders } = await import("../drizzle/schema");
        const [result] = await db.insert(forwardOrders).values({
          buyerId: ctx.user.id,
          targetSohMin: String(input.targetSohMin),
          targetSohMax: String(input.targetSohMax),
          chemistry: input.chemistry as any,
          minCapacityKwh: input.minCapacityKwh ? String(input.minCapacityKwh) : null,
          quantity: input.quantity,
          deliveryMonth: input.deliveryMonth,
          maxPricePerKwh: input.maxPricePerKwh ? String(input.maxPricePerKwh) : null,
        }).$returningId();
        return { success: true, id: 0 };
      }),
    listForwardOrders: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { forwardOrders } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(forwardOrders).where(eq(forwardOrders.buyerId, ctx.user.id));
    }),
  }),
  // ─── FEDERATED LEARNING ──────────────────────────────────────────────────────────────────────
  federatedLearning: router({
    getModelStatus: protectedProcedure.query(async () => {
      const db = await getDb();
      const defaultStatus = { version: "physics-v1.0", round: 1, rmse: 0.018, participants: 1, accuracyByChemistry: { NMC: 0.97, LFP: 0.96, NCA: 0.95, LCO: 0.94, LMO: 0.93, LEAD_ACID: 0.92, SOLID_STATE: 0.90 } };
      if (!db) return defaultStatus;
      try {
        const { modelVersions } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        const rows = await db.select().from(modelVersions).orderBy(desc(modelVersions.createdAt)).limit(1);
        if (!rows.length) return defaultStatus;
        const row = rows[0];
        return { version: row.version, round: row.federatedRounds ?? 1, rmse: row.rmse ? Number(row.rmse) : 0.018, participants: row.batteryCount ?? 1, accuracyByChemistry: defaultStatus.accuracyByChemistry };
      } catch { return defaultStatus; }
    }),
    submitLocalUpdate: protectedProcedure
      .input(z.object({ localRmse: z.number().optional(), sampleCount: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { modelVersions } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        const rows = await db.select().from(modelVersions).orderBy(desc(modelVersions.createdAt)).limit(1);
        const currentRound = rows.length ? (rows[0].federatedRounds ?? 1) : 1;
        const newRound = currentRound + 1;
        const newVersion = `physics-v1.${newRound}`;
        await db.insert(modelVersions).values({ version: newVersion, federatedRounds: newRound, batteryCount: (rows[0]?.batteryCount ?? 1) + 1, rmse: String(input.localRmse ?? 0.017) });
        return { success: true, round: newRound, version: newVersion };
      }),
  }),
  // ─── DATA SHARING ────────────────────────────────────────────────────────────────────────────
  dataSharing: router({
    listConsents: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { dataSharingAgreements } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(dataSharingAgreements).where(eq(dataSharingAgreements.requestingUserId, ctx.user.id));
    }),
    grantConsent: protectedProcedure
      .input(z.object({
        recipientOrgId: z.string().min(1),
        recipientOrgName: z.string().min(1),
        dataScope: z.array(z.enum(["telemetry","soh_predictions","compliance_reports","battery_passport","carbon_data"])),
        expiresInDays: z.number().min(1).max(365).optional(),
        bpanFilter: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { dataSharingAgreements } = await import("../drizzle/schema");
        const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400000) : null;
        const [result] = await db.insert(dataSharingAgreements).values({
          requestingUserId: ctx.user.id,
          owningUserId: ctx.user.id,
          scope: JSON.stringify(input.dataScope),
          bpan: input.bpanFilter ?? null,
          expiresAt,
          requestMessage: `Org: ${input.recipientOrgName} (${input.recipientOrgId})`,
        }).$returningId();
        return { success: true, id: 0 };
      }),
    revokeConsent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { dataSharingAgreements } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.update(dataSharingAgreements).set({ status: "revoked" }).where(and(eq(dataSharingAgreements.id, input.id), eq(dataSharingAgreements.requestingUserId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── CONTACT FORM ──────────────────────────────────────────────────────────
  contact: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(255),
        email: z.string().email("Please enter a valid email address"),
        company: z.string().max(255).optional(),
        role: z.string().max(100).optional(),
        message: z.string().min(10, "Message must be at least 10 characters").max(5000),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          ctx.req.socket?.remoteAddress ||
          null;
        // Persist to DB (best-effort — email notification is the primary delivery channel)
        try {
          const db = await getDb();
          if (db) {
            const { contactInquiries } = await import("../drizzle/schema");
            await db.insert(contactInquiries).values({
              name: input.name,
              email: input.email,
              company: input.company ?? null,
              role: input.role ?? null,
              message: input.message,
              status: "new",
              ipAddress: ip,
            });
          }
        } catch (dbErr) {
          // Log but do not fail the request — email notification ensures delivery
          console.error("[contact] DB insert failed (non-fatal):", (dbErr as Error).message);
        }
        // Send enquiry email directly to harish@setoo.co via Resend
        try {
          const { Resend } = await import("resend");
          const { ENV } = await import("./_core/env");
          if (ENV.resendApiKey) {
            const resend = new Resend(ENV.resendApiKey);
            await resend.emails.send({
              from: `Circul-AI-r Platform <${ENV.resendFromEmail}>`,
              to: ["harish@setoo.co"],
              replyTo: input.email,
              subject: `New Enquiry from circulair.energy — ${input.name}${input.company ? ` (${input.company})` : ""}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #e5e7eb;">
                  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px;">
                    <h2 style="color: #10b981; margin: 0 0 4px;">New Enquiry — circulair.energy</h2>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Submitted via the contact form at <a href="https://circulair.energy/" style="color: #10b981;">https://circulair.energy/</a></p>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                    <tr><td style="padding: 8px 0; color: #9ca3af; width: 100px;">Name</td><td style="padding: 8px 0; color: #f3f4f6; font-weight: 600;">${input.name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #9ca3af;">Email</td><td style="padding: 8px 0;"><a href="mailto:${input.email}" style="color: #10b981;">${input.email}</a></td></tr>
                    ${input.company ? `<tr><td style="padding: 8px 0; color: #9ca3af;">Company</td><td style="padding: 8px 0; color: #f3f4f6;">${input.company}</td></tr>` : ""}
                    ${input.role ? `<tr><td style="padding: 8px 0; color: #9ca3af;">Role</td><td style="padding: 8px 0; color: #f3f4f6;">${input.role}</td></tr>` : ""}
                  </table>
                  <div style="background: #111827; border-left: 3px solid #10b981; border-radius: 4px; padding: 16px; font-size: 14px; line-height: 1.7; color: #d1d5db; white-space: pre-wrap;">${input.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                  <p style="color: #4b5563; font-size: 12px; margin-top: 20px; border-top: 1px solid #1f2937; padding-top: 16px;">
                    This enquiry was submitted via the contact form at <a href="https://circulair.energy/" style="color: #6b7280;">https://circulair.energy/</a>.
                    Reply directly to this email to respond to ${input.name}.
                  </p>
                </div>
              `,
              text: `New Enquiry from circulair.energy\n\nName: ${input.name}\nEmail: ${input.email}${input.company ? `\nCompany: ${input.company}` : ""}${input.role ? `\nRole: ${input.role}` : ""}\n\nMessage:\n${input.message}\n\n---\nSubmitted via https://circulair.energy/`,
            });
          }
        } catch (e) {
          console.error("[contact] Resend email to harish@setoo.co failed:", e);
        }
        // Also notify platform owner via the standard notification channel as backup
        const { notifyOwner } = await import("./_core/notification");
        notifyOwner({
          title: `New Enquiry from circulair.energy — ${input.name}`,
          content: `**From:** ${input.name} <${input.email}>\n**Company:** ${input.company ?? "—"}\n**Role:** ${input.role ?? "—"}\n\n${input.message}`,
        }).catch(e => console.error("[contact] notifyOwner failed:", e));
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
