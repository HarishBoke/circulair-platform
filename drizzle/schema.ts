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
  passwordHash: varchar("passwordHash", { length: 255 }),
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

// ─── ROLE AUDIT LOG ───────────────────────────────────────────────────────────
export const roleAuditLog = mysqlTable("roleAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  targetUserId: int("targetUserId").notNull(),
  targetUserName: text("targetUserName"),
  targetUserEmail: varchar("targetUserEmail", { length: 320 }),
  changedByUserId: int("changedByUserId").notNull(),
  changedByName: text("changedByName"),
  previousPlatformRole: varchar("previousPlatformRole", { length: 64 }),
  newPlatformRole: varchar("newPlatformRole", { length: 64 }).notNull(),
  previousRole: varchar("previousRole", { length: 32 }),
  newRole: varchar("newRole", { length: 32 }),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoleAuditLog = typeof roleAuditLog.$inferSelect;
export type InsertRoleAuditLog = typeof roleAuditLog.$inferInsert;

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
  conditionGrade: varchar("condition_grade", { length: 20 }),
  conditionNotes: text("condition_notes"),
  location: varchar("location", { length: 256 }),
  photoCount: int("photoCount").default(0),
  primaryPhotoUrl: text("primaryPhotoUrl"),
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

// ─── REGULATORY PROFILES ──────────────────────────────────────────────────────
// Stores jurisdiction-specific compliance data for each battery.
// One battery can have multiple profiles (one per target market).
export const regulatoryProfiles = mysqlTable("regulatory_profiles", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  jurisdiction: varchar("jurisdiction", { length: 10 }).notNull(),
  localId: varchar("localId", { length: 128 }),
  status: mysqlEnum("status", ["compliant", "non_compliant", "pending", "not_applicable", "data_incomplete"]).default("pending").notNull(),
  profileData: json("profileData").notNull(),
  govSyncStatus: mysqlEnum("govSyncStatus", ["synced", "pending", "failed", "not_required"]).default("not_required").notNull(),
  lastGovSyncAt: timestamp("lastGovSyncAt"),
  lastCheckedAt: timestamp("lastCheckedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RegulatoryProfile = typeof regulatoryProfiles.$inferSelect;
export type InsertRegulatoryProfile = typeof regulatoryProfiles.$inferInsert;

// ─── CARBON FOOTPRINT DECLARATIONS ───────────────────────────────────────────
export const carbonFootprintDeclarations = mysqlTable("carbon_footprint_declarations", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  totalKgCo2e: decimal("totalKgCo2e", { precision: 10, scale: 3 }).notNull(),
  rawMaterialKgCo2e: decimal("rawMaterialKgCo2e", { precision: 10, scale: 3 }),
  productionKgCo2e: decimal("productionKgCo2e", { precision: 10, scale: 3 }),
  distributionKgCo2e: decimal("distributionKgCo2e", { precision: 10, scale: 3 }),
  endOfLifeKgCo2e: decimal("endOfLifeKgCo2e", { precision: 10, scale: 3 }),
  performanceClass: mysqlEnum("performanceClass", ["A", "B", "C", "D", "E"]),
  methodology: mysqlEnum("methodology", ["GHG_PROTOCOL", "ISO_14067", "EU_PEF", "GBA"]).default("GHG_PROTOCOL").notNull(),
  certifyingBody: varchar("certifyingBody", { length: 255 }),
  declaredById: int("declaredById").notNull(),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarbonFootprintDeclaration = typeof carbonFootprintDeclarations.$inferSelect;
export type InsertCarbonFootprintDeclaration = typeof carbonFootprintDeclarations.$inferInsert;

// ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────
export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  locale: varchar("locale", { length: 20 }).default("en-IN").notNull(),
  displayCurrency: varchar("displayCurrency", { length: 10 }).default("INR").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Asia/Kolkata").notNull(),
  activeJurisdictions: json("activeJurisdictions").$type<string[]>().notNull(),
  dataResidencyRegion: mysqlEnum("dataResidencyRegion", ["in", "eu", "cn", "us", "global"]).default("in").notNull(),
  organisationName: varchar("organisationName", { length: 255 }),
  organisationCountry: varchar("organisationCountry", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;

// ─── MARKETPLACE LISTINGS CURRENCY EXTENSION ─────────────────────────────────
export const marketplaceListingsCurrency = mysqlTable("marketplace_listings_currency", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull().unique(),
  priceUsd: decimal("priceUsd", { precision: 14, scale: 4 }),
  listingCurrency: varchar("listingCurrency", { length: 10 }).default("INR").notNull(),
  listingCurrencyAmount: decimal("listingCurrencyAmount", { precision: 14, scale: 4 }),
  exchangeRateAtListing: decimal("exchangeRateAtListing", { precision: 14, scale: 6 }),
  targetMarkets: json("targetMarkets").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketplaceListingCurrency = typeof marketplaceListingsCurrency.$inferSelect;
export type InsertMarketplaceListingCurrency = typeof marketplaceListingsCurrency.$inferInsert;

// ─── RECYCLED CONTENT DECLARATIONS ────────────────────────────────────────────
export const recycledContentDeclarations = mysqlTable("recycled_content_declarations", {
  id: int("id").autoincrement().primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: int("batteryId").notNull(),
  cobaltPct: decimal("cobaltPct", { precision: 5, scale: 2 }),
  lithiumPct: decimal("lithiumPct", { precision: 5, scale: 2 }),
  nickelPct: decimal("nickelPct", { precision: 5, scale: 2 }),
  leadPct: decimal("leadPct", { precision: 5, scale: 2 }),
  totalRecycledPct: decimal("totalRecycledPct", { precision: 5, scale: 2 }),
  verificationMethod: mysqlEnum("verificationMethod", ["SELF_DECLARED", "THIRD_PARTY_AUDIT", "CERTIFIED_LAB"]).default("SELF_DECLARED").notNull(),
  certifyingBody: varchar("certifyingBody", { length: 255 }),
  certificateRef: varchar("certificateRef", { length: 255 }),
  notes: text("notes"),
  declaredById: int("declaredById").notNull(),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecycledContentDeclaration = typeof recycledContentDeclarations.$inferSelect;
export type InsertRecycledContentDeclaration = typeof recycledContentDeclarations.$inferInsert;

// ─── AGENT ACTIONS LOG ──────────────────────────────────────────────────────
// Tracks every action performed by human users or AI agents on the platform.
// Enables full audit trail, super admin oversight, and agentic workflow replay.
export const agentActions = mysqlTable("agent_actions", {
  id: int("id").autoincrement().primaryKey(),
  /** Who performed the action — user ID (null for system/cron) */
  actorId: int("actorId"),
  /** Actor display name for quick lookups */
  actorName: varchar("actorName", { length: 255 }),
  /** Whether the actor is a human user or an AI agent */
  actorType: mysqlEnum("actorType", ["human", "agent", "system"]).default("human").notNull(),
  /** The tRPC procedure or action identifier (e.g. "bpan.generate", "marketplace.create") */
  action: varchar("action", { length: 255 }).notNull(),
  /** Human-readable description of what happened */
  description: text("description"),
  /** The module/domain this action belongs to */
  module: mysqlEnum("module", [
    "battery", "telemetry", "marketplace", "compliance",
    "logistics", "analytics", "admin", "system", "agent", "ai"
  ]).default("system").notNull(),
  /** Structured input parameters (JSON) */
  inputParams: json("inputParams"),
  /** Structured output / result summary (JSON) */
  outputResult: json("outputResult"),
  /** Outcome of the action */
  status: mysqlEnum("status", ["success", "failure", "pending", "cancelled"]).default("success").notNull(),
  /** Error message if status is failure */
  errorMessage: text("errorMessage"),
  /** Duration in milliseconds */
  durationMs: int("durationMs"),
  /** IP address of the requester */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** Related entity (BPAN, listing ID, etc.) */
  targetEntity: varchar("targetEntity", { length: 255 }),
  /** Related entity type */
  targetEntityType: varchar("targetEntityType", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentAction = typeof agentActions.$inferSelect;
export type InsertAgentAction = typeof agentActions.$inferInsert;

// ─── WARRANTY RECORDS ──────────────────────────────────────────────────────
// Full warranty lifecycle: registration → active → expired/voided/claimed.
// Tracks customer contact info (phone, WhatsApp, email) for multi-channel verification.
export const warrantyRecords = mysqlTable("warranty_records", {
  id: int("id").autoincrement().primaryKey(),
  /** Link to batteries table */
  batteryId: int("batteryId").notNull(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  /** Manufacturer serial number (original, pre-BPAN) */
  serialNumber: varchar("serialNumber", { length: 100 }),
  modelNumber: varchar("modelNumber", { length: 100 }),
  /** Warranty terms */
  warrantyType: mysqlEnum("warrantyType", ["standard", "extended", "premium", "commercial"]).default("standard").notNull(),
  coverageType: mysqlEnum("coverageType", [
    "full_replacement", "pro_rata", "labor_only", "parts_only", "comprehensive"
  ]).default("full_replacement").notNull(),
  warrantyTermMonths: int("warrantyTermMonths").notNull(),
  /** Key dates */
  purchaseDate: timestamp("purchaseDate").notNull(),
  warrantyStartDate: timestamp("warrantyStartDate").notNull(),
  warrantyEndDate: timestamp("warrantyEndDate").notNull(),
  /** Warranty status — computed from dates + manual overrides */
  status: mysqlEnum("status", [
    "active", "expired", "voided", "claimed", "suspended", "pending_activation"
  ]).default("pending_activation").notNull(),
  /** Customer information */
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerWhatsApp: varchar("customerWhatsApp", { length: 20 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerAddress: text("customerAddress"),
  /** Dealer / Point of Sale */
  dealerName: varchar("dealerName", { length: 255 }),
  dealerCode: varchar("dealerCode", { length: 50 }),
  dealerPhone: varchar("dealerPhone", { length: 20 }),
  dealerEmail: varchar("dealerEmail", { length: 320 }),
  /** Purchase documentation */
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  invoiceUrl: text("invoiceUrl"),
  purchaseAmount: decimal("purchaseAmount", { precision: 12, scale: 2 }),
  purchaseCurrency: varchar("purchaseCurrency", { length: 10 }).default("INR"),
  /** Manufacturer info */
  manufacturer: varchar("manufacturer", { length: 255 }),
  /** Claim tracking */
  totalClaims: int("totalClaims").default(0),
  lastClaimDate: timestamp("lastClaimDate"),
  /** Notes and metadata */
  notes: text("notes"),
  metadata: json("metadata"),
  /** Registration tracking */
  registeredById: int("registeredById").notNull(),
  activatedAt: timestamp("activatedAt"),
  voidedAt: timestamp("voidedAt"),
  voidReason: text("voidReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WarrantyRecord = typeof warrantyRecords.$inferSelect;
export type InsertWarrantyRecord = typeof warrantyRecords.$inferInsert;

// ─── WARRANTY CLAIMS ─────────────────────────────────────────────────────────
// Individual warranty claim records with full resolution workflow.
export const warrantyClaims = mysqlTable("warranty_claims", {
  id: int("id").autoincrement().primaryKey(),
  warrantyId: int("warrantyId").notNull(),
  batteryId: int("batteryId").notNull(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  /** Claim details */
  claimType: mysqlEnum("claimType", [
    "defect", "performance_degradation", "physical_damage",
    "thermal_event", "capacity_loss", "premature_failure", "other"
  ]).notNull(),
  description: text("description").notNull(),
  /** Evidence */
  evidenceUrls: json("evidenceUrls").$type<string[]>(),
  sohAtClaim: decimal("sohAtClaim", { precision: 5, scale: 2 }),
  cycleCountAtClaim: int("cycleCountAtClaim"),
  /** Resolution workflow */
  status: mysqlEnum("status", [
    "submitted", "under_review", "approved", "rejected",
    "in_repair", "replacement_issued", "resolved", "escalated"
  ]).default("submitted").notNull(),
  assignedTo: varchar("assignedTo", { length: 255 }),
  resolutionType: mysqlEnum("resolutionType", [
    "replacement", "repair", "refund", "pro_rata_credit", "rejected", "pending"
  ]).default("pending"),
  resolutionNotes: text("resolutionNotes"),
  resolutionDate: timestamp("resolutionDate"),
  /** Tracking */
  claimedById: int("claimedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
export type InsertWarrantyClaim = typeof warrantyClaims.$inferInsert;

// ─── BULK ONBOARDING JOBS ────────────────────────────────────────────────────
// Tracks batch imports of existing batteries with auto-BPAN generation.
export const bulkOnboardingJobs = mysqlTable("bulk_onboarding_jobs", {
  id: int("id").autoincrement().primaryKey(),
  /** Job metadata */
  jobName: varchar("jobName", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["csv_import", "api_batch", "manual_entry", "agent"]).default("csv_import").notNull(),
  /** Counts */
  totalRecords: int("totalRecords").notNull(),
  processedRecords: int("processedRecords").default(0),
  successCount: int("successCount").default(0),
  failureCount: int("failureCount").default(0),
  skippedCount: int("skippedCount").default(0),
  /** Status */
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  /** Results */
  errorLog: json("errorLog").$type<{ row: number; error: string }[]>(),
  generatedBpans: json("generatedBpans").$type<string[]>(),
  /** Options */
  autoGenerateBpan: boolean("autoGenerateBpan").default(true),
  registerWarranty: boolean("registerWarranty").default(false),
  defaultWarrantyMonths: int("defaultWarrantyMonths"),
  /** Tracking */
  createdById: int("createdById").notNull(),
  csvFileUrl: text("csvFileUrl"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BulkOnboardingJob = typeof bulkOnboardingJobs.$inferSelect;
export type InsertBulkOnboardingJob = typeof bulkOnboardingJobs.$inferInsert;

// ─── AUDIT LOGS (ISO 27001 / SOC 2) ────────────────────────────────────────
// Comprehensive audit trail for all platform operations.
// Captures who, what, when, where, and outcome for every significant action.
// Supports ISO 27001 A.12.4 (Logging and monitoring) and SOC 2 CC7.2 (System monitoring).
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** Trace ID for correlating related operations */
  traceId: varchar("traceId", { length: 64 }).notNull(),
  /** Who performed the action */
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 64 }),
  /** Actor type: human, agent, system, api_key */
  actorType: mysqlEnum("actorType", ["human", "agent", "system", "api_key"]).default("human").notNull(),
  /** API key ID if actor is api_key */
  apiKeyId: int("apiKeyId"),
  /** What happened */
  action: varchar("action", { length: 255 }).notNull(),
  /** ISO 27001 data classification */
  dataClassification: mysqlEnum("dataClassification", ["public", "internal", "confidential", "restricted"]).default("internal").notNull(),
  /** Resource type and ID */
  resourceType: varchar("resourceType", { length: 64 }),
  resourceId: varchar("resourceId", { length: 255 }),
  /** Module/domain */
  module: varchar("module", { length: 64 }),
  /** HTTP method and path */
  httpMethod: varchar("httpMethod", { length: 10 }),
  httpPath: varchar("httpPath", { length: 512 }),
  /** Request details */
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  /** Input summary (sanitized — no passwords/tokens) */
  inputSummary: json("inputSummary"),
  /** Output summary */
  outputSummary: json("outputSummary"),
  /** Result */
  status: mysqlEnum("status", ["success", "failure", "denied", "error"]).default("success").notNull(),
  errorCode: varchar("errorCode", { length: 64 }),
  errorMessage: text("errorMessage"),
  /** Performance */
  durationMs: int("durationMs"),
  /** SOC 2 CC6.1 — Logical access security */
  sessionId: varchar("sessionId", { length: 128 }),
  /** Compliance tags */
  complianceTags: json("complianceTags").$type<string[]>(),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── SECURITY EVENTS (SIEM-READY) ──────────────────────────────────────────
// Dedicated security event log for ISO 27001 A.12.4.1 and SOC 2 CC7.2.
// Captures authentication, authorization, and security-relevant events.
export const securityEvents = mysqlTable("security_events", {
  id: int("id").autoincrement().primaryKey(),
  /** Event classification */
  eventType: mysqlEnum("eventType", [
    "login_success", "login_failure", "logout",
    "role_change", "permission_denied", "api_key_created", "api_key_revoked",
    "data_export", "data_deletion", "password_change",
    "session_expired", "concurrent_session_blocked",
    "rate_limit_exceeded", "suspicious_activity",
    "compliance_violation", "config_change"
  ]).notNull(),
  /** Severity for SIEM integration */
  severity: mysqlEnum("severity", ["info", "low", "medium", "high", "critical"]).default("info").notNull(),
  /** Who */
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  /** Details */
  description: text("description").notNull(),
  metadata: json("metadata"),
  /** Where */
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  /** Correlation */
  traceId: varchar("traceId", { length: 64 }),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// ─── API KEYS ───────────────────────────────────────────────────────────────
// API key management for microservices integration.
// Supports scoped access, rate limiting, and key rotation.
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  /** Key metadata */
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** The hashed key (SHA-256) — never store plaintext */
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
  /** Key prefix for identification (first 8 chars) */
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  /** Owner */
  userId: int("userId").notNull(),
  /** Scopes: which modules/actions this key can access */
  scopes: json("scopes").$type<string[]>().notNull(),
  /** Rate limiting */
  rateLimitTier: mysqlEnum("rateLimitTier", ["free", "standard", "premium", "enterprise"]).default("standard").notNull(),
  rateLimit: int("rateLimit").default(100), // requests per minute
  /** Status */
  status: mysqlEnum("status", ["active", "revoked", "expired"]).default("active").notNull(),
  /** Usage tracking */
  lastUsedAt: timestamp("lastUsedAt"),
  totalRequests: bigint("totalRequests", { mode: "number" }).default(0),
  /** Expiry */
  expiresAt: timestamp("expiresAt"),
  /** Audit */
  revokedAt: timestamp("revokedAt"),
  revokedReason: text("revokedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── API USAGE LOGS ─────────────────────────────────────────────────────────
// Per-request usage tracking for API keys.
export const apiUsageLogs = mysqlTable("api_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  endpoint: varchar("endpoint", { length: 512 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: int("statusCode"),
  durationMs: int("durationMs"),
  requestSize: int("requestSize"),
  responseSize: int("responseSize"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  traceId: varchar("traceId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = typeof apiUsageLogs.$inferInsert;

// ─── WEBHOOKS ───────────────────────────────────────────────────────────────
// Webhook subscriptions for event-driven microservices integration.
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner */
  userId: int("userId").notNull(),
  /** Webhook configuration */
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  /** Secret for HMAC signature verification */
  secret: varchar("secret", { length: 128 }).notNull(),
  /** Events to subscribe to */
  events: json("events").$type<string[]>().notNull(),
  /** Status */
  status: mysqlEnum("status", ["active", "paused", "failed"]).default("active").notNull(),
  /** Retry config */
  maxRetries: int("maxRetries").default(3),
  /** Stats */
  totalDeliveries: int("totalDeliveries").default(0),
  totalFailures: int("totalFailures").default(0),
  lastDeliveryAt: timestamp("lastDeliveryAt"),
  lastFailureAt: timestamp("lastFailureAt"),
  lastFailureReason: text("lastFailureReason"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;


// ─── WIKI FEEDBACK ───────────────────────────────────────────────────────────
export const wikiFeedback = mysqlTable("wiki_feedback", {
  id: int("id").autoincrement().primaryKey(),
  /** Article this feedback is about */
  articleId: varchar("articleId", { length: 128 }).notNull(),
  articleTitle: varchar("articleTitle", { length: 256 }).notNull(),
  /** Feedback type */
  type: mysqlEnum("feedbackType", [
    "suggest_edit",
    "flag_outdated",
    "flag_inaccurate",
    "request_topic",
    "rate_helpful",
    "rate_not_helpful",
    "general",
  ]).notNull(),
  /** User-provided details */
  content: text("content"),
  /** Suggested replacement text (for suggest_edit) */
  suggestedContent: text("suggestedContent"),
  /** Section of the article (optional) */
  section: varchar("section", { length: 256 }),
  /** Helpfulness rating 1-5 */
  rating: int("rating"),
  /** Review status */
  status: mysqlEnum("reviewStatus", [
    "pending",
    "approved",
    "rejected",
    "merged",
  ]).default("pending").notNull(),
  /** Admin review notes */
  reviewNotes: text("reviewNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  /** Submitter info */
  userId: int("userId"),
  userName: varchar("userName", { length: 256 }),
  userEmail: varchar("userEmail", { length: 320 }),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WikiFeedback = typeof wikiFeedback.$inferSelect;
export type InsertWikiFeedback = typeof wikiFeedback.$inferInsert;

// ─── TUTORIAL PROGRESS ───────────────────────────────────────────────────────
export const tutorialProgress = mysqlTable("tutorial_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Step key (e.g., "register_battery", "check_warranty") */
  stepKey: varchar("stepKey", { length: 128 }).notNull(),
  /** Whether this step has been completed */
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TutorialProgress = typeof tutorialProgress.$inferSelect;
export type InsertTutorialProgress = typeof tutorialProgress.$inferInsert;

// ─── CONSENT LOGS (GDPR Article 7 accountability) ────────────────────────────
export const consentLogs = mysqlTable("consent_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** Null for anonymous/pre-login users */
  userId: int("userId"),
  /** Browser fingerprint (hashed IP + user agent) for anonymous tracking */
  fingerprint: varchar("fingerprint", { length: 64 }),
  /** Consent level: "all" | "essential" | "rejected" */
  level: mysqlEnum("level", ["all", "essential", "rejected"]).notNull(),
  /** Individual consent flags */
  analytics: boolean("analytics").default(false).notNull(),
  marketing: boolean("marketing").default(false).notNull(),
  essential: boolean("essential").default(true).notNull(),
  /** Request metadata */
  userAgent: text("userAgent"),
  ipHash: varchar("ipHash", { length: 64 }),
  /** Consent source: "banner" | "settings" | "withdraw" */
  source: mysqlEnum("source", ["banner", "settings", "withdraw"]).default("banner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = typeof consentLogs.$inferInsert;

// ─── IOT DEVICES ─────────────────────────────────────────────────────────────
export const iotDevices = mysqlTable("iot_devices", {
  id: int("id").autoincrement().primaryKey(),
  /** Auto-generated device identifier (DEV-XXXXXXXX) */
  deviceId: varchar("deviceId", { length: 32 }).notNull().unique(),
  /** Human-readable name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Device type */
  deviceType: mysqlEnum("deviceType", ["gateway", "bms", "sensor", "edge_node"]).default("gateway").notNull(),
  /** Associated battery BPAN (nullable — can be unassociated) */
  bpan: varchar("bpan", { length: 32 }),
  /** MQTT credentials */
  mqttTopic: varchar("mqttTopic", { length: 256 }).notNull(),
  mqttUsername: varchar("mqttUsername", { length: 128 }).notNull(),
  mqttPassword: varchar("mqttPassword", { length: 256 }).notNull(),
  /** Device status */
  status: mysqlEnum("status", ["active", "inactive", "pending", "revoked"]).default("pending").notNull(),
  /** Last seen timestamp — updated on every MQTT message */
  lastSeen: timestamp("lastSeen"),
  /** Firmware & hardware info */
  firmwareVersion: varchar("firmwareVersion", { length: 64 }),
  hardwareModel: varchar("hardwareModel", { length: 128 }),
  /** Physical location description */
  location: varchar("location", { length: 512 }),
  /** Free-form notes */
  notes: text("notes"),
  /** Who registered this device */
  registeredBy: int("registeredBy"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IotDevice = typeof iotDevices.$inferSelect;
export type InsertIotDevice = typeof iotDevices.$inferInsert;


// ─── LISTING PHOTOS ───────────────────────────────────────────────────────────
export const listingPhotos = mysqlTable("listing_photos", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  /** S3 URL of the photo */
  url: text("url").notNull(),
  /** S3 key for deletion */
  fileKey: varchar("fileKey", { length: 512 }),
  /** Caption / alt text */
  caption: varchar("caption", { length: 256 }),
  /** Display order (0 = primary photo) */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** File size in bytes */
  fileSizeBytes: int("fileSizeBytes"),
  /** MIME type */
  mimeType: varchar("mimeType", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type InsertListingPhoto = typeof listingPhotos.$inferInsert;

// ─── PASSWORD RESET TOKENS ────────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  /** The user this token belongs to */
  userId: int("userId").notNull(),
  /** Cryptographically random 64-hex-char token */
  token: varchar("token", { length: 128 }).notNull().unique(),
  /** When the token expires (15 minutes from creation) */
  expiresAt: timestamp("expiresAt").notNull(),
  /** When the token was consumed (null = still valid) */
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── MARKETPLACE OFFERS ───────────────────────────────────────────────────────
export const marketplaceOffers = mysqlTable("marketplace_offers", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  buyerId: int("buyerId").notNull(),
  /** Offer amount in the specified currency */
  offerAmount: decimal("offerAmount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  /** Optional message from buyer to seller */
  message: text("message"),
  /** pending | accepted | rejected | withdrawn | expired */
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "withdrawn", "expired"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketplaceOffer = typeof marketplaceOffers.$inferSelect;
export type InsertMarketplaceOffer = typeof marketplaceOffers.$inferInsert;

// ─── ALERT RULES ─────────────────────────────────────────────────────────────
// Per-battery or per-chemistry configurable alert thresholds.
// When bpan is set, the rule applies only to that specific battery.
// When chemistry is set (and bpan is null), the rule applies to all batteries of that chemistry.
// When both are null, the rule is a platform-wide default.
export const alertRules = mysqlTable("alert_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** The telemetry metric this rule evaluates */
  metric: mysqlEnum("metric", [
    "temperature",
    "voltage",
    "current",
    "soc",
    "soh",
    "cycleCount",
    "internalResistance",
  ]).notNull(),
  /** Comparison operator */
  operator: mysqlEnum("operator", ["gt", "lt", "gte", "lte", "eq"]).notNull(),
  /** Threshold value for the metric */
  threshold: decimal("threshold", { precision: 12, scale: 4 }).notNull(),
  /** Alert severity level */
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning").notNull(),
  /** Optional: scope to a specific battery BPAN (null = applies to chemistry or all) */
  bpan: varchar("bpan", { length: 21 }),
  /** Optional: scope to a specific chemistry (null = applies to all chemistries) */
  chemistry: mysqlEnum("chemistry", ["LFP", "NMC", "NCA", "LCO", "LMO", "LEAD_ACID"]),
  /** Whether this rule is active */
  enabled: boolean("enabled").default(true).notNull(),
  /** User who created this rule */
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

// ─── STRIPE PAYMENT INTENTS ───────────────────────────────────────────────────
// Minimal Stripe identifier store — only IDs and business-critical metadata.
// All amounts, status, and card details are fetched from Stripe API on demand.
export const stripePaymentIntents = mysqlTable("stripe_payment_intents", {
  id: int("id").autoincrement().primaryKey(),
  /** Stripe PaymentIntent ID (pi_xxxx) */
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 64 }).notNull().unique(),
  /** Stripe Checkout Session ID (cs_xxxx) */
  stripeSessionId: varchar("stripe_session_id", { length: 128 }),
  /** The marketplace offer this payment settles */
  offerId: int("offer_id").notNull(),
  /** The marketplace listing being purchased */
  listingId: int("listing_id").notNull(),
  /** Buyer user ID */
  buyerId: int("buyer_id").notNull(),
  /** Seller user ID */
  sellerId: int("seller_id").notNull(),
  /** Payment status: pending | succeeded | failed | cancelled */
  status: mysqlEnum("payment_status", ["pending", "succeeded", "failed", "cancelled"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StripePaymentIntent = typeof stripePaymentIntents.$inferSelect;
export type InsertStripePaymentIntent = typeof stripePaymentIntents.$inferInsert;
