import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  float,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Platform-specific role
  platformRole: mysqlEnum("platformRole", [
    "admin",
    "oem",
    "manufacturer",
    "recycler",
    "bess_developer",
    "service_provider",
    "government",
  ]).default("oem").notNull(),
  organization: varchar("organization", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── BATTERIES (BPAN REGISTRY) ────────────────────────────────────────────────
export const batteries = mysqlTable("batteries", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull().unique(),
  // Segment 1: BMI (Battery Manufacturer Identifier)
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  manufacturerId: varchar("manufacturerId", { length: 3 }).notNull(),
  // Segment 2: BDS (Battery Descriptor Section)
  capacityCode: varchar("capacityCode", { length: 2 }).notNull(),
  capacityKwh: decimal("capacityKwh", { precision: 8, scale: 2 }).notNull(),
  chemistryCode: varchar("chemistryCode", { length: 1 }).notNull(),
  chemistry: mysqlEnum("chemistry", ["LFP", "NMC", "NCA", "LCO", "LMO", "LEAD_ACID"]).notNull(),
  voltageCode: varchar("voltageCode", { length: 2 }).notNull(),
  voltageV: decimal("voltageV", { precision: 8, scale: 1 }).notNull(),
  cellOriginCode: varchar("cellOriginCode", { length: 2 }).notNull(),
  cellOriginCountry: varchar("cellOriginCountry", { length: 100 }).notNull(),
  extinguisherClass: varchar("extinguisherClass", { length: 1 }).notNull(),
  // Segment 3: BI (Battery Identifier)
  mfgYear: int("mfgYear").notNull(),
  mfgMonth: int("mfgMonth").notNull(),
  mfgDay: int("mfgDay").notNull(),
  factoryCode: varchar("factoryCode", { length: 1 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 4 }).notNull(),
  // Material Composition Section (BMCS)
  recyclabilityPct: decimal("recyclabilityPct", { precision: 5, scale: 2 }),
  lithiumPct: decimal("lithiumPct", { precision: 5, scale: 2 }),
  cobaltPct: decimal("cobaltPct", { precision: 5, scale: 2 }),
  nickelPct: decimal("nickelPct", { precision: 5, scale: 2 }),
  manganesePct: decimal("manganesePct", { precision: 5, scale: 2 }),
  carbonFootprintKgCo2: decimal("carbonFootprintKgCo2", { precision: 10, scale: 2 }),
  // Dynamic Data
  status: mysqlEnum("status", ["operational", "second_life", "end_of_life", "in_transit", "recycling"]).default("operational").notNull(),
  currentSoh: decimal("currentSoh", { precision: 5, scale: 2 }),
  cycleCount: int("cycleCount").default(0),
  lastServiceDate: timestamp("lastServiceDate"),
  disassemblyMethod: varchar("disassemblyMethod", { length: 255 }),
  // Ownership
  registeredById: int("registeredById"),
  ownerId: int("ownerId"),
  vehicleId: varchar("vehicleId", { length: 100 }),
  qrCodeUrl: text("qrCodeUrl"),
  healthPassportUrl: text("healthPassportUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Battery = typeof batteries.$inferSelect;
export type InsertBattery = typeof batteries.$inferInsert;

// ─── TELEMETRY ────────────────────────────────────────────────────────────────
export const telemetry = mysqlTable("telemetry", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  // Level 1: High-frequency raw sensor data
  vPack: decimal("vPack", { precision: 8, scale: 2 }),       // Pack voltage (V)
  iPack: decimal("iPack", { precision: 8, scale: 2 }),       // Pack current (A)
  vMin: decimal("vMin", { precision: 7, scale: 3 }),         // Min cell voltage (V)
  vMax: decimal("vMax", { precision: 7, scale: 3 }),         // Max cell voltage (V)
  tPack: decimal("tPack", { precision: 6, scale: 2 }),       // Pack temperature (°C)
  tMax: decimal("tMax", { precision: 6, scale: 2 }),         // Max cell temperature (°C)
  // Level 2: Aggregated data
  cycleCount: int("cycleCount"),
  irPack: decimal("irPack", { precision: 8, scale: 3 }),     // Internal resistance (mΩ)
  sohEstimate: decimal("sohEstimate", { precision: 5, scale: 2 }), // BMS SOH estimate (%)
  dtcCodes: json("dtcCodes"),                                // Diagnostic trouble codes
  // Anomaly flags
  thermalAnomaly: boolean("thermalAnomaly").default(false),
  anomalyType: varchar("anomalyType", { length: 100 }),
  // Source
  source: mysqlEnum("source", ["mqtt", "manual", "api", "simulated"]).default("simulated"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type Telemetry = typeof telemetry.$inferSelect;
export type InsertTelemetry = typeof telemetry.$inferInsert;

// ─── SOH PREDICTIONS ─────────────────────────────────────────────────────────
export const sohPredictions = mysqlTable("soh_predictions", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  predictedSoh: decimal("predictedSoh", { precision: 5, scale: 2 }).notNull(),
  rulCycles: int("rulCycles"),                               // Remaining useful life (cycles)
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  rmse: decimal("rmse", { precision: 6, scale: 4 }),
  triagePath: mysqlEnum("triagePath", ["direct_reuse", "module_repurposing", "material_recycling"]),
  triageReason: text("triageReason"),
  maintenanceRecommendations: json("maintenanceRecommendations"),
  modelVersion: varchar("modelVersion", { length: 20 }).default("v3.2.1"),
  predictedAt: timestamp("predictedAt").defaultNow().notNull(),
});

export type SohPrediction = typeof sohPredictions.$inferSelect;

// ─── MARKETPLACE LISTINGS ─────────────────────────────────────────────────────
export const marketplaceListings = mysqlTable("marketplace_listings", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  sellerId: int("sellerId").notNull(),
  listingType: mysqlEnum("listingType", ["direct_reuse", "module_repurposing", "black_mass", "second_life_pack"]).notNull(),
  askingPriceInr: decimal("askingPriceInr", { precision: 12, scale: 2 }),
  spotPriceInr: decimal("spotPriceInr", { precision: 12, scale: 2 }),
  sohAtListing: decimal("sohAtListing", { precision: 5, scale: 2 }),
  rulAtListing: int("rulAtListing"),
  capacityKwh: decimal("capacityKwh", { precision: 8, scale: 2 }),
  chemistry: varchar("chemistry", { length: 20 }),
  healthPassportUrl: text("healthPassportUrl"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "sold", "reserved", "expired", "withdrawn"]).default("active").notNull(),
  buyerId: int("buyerId"),
  transactionDate: timestamp("transactionDate"),
  finalPriceInr: decimal("finalPriceInr", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

// ─── LOGISTICS SHIPMENTS ──────────────────────────────────────────────────────
export const logistics = mysqlTable("logistics", {
  id: int("id").autoincrement().primaryKey(),
  shipmentId: varchar("shipmentId", { length: 20 }).notNull().unique(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  requestedById: int("requestedById").notNull(),
  pickupAddress: text("pickupAddress").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }),
  currentLat: decimal("currentLat", { precision: 10, scale: 7 }),
  currentLng: decimal("currentLng", { precision: 10, scale: 7 }),
  logisticsPartner: varchar("logisticsPartner", { length: 255 }),
  driverName: varchar("driverName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 20 }),
  hazmatManifestUrl: text("hazmatManifestUrl"),
  slaTier: mysqlEnum("slaTier", ["24h", "48h", "72h"]).default("48h"),
  status: mysqlEnum("status", ["pending", "dispatched", "in_transit", "delivered", "failed"]).default("pending").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  dispatchedAt: timestamp("dispatchedAt"),
  estimatedDelivery: timestamp("estimatedDelivery"),
  deliveredAt: timestamp("deliveredAt"),
  slaBreached: boolean("slaBreached").default(false),
  notes: text("notes"),
});

export type Logistics = typeof logistics.$inferSelect;
export type InsertLogistics = typeof logistics.$inferInsert;

// ─── EPR COMPLIANCE ───────────────────────────────────────────────────────────
export const eprTokens = mysqlTable("epr_tokens", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: varchar("tokenId", { length: 64 }).notNull().unique(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  recyclerId: int("recyclerId").notNull(),
  producerId: int("producerId"),
  actualYieldKg: decimal("actualYieldKg", { precision: 10, scale: 3 }).notNull(),
  theoreticalYieldKg: decimal("theoreticalYieldKg", { precision: 10, scale: 3 }).notNull(),
  yieldRatio: decimal("yieldRatio", { precision: 5, scale: 4 }).notNull(),
  blackMassKg: decimal("blackMassKg", { precision: 10, scale: 3 }),
  lithiumRecoveredKg: decimal("lithiumRecoveredKg", { precision: 10, scale: 3 }),
  cobaltRecoveredKg: decimal("cobaltRecoveredKg", { precision: 10, scale: 3 }),
  nickelRecoveredKg: decimal("nickelRecoveredKg", { precision: 10, scale: 3 }),
  status: mysqlEnum("status", ["pending", "verified", "rejected", "disputed"]).default("pending").notNull(),
  blockchainTxHash: varchar("blockchainTxHash", { length: 128 }),
  blockchainBlock: int("blockchainBlock"),
  cpcbFormUrl: text("cpcbFormUrl"),
  pliPassportUrl: text("pliPassportUrl"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EprToken = typeof eprTokens.$inferSelect;
export type InsertEprToken = typeof eprTokens.$inferInsert;

// ─── YIELD VERIFICATION ───────────────────────────────────────────────────────
export const yieldVerifications = mysqlTable("yield_verifications", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batchId", { length: 32 }).notNull().unique(),
  recyclerId: int("recyclerId").notNull(),
  bpanList: json("bpanList").notNull(),                      // Array of BPANs in batch
  totalBatteriesCount: int("totalBatteriesCount").notNull(),
  totalTheoreticalYieldKg: decimal("totalTheoreticalYieldKg", { precision: 12, scale: 3 }).notNull(),
  totalActualYieldKg: decimal("totalActualYieldKg", { precision: 12, scale: 3 }),
  blackMassYieldKg: decimal("blackMassYieldKg", { precision: 12, scale: 3 }),
  lithiumYieldKg: decimal("lithiumYieldKg", { precision: 12, scale: 3 }),
  cobaltYieldKg: decimal("cobaltYieldKg", { precision: 12, scale: 3 }),
  nickelYieldKg: decimal("nickelYieldKg", { precision: 12, scale: 3 }),
  processingMethod: varchar("processingMethod", { length: 100 }),
  scadaDataUrl: text("scadaDataUrl"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  eprTokenId: int("eprTokenId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type YieldVerification = typeof yieldVerifications.$inferSelect;

// ─── ALERTS ───────────────────────────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  bpan: varchar("bpan", { length: 21 }),
  batteryId: int("batteryId"),
  type: mysqlEnum("type", [
    "thermal_anomaly",
    "eol_detected",
    "logistics_dispatch",
    "epr_token_issued",
    "compliance_deadline",
    "soh_degradation",
    "sla_breach",
    "yield_verified",
    "marketplace_match",
    "system",
  ]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  read: boolean("read").default(false).notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "battery_certificate",
    "health_passport",
    "compliance_report",
    "recycling_manifest",
    "hazmat_manifest",
    "audit_trail",
    "cpcb_form",
    "pli_passport",
    "material_composition",
    "other",
  ]).notNull(),
  bpan: varchar("bpan", { length: 21 }),
  batteryId: int("batteryId"),
  uploadedById: int("uploadedById").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  fileSizeBytes: int("fileSizeBytes"),
  mimeType: varchar("mimeType", { length: 100 }),
  accessLevel: mysqlEnum("accessLevel", ["public", "organization", "private", "government"]).default("organization").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── SERVICE HISTORY ──────────────────────────────────────────────────────────
export const serviceHistory = mysqlTable("service_history", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  serviceProviderId: int("serviceProviderId").notNull(),
  serviceType: mysqlEnum("serviceType", [
    "inspection",
    "maintenance",
    "repair",
    "replacement",
    "eol_assessment",
    "triage",
  ]).notNull(),
  sohBefore: decimal("sohBefore", { precision: 5, scale: 2 }),
  sohAfter: decimal("sohAfter", { precision: 5, scale: 2 }),
  cycleCountAtService: int("cycleCountAtService"),
  notes: text("notes"),
  technicianName: varchar("technicianName", { length: 255 }),
  location: varchar("location", { length: 255 }),
  servicedAt: timestamp("servicedAt").defaultNow().notNull(),
  nextServiceDue: timestamp("nextServiceDue"),
});

export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = typeof serviceHistory.$inferInsert;

// ─── AI CHAT SESSIONS ─────────────────────────────────────────────────────────
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
