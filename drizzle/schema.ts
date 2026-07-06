import {
  serial,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  json,
  real,
  bigint,
} from "drizzle-orm/pg-core";

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").default("user").notNull(),
  // Platform-specific role
  platformRole: text("platformRole").default("oem").notNull(),
  organization: varchar("organization", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── ROLE AUDIT LOG ───────────────────────────────────────────────────────────
export const roleAuditLog = pgTable("roleAuditLog", {
  id: serial("id").primaryKey(),
  targetUserId: integer("targetUserId").notNull(),
  targetUserName: text("targetUserName"),
  targetUserEmail: varchar("targetUserEmail", { length: 320 }),
  changedByUserId: integer("changedByUserId").notNull(),
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
export const batteries = pgTable("batteries", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull().unique(),
  // Segment 1: BMI (Battery Manufacturer Identifier)
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  manufacturerId: varchar("manufacturerId", { length: 3 }).notNull(),
  // Segment 2: BDS (Battery Descriptor Section)
  capacityCode: varchar("capacityCode", { length: 2 }).notNull(),
  capacityKwh: numeric("capacityKwh", { precision: 8, scale: 2 }).notNull(),
  chemistryCode: varchar("chemistryCode", { length: 1 }).notNull(),
  chemistry: text("chemistry").notNull(),
  voltageCode: varchar("voltageCode", { length: 2 }).notNull(),
  voltageV: numeric("voltageV", { precision: 8, scale: 1 }).notNull(),
  cellOriginCode: varchar("cellOriginCode", { length: 2 }).notNull(),
  cellOriginCountry: varchar("cellOriginCountry", { length: 100 }).notNull(),
  extinguisherClass: varchar("extinguisherClass", { length: 1 }).notNull(),
  // Segment 3: BI (Battery Identifier)
  mfgYear: integer("mfgYear").notNull(),
  mfgMonth: integer("mfgMonth").notNull(),
  mfgDay: integer("mfgDay").notNull(),
  factoryCode: varchar("factoryCode", { length: 1 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 4 }).notNull(),
  // Material Composition Section (BMCS)
  recyclabilityPct: numeric("recyclabilityPct", { precision: 5, scale: 2 }),
  lithiumPct: numeric("lithiumPct", { precision: 5, scale: 2 }),
  cobaltPct: numeric("cobaltPct", { precision: 5, scale: 2 }),
  nickelPct: numeric("nickelPct", { precision: 5, scale: 2 }),
  manganesePct: numeric("manganesePct", { precision: 5, scale: 2 }),
  carbonFootprintKgCo2: numeric("carbonFootprintKgCo2", { precision: 10, scale: 2 }),
  // Dynamic Data
  status: text("status").default("operational").notNull(),
  currentSoh: numeric("currentSoh", { precision: 5, scale: 2 }),
  cycleCount: integer("cycleCount").default(0),
  lastServiceDate: timestamp("lastServiceDate"),
  disassemblyMethod: varchar("disassemblyMethod", { length: 255 }),
  // Ownership
  registeredById: integer("registeredById"),
  ownerId: integer("ownerId"),
  vehicleId: varchar("vehicleId", { length: 100 }),
  qrCodeUrl: text("qrCodeUrl"),
  healthPassportUrl: text("healthPassportUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Battery = typeof batteries.$inferSelect;
export type InsertBattery = typeof batteries.$inferInsert;

// ─── TELEMETRY ────────────────────────────────────────────────────────────────
export const telemetry = pgTable("telemetry", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  // Level 1: High-frequency raw sensor data
  vPack: numeric("vPack", { precision: 8, scale: 2 }),       // Pack voltage (V)
  iPack: numeric("iPack", { precision: 8, scale: 2 }),       // Pack current (A)
  vMin: numeric("vMin", { precision: 7, scale: 3 }),         // Min cell voltage (V)
  vMax: numeric("vMax", { precision: 7, scale: 3 }),         // Max cell voltage (V)
  tPack: numeric("tPack", { precision: 6, scale: 2 }),       // Pack temperature (°C)
  tMax: numeric("tMax", { precision: 6, scale: 2 }),         // Max cell temperature (°C)
  // Level 2: Aggregated data
  cycleCount: integer("cycleCount"),
  irPack: numeric("irPack", { precision: 8, scale: 3 }),     // Internal resistance (mΩ)
  sohEstimate: numeric("sohEstimate", { precision: 5, scale: 2 }), // BMS SOH estimate (%)
  dtcCodes: json("dtcCodes"),                                // Diagnostic trouble codes
  // Anomaly flags
  thermalAnomaly: boolean("thermalAnomaly").default(false),
  anomalyType: varchar("anomalyType", { length: 100 }),
  // Source
  source: text("source").default("simulated"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type Telemetry = typeof telemetry.$inferSelect;
export type InsertTelemetry = typeof telemetry.$inferInsert;

// ─── SOH PREDICTIONS ─────────────────────────────────────────────────────────
export const sohPredictions = pgTable("soh_predictions", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  predictedSoh: numeric("predictedSoh", { precision: 5, scale: 2 }).notNull(),
  rulCycles: integer("rulCycles"),                               // Remaining useful life (cycles)
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  rmse: numeric("rmse", { precision: 6, scale: 4 }),
  triagePath: text("triagePath"),
  triageReason: text("triageReason"),
  maintenanceRecommendations: json("maintenanceRecommendations"),
  modelVersion: varchar("modelVersion", { length: 20 }).default("v3.2.1"),
  predictedAt: timestamp("predictedAt").defaultNow().notNull(),
});

export type SohPrediction = typeof sohPredictions.$inferSelect;

// ─── MARKETPLACE LISTINGS ─────────────────────────────────────────────────────
export const marketplaceListings = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  sellerId: integer("sellerId").notNull(),
  listingType: text("listingType").notNull(),
  askingPriceInr: numeric("askingPriceInr", { precision: 12, scale: 2 }),
  spotPriceInr: numeric("spotPriceInr", { precision: 12, scale: 2 }),
  sohAtListing: numeric("sohAtListing", { precision: 5, scale: 2 }),
  rulAtListing: integer("rulAtListing"),
  capacityKwh: numeric("capacityKwh", { precision: 8, scale: 2 }),
  chemistry: varchar("chemistry", { length: 20 }),
  healthPassportUrl: text("healthPassportUrl"),
  description: text("description"),
  conditionGrade: varchar("condition_grade", { length: 20 }),
  conditionNotes: text("condition_notes"),
  location: varchar("location", { length: 256 }),
  photoCount: integer("photoCount").default(0),
  primaryPhotoUrl: text("primaryPhotoUrl"),
  status: text("status").default("active").notNull(),
  buyerId: integer("buyerId"),
  transactionDate: timestamp("transactionDate"),
  finalPriceInr: numeric("finalPriceInr", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

// ─── LOGISTICS SHIPMENTS ──────────────────────────────────────────────────────
export const logistics = pgTable("logistics", {
  id: serial("id").primaryKey(),
  shipmentId: varchar("shipmentId", { length: 20 }).notNull().unique(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  requestedById: integer("requestedById").notNull(),
  pickupAddress: text("pickupAddress").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  pickupLat: numeric("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: numeric("pickupLng", { precision: 10, scale: 7 }),
  deliveryLat: numeric("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: numeric("deliveryLng", { precision: 10, scale: 7 }),
  currentLat: numeric("currentLat", { precision: 10, scale: 7 }),
  currentLng: numeric("currentLng", { precision: 10, scale: 7 }),
  logisticsPartner: varchar("logisticsPartner", { length: 255 }),
  driverName: varchar("driverName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 20 }),
  hazmatManifestUrl: text("hazmatManifestUrl"),
  slaTier: text("slaTier").default("48h"),
  status: text("status").default("pending").notNull(),
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
export const eprTokens = pgTable("epr_tokens", {
  id: serial("id").primaryKey(),
  tokenId: varchar("tokenId", { length: 64 }).notNull().unique(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  recyclerId: integer("recyclerId").notNull(),
  producerId: integer("producerId"),
  actualYieldKg: numeric("actualYieldKg", { precision: 10, scale: 3 }).notNull(),
  theoreticalYieldKg: numeric("theoreticalYieldKg", { precision: 10, scale: 3 }).notNull(),
  yieldRatio: numeric("yieldRatio", { precision: 5, scale: 4 }).notNull(),
  blackMassKg: numeric("blackMassKg", { precision: 10, scale: 3 }),
  lithiumRecoveredKg: numeric("lithiumRecoveredKg", { precision: 10, scale: 3 }),
  cobaltRecoveredKg: numeric("cobaltRecoveredKg", { precision: 10, scale: 3 }),
  nickelRecoveredKg: numeric("nickelRecoveredKg", { precision: 10, scale: 3 }),
  status: text("status").default("pending").notNull(),
  blockchainTxHash: varchar("blockchainTxHash", { length: 128 }),
  blockchainBlock: integer("blockchainBlock"),
  cpcbFormUrl: text("cpcbFormUrl"),
  pliPassportUrl: text("pliPassportUrl"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EprToken = typeof eprTokens.$inferSelect;
export type InsertEprToken = typeof eprTokens.$inferInsert;

// ─── YIELD VERIFICATION ───────────────────────────────────────────────────────
export const yieldVerifications = pgTable("yield_verifications", {
  id: serial("id").primaryKey(),
  batchId: varchar("batchId", { length: 32 }).notNull().unique(),
  recyclerId: integer("recyclerId").notNull(),
  bpanList: json("bpanList").notNull(),                      // Array of BPANs in batch
  totalBatteriesCount: integer("totalBatteriesCount").notNull(),
  totalTheoreticalYieldKg: numeric("totalTheoreticalYieldKg", { precision: 12, scale: 3 }).notNull(),
  totalActualYieldKg: numeric("totalActualYieldKg", { precision: 12, scale: 3 }),
  blackMassYieldKg: numeric("blackMassYieldKg", { precision: 12, scale: 3 }),
  lithiumYieldKg: numeric("lithiumYieldKg", { precision: 12, scale: 3 }),
  cobaltYieldKg: numeric("cobaltYieldKg", { precision: 12, scale: 3 }),
  nickelYieldKg: numeric("nickelYieldKg", { precision: 12, scale: 3 }),
  processingMethod: varchar("processingMethod", { length: 100 }),
  scadaDataUrl: text("scadaDataUrl"),
  status: text("status").default("pending").notNull(),
  eprTokenId: integer("eprTokenId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type YieldVerification = typeof yieldVerifications.$inferSelect;

// ─── ALERTS ───────────────────────────────────────────────────────────────────
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  bpan: varchar("bpan", { length: 21 }),
  batteryId: integer("batteryId"),
  type: text("type").notNull(),
  severity: text("severity").default("info").notNull(),
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
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: text("type").notNull(),
  bpan: varchar("bpan", { length: 21 }),
  batteryId: integer("batteryId"),
  uploadedById: integer("uploadedById").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  fileSizeBytes: integer("fileSizeBytes"),
  mimeType: varchar("mimeType", { length: 100 }),
  accessLevel: text("accessLevel").default("organization").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── SERVICE HISTORY ──────────────────────────────────────────────────────────
export const serviceHistory = pgTable("service_history", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  serviceProviderId: integer("serviceProviderId").notNull(),
  serviceType: text("serviceType").notNull(),
  sohBefore: numeric("sohBefore", { precision: 5, scale: 2 }),
  sohAfter: numeric("sohAfter", { precision: 5, scale: 2 }),
  cycleCountAtService: integer("cycleCountAtService"),
  notes: text("notes"),
  technicianName: varchar("technicianName", { length: 255 }),
  location: varchar("location", { length: 255 }),
  servicedAt: timestamp("servicedAt").defaultNow().notNull(),
  nextServiceDue: timestamp("nextServiceDue"),
});

export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = typeof serviceHistory.$inferInsert;

// ─── AI CHAT SESSIONS ─────────────────────────────────────────────────────────
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ─── REGULATORY PROFILES ──────────────────────────────────────────────────────
// Stores jurisdiction-specific compliance data for each battery.
// One battery can have multiple profiles (one per target market).
export const regulatoryProfiles = pgTable("regulatory_profiles", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  jurisdiction: varchar("jurisdiction", { length: 10 }).notNull(),
  localId: varchar("localId", { length: 128 }),
  status: text("status").default("pending").notNull(),
  profileData: json("profileData").notNull(),
  govSyncStatus: text("govSyncStatus").default("not_required").notNull(),
  lastGovSyncAt: timestamp("lastGovSyncAt"),
  lastCheckedAt: timestamp("lastCheckedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type RegulatoryProfile = typeof regulatoryProfiles.$inferSelect;
export type InsertRegulatoryProfile = typeof regulatoryProfiles.$inferInsert;

// ─── CARBON FOOTPRINT DECLARATIONS ───────────────────────────────────────────
export const carbonFootprintDeclarations = pgTable("carbon_footprint_declarations", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  totalKgCo2e: numeric("totalKgCo2e", { precision: 10, scale: 3 }).notNull(),
  rawMaterialKgCo2e: numeric("rawMaterialKgCo2e", { precision: 10, scale: 3 }),
  productionKgCo2e: numeric("productionKgCo2e", { precision: 10, scale: 3 }),
  distributionKgCo2e: numeric("distributionKgCo2e", { precision: 10, scale: 3 }),
  endOfLifeKgCo2e: numeric("endOfLifeKgCo2e", { precision: 10, scale: 3 }),
  performanceClass: text("performanceClass"),
  methodology: text("methodology").default("GHG_PROTOCOL").notNull(),
  certifyingBody: varchar("certifyingBody", { length: 255 }),
  declaredById: integer("declaredById").notNull(),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarbonFootprintDeclaration = typeof carbonFootprintDeclarations.$inferSelect;
export type InsertCarbonFootprintDeclaration = typeof carbonFootprintDeclarations.$inferInsert;

// ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  locale: varchar("locale", { length: 20 }).default("en-IN").notNull(),
  displayCurrency: varchar("displayCurrency", { length: 10 }).default("INR").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Asia/Kolkata").notNull(),
  activeJurisdictions: json("activeJurisdictions").$type<string[]>().notNull(),
  dataResidencyRegion: text("dataResidencyRegion").default("in").notNull(),
  organisationName: varchar("organisationName", { length: 255 }),
  organisationCountry: varchar("organisationCountry", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;

// ─── MARKETPLACE LISTINGS CURRENCY EXTENSION ─────────────────────────────────
export const marketplaceListingsCurrency = pgTable("marketplace_listings_currency", {
  id: serial("id").primaryKey(),
  listingId: integer("listingId").notNull().unique(),
  priceUsd: numeric("priceUsd", { precision: 14, scale: 4 }),
  listingCurrency: varchar("listingCurrency", { length: 10 }).default("INR").notNull(),
  listingCurrencyAmount: numeric("listingCurrencyAmount", { precision: 14, scale: 4 }),
  exchangeRateAtListing: numeric("exchangeRateAtListing", { precision: 14, scale: 6 }),
  targetMarkets: json("targetMarkets").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type MarketplaceListingCurrency = typeof marketplaceListingsCurrency.$inferSelect;
export type InsertMarketplaceListingCurrency = typeof marketplaceListingsCurrency.$inferInsert;

// ─── RECYCLED CONTENT DECLARATIONS ────────────────────────────────────────────
export const recycledContentDeclarations = pgTable("recycled_content_declarations", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  batteryId: integer("batteryId").notNull(),
  cobaltPct: numeric("cobaltPct", { precision: 5, scale: 2 }),
  lithiumPct: numeric("lithiumPct", { precision: 5, scale: 2 }),
  nickelPct: numeric("nickelPct", { precision: 5, scale: 2 }),
  leadPct: numeric("leadPct", { precision: 5, scale: 2 }),
  totalRecycledPct: numeric("totalRecycledPct", { precision: 5, scale: 2 }),
  verificationMethod: text("verificationMethod").default("SELF_DECLARED").notNull(),
  certifyingBody: varchar("certifyingBody", { length: 255 }),
  certificateRef: varchar("certificateRef", { length: 255 }),
  notes: text("notes"),
  declaredById: integer("declaredById").notNull(),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecycledContentDeclaration = typeof recycledContentDeclarations.$inferSelect;
export type InsertRecycledContentDeclaration = typeof recycledContentDeclarations.$inferInsert;

// ─── AGENT ACTIONS LOG ──────────────────────────────────────────────────────
// Tracks every action performed by human users or AI agents on the platform.
// Enables full audit trail, super admin oversight, and agentic workflow replay.
export const agentActions = pgTable("agent_actions", {
  id: serial("id").primaryKey(),
  /** Who performed the action — user ID (null for system/cron) */
  actorId: integer("actorId"),
  /** Actor display name for quick lookups */
  actorName: varchar("actorName", { length: 255 }),
  /** Whether the actor is a human user or an AI agent */
  actorType: text("actorType").default("human").notNull(),
  /** The tRPC procedure or action identifier (e.g. "bpan.generate", "marketplace.create") */
  action: varchar("action", { length: 255 }).notNull(),
  /** Human-readable description of what happened */
  description: text("description"),
  /** The module/domain this action belongs to */
  module: text("module").default("system").notNull(),
  /** Structured input parameters (JSON) */
  inputParams: json("inputParams"),
  /** Structured output / result summary (JSON) */
  outputResult: json("outputResult"),
  /** Outcome of the action */
  status: text("status").default("success").notNull(),
  /** Error message if status is failure */
  errorMessage: text("errorMessage"),
  /** Duration in milliseconds */
  durationMs: integer("durationMs"),
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
export const warrantyRecords = pgTable("warranty_records", {
  id: serial("id").primaryKey(),
  /** Link to batteries table */
  batteryId: integer("batteryId").notNull(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  /** Manufacturer serial number (original, pre-BPAN) */
  serialNumber: varchar("serialNumber", { length: 100 }),
  modelNumber: varchar("modelNumber", { length: 100 }),
  /** Warranty terms */
  warrantyType: text("warrantyType").default("standard").notNull(),
  coverageType: text("coverageType").default("full_replacement").notNull(),
  warrantyTermMonths: integer("warrantyTermMonths").notNull(),
  /** Key dates */
  purchaseDate: timestamp("purchaseDate").notNull(),
  warrantyStartDate: timestamp("warrantyStartDate").notNull(),
  warrantyEndDate: timestamp("warrantyEndDate").notNull(),
  /** Warranty status — computed from dates + manual overrides */
  status: text("status").default("pending_activation").notNull(),
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
  purchaseAmount: numeric("purchaseAmount", { precision: 12, scale: 2 }),
  purchaseCurrency: varchar("purchaseCurrency", { length: 10 }).default("INR"),
  /** Manufacturer info */
  manufacturer: varchar("manufacturer", { length: 255 }),
  /** Claim tracking */
  totalClaims: integer("totalClaims").default(0),
  lastClaimDate: timestamp("lastClaimDate"),
  /** Notes and metadata */
  notes: text("notes"),
  metadata: json("metadata"),
  /** Registration tracking */
  registeredById: integer("registeredById").notNull(),
  activatedAt: timestamp("activatedAt"),
  voidedAt: timestamp("voidedAt"),
  voidReason: text("voidReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type WarrantyRecord = typeof warrantyRecords.$inferSelect;
export type InsertWarrantyRecord = typeof warrantyRecords.$inferInsert;

// ─── WARRANTY CLAIMS ─────────────────────────────────────────────────────────
// Individual warranty claim records with full resolution workflow.
export const warrantyClaims = pgTable("warranty_claims", {
  id: serial("id").primaryKey(),
  warrantyId: integer("warrantyId").notNull(),
  batteryId: integer("batteryId").notNull(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  /** Claim details */
  claimType: text("claimType").notNull(),
  description: text("description").notNull(),
  /** Evidence */
  evidenceUrls: json("evidenceUrls").$type<string[]>(),
  sohAtClaim: numeric("sohAtClaim", { precision: 5, scale: 2 }),
  cycleCountAtClaim: integer("cycleCountAtClaim"),
  /** Resolution workflow */
  status: text("status").default("submitted").notNull(),
  assignedTo: varchar("assignedTo", { length: 255 }),
  resolutionType: text("resolutionType").default("pending"),
  resolutionNotes: text("resolutionNotes"),
  resolutionDate: timestamp("resolutionDate"),
  /** Tracking */
  claimedById: integer("claimedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
export type InsertWarrantyClaim = typeof warrantyClaims.$inferInsert;

// ─── BULK ONBOARDING JOBS ────────────────────────────────────────────────────
// Tracks batch imports of existing batteries with auto-BPAN generation.
export const bulkOnboardingJobs = pgTable("bulk_onboarding_jobs", {
  id: serial("id").primaryKey(),
  /** Job metadata */
  jobName: varchar("jobName", { length: 255 }).notNull(),
  source: text("source").default("csv_import").notNull(),
  /** Counts */
  totalRecords: integer("totalRecords").notNull(),
  processedRecords: integer("processedRecords").default(0),
  successCount: integer("successCount").default(0),
  failureCount: integer("failureCount").default(0),
  skippedCount: integer("skippedCount").default(0),
  /** Status */
  status: text("status").default("pending").notNull(),
  /** Results */
  errorLog: json("errorLog").$type<{ row: number; error: string }[]>(),
  generatedBpans: json("generatedBpans").$type<string[]>(),
  /** Options */
  autoGenerateBpan: boolean("autoGenerateBpan").default(true),
  registerWarranty: boolean("registerWarranty").default(false),
  defaultWarrantyMonths: integer("defaultWarrantyMonths"),
  /** Tracking */
  createdById: integer("createdById").notNull(),
  csvFileUrl: text("csvFileUrl"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type BulkOnboardingJob = typeof bulkOnboardingJobs.$inferSelect;
export type InsertBulkOnboardingJob = typeof bulkOnboardingJobs.$inferInsert;

// ─── AUDIT LOGS (ISO 27001 / SOC 2) ────────────────────────────────────────
// Comprehensive audit trail for all platform operations.
// Captures who, what, when, where, and outcome for every significant action.
// Supports ISO 27001 A.12.4 (Logging and monitoring) and SOC 2 CC7.2 (System monitoring).
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  /** Trace ID for correlating related operations */
  traceId: varchar("traceId", { length: 64 }).notNull(),
  /** Who performed the action */
  userId: integer("userId"),
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 64 }),
  /** Actor type: human, agent, system, api_key */
  actorType: text("actorType").default("human").notNull(),
  /** API key ID if actor is api_key */
  apiKeyId: integer("apiKeyId"),
  /** What happened */
  action: varchar("action", { length: 255 }).notNull(),
  /** ISO 27001 data classification */
  dataClassification: text("dataClassification").default("internal").notNull(),
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
  status: text("status").default("success").notNull(),
  errorCode: varchar("errorCode", { length: 64 }),
  errorMessage: text("errorMessage"),
  /** Performance */
  durationMs: integer("durationMs"),
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
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  /** Event classification */
  eventType: text("eventType").notNull(),
  /** Severity for SIEM integration */
  severity: text("severity").default("info").notNull(),
  /** Who */
  userId: integer("userId"),
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
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  /** Key metadata */
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** The hashed key (SHA-256) — never store plaintext */
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
  /** Key prefix for identification (first 8 chars) */
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  /** Owner */
  userId: integer("userId").notNull(),
  /** Scopes: which modules/actions this key can access */
  scopes: json("scopes").$type<string[]>().notNull(),
  /** Rate limiting */
  rateLimitTier: text("rateLimitTier").default("standard").notNull(),
  rateLimit: integer("rateLimit").default(100), // requests per minute
  /** Status */
  status: text("status").default("active").notNull(),
  /** Usage tracking */
  lastUsedAt: timestamp("lastUsedAt"),
  totalRequests: bigint("totalRequests", { mode: "number" }).default(0),
  /** Expiry */
  expiresAt: timestamp("expiresAt"),
  /** Audit */
  revokedAt: timestamp("revokedAt"),
  revokedReason: text("revokedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── API USAGE LOGS ─────────────────────────────────────────────────────────
// Per-request usage tracking for API keys.
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  endpoint: varchar("endpoint", { length: 512 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("statusCode"),
  durationMs: integer("durationMs"),
  requestSize: integer("requestSize"),
  responseSize: integer("responseSize"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  traceId: varchar("traceId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = typeof apiUsageLogs.$inferInsert;

// ─── WEBHOOKS ───────────────────────────────────────────────────────────────
// Webhook subscriptions for event-driven microservices integration.
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  /** Owner */
  userId: integer("userId").notNull(),
  /** Webhook configuration */
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  /** Secret for HMAC signature verification */
  secret: varchar("secret", { length: 128 }).notNull(),
  /** Events to subscribe to */
  events: json("events").$type<string[]>().notNull(),
  /** Status */
  status: text("status").default("active").notNull(),
  /** Retry config */
  maxRetries: integer("maxRetries").default(3),
  /** Stats */
  totalDeliveries: integer("totalDeliveries").default(0),
  totalFailures: integer("totalFailures").default(0),
  lastDeliveryAt: timestamp("lastDeliveryAt"),
  lastFailureAt: timestamp("lastFailureAt"),
  lastFailureReason: text("lastFailureReason"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;


// ─── WIKI FEEDBACK ───────────────────────────────────────────────────────────
export const wikiFeedback = pgTable("wiki_feedback", {
  id: serial("id").primaryKey(),
  /** Article this feedback is about */
  articleId: varchar("articleId", { length: 128 }).notNull(),
  articleTitle: varchar("articleTitle", { length: 256 }).notNull(),
  /** Feedback type */
  type: text("feedbackType").notNull(),
  /** User-provided details */
  content: text("content"),
  /** Suggested replacement text (for suggest_edit) */
  suggestedContent: text("suggestedContent"),
  /** Section of the article (optional) */
  section: varchar("section", { length: 256 }),
  /** Helpfulness rating 1-5 */
  rating: integer("rating"),
  /** Review status */
  status: text("reviewStatus").default("pending").notNull(),
  /** Admin review notes */
  reviewNotes: text("reviewNotes"),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  /** Submitter info */
  userId: integer("userId"),
  userName: varchar("userName", { length: 256 }),
  userEmail: varchar("userEmail", { length: 320 }),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type WikiFeedback = typeof wikiFeedback.$inferSelect;
export type InsertWikiFeedback = typeof wikiFeedback.$inferInsert;

// ─── TUTORIAL PROGRESS ───────────────────────────────────────────────────────
export const tutorialProgress = pgTable("tutorial_progress", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  /** Step key (e.g., "register_battery", "check_warranty") */
  stepKey: varchar("stepKey", { length: 128 }).notNull(),
  /** Whether this step has been completed */
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type TutorialProgress = typeof tutorialProgress.$inferSelect;
export type InsertTutorialProgress = typeof tutorialProgress.$inferInsert;

// ─── CONSENT LOGS (GDPR Article 7 accountability) ────────────────────────────
export const consentLogs = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  /** Null for anonymous/pre-login users */
  userId: integer("userId"),
  /** Browser fingerprint (hashed IP + user agent) for anonymous tracking */
  fingerprint: varchar("fingerprint", { length: 64 }),
  /** Consent level: "all" | "essential" | "rejected" */
  level: text("level").notNull(),
  /** Individual consent flags */
  analytics: boolean("analytics").default(false).notNull(),
  marketing: boolean("marketing").default(false).notNull(),
  essential: boolean("essential").default(true).notNull(),
  /** Request metadata */
  userAgent: text("userAgent"),
  ipHash: varchar("ipHash", { length: 64 }),
  /** Consent source: "banner" | "settings" | "withdraw" */
  source: text("source").default("banner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = typeof consentLogs.$inferInsert;

// ─── IOT DEVICES ─────────────────────────────────────────────────────────────
export const iotDevices = pgTable("iot_devices", {
  id: serial("id").primaryKey(),
  /** Auto-generated device identifier (DEV-XXXXXXXX) */
  deviceId: varchar("deviceId", { length: 32 }).notNull().unique(),
  /** Human-readable name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Device type */
  deviceType: text("deviceType").default("gateway").notNull(),
  /** Associated battery BPAN (nullable — can be unassociated) */
  bpan: varchar("bpan", { length: 32 }),
  /** MQTT credentials */
  mqttTopic: varchar("mqttTopic", { length: 256 }).notNull(),
  mqttUsername: varchar("mqttUsername", { length: 128 }).notNull(),
  mqttPassword: varchar("mqttPassword", { length: 256 }).notNull(),
  /** Device status */
  status: text("status").default("pending").notNull(),
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
  registeredBy: integer("registeredBy"),
  /** Timestamps */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type IotDevice = typeof iotDevices.$inferSelect;
export type InsertIotDevice = typeof iotDevices.$inferInsert;


// ─── LISTING PHOTOS ───────────────────────────────────────────────────────────
export const listingPhotos = pgTable("listing_photos", {
  id: serial("id").primaryKey(),
  listingId: integer("listingId").notNull(),
  /** S3 URL of the photo */
  url: text("url").notNull(),
  /** S3 key for deletion */
  fileKey: varchar("fileKey", { length: 512 }),
  /** Caption / alt text */
  caption: varchar("caption", { length: 256 }),
  /** Display order (0 = primary photo) */
  sortOrder: integer("sortOrder").default(0).notNull(),
  /** File size in bytes */
  fileSizeBytes: integer("fileSizeBytes"),
  /** MIME type */
  mimeType: varchar("mimeType", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type InsertListingPhoto = typeof listingPhotos.$inferInsert;

// ─── PASSWORD RESET TOKENS ────────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  /** The user this token belongs to */
  userId: integer("userId").notNull(),
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
export const marketplaceOffers = pgTable("marketplace_offers", {
  id: serial("id").primaryKey(),
  listingId: integer("listingId").notNull(),
  buyerId: integer("buyerId").notNull(),
  /** Offer amount in the specified currency */
  offerAmount: numeric("offerAmount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  /** Optional message from buyer to seller */
  message: text("message"),
  /** pending | accepted | rejected | withdrawn | expired */
  status: text("status")
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type MarketplaceOffer = typeof marketplaceOffers.$inferSelect;
export type InsertMarketplaceOffer = typeof marketplaceOffers.$inferInsert;

// ─── ALERT RULES ─────────────────────────────────────────────────────────────
// Per-battery or per-chemistry configurable alert thresholds.
// When bpan is set, the rule applies only to that specific battery.
// When chemistry is set (and bpan is null), the rule applies to all batteries of that chemistry.
// When both are null, the rule is a platform-wide default.
export const alertRules = pgTable("alert_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** The telemetry metric this rule evaluates */
  metric: text("metric").notNull(),
  /** Comparison operator */
  operator: text("operator").notNull(),
  /** Threshold value for the metric */
  threshold: numeric("threshold", { precision: 12, scale: 4 }).notNull(),
  /** Alert severity level */
  severity: text("severity").default("warning").notNull(),
  /** Optional: scope to a specific battery BPAN (null = applies to chemistry or all) */
  bpan: varchar("bpan", { length: 21 }),
  /** Optional: scope to a specific chemistry (null = applies to all chemistries) */
  chemistry: text("chemistry"),
  /** Whether this rule is active */
  enabled: boolean("enabled").default(true).notNull(),
  /** User who created this rule */
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

// ─── STRIPE PAYMENT INTENTS ───────────────────────────────────────────────────
// Minimal Stripe identifier store — only IDs and business-critical metadata.
// All amounts, status, and card details are fetched from Stripe API on demand.
export const stripePaymentIntents = pgTable("stripe_payment_intents", {
  id: serial("id").primaryKey(),
  /** Stripe PaymentIntent ID (pi_xxxx) */
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 64 }).notNull().unique(),
  /** Stripe Checkout Session ID (cs_xxxx) */
  stripeSessionId: varchar("stripe_session_id", { length: 128 }),
  /** The marketplace offer this payment settles */
  offerId: integer("offer_id").notNull(),
  /** The marketplace listing being purchased */
  listingId: integer("listing_id").notNull(),
  /** Buyer user ID */
  buyerId: integer("buyer_id").notNull(),
  /** Seller user ID */
  sellerId: integer("seller_id").notNull(),
  /** Payment status: pending | succeeded | failed | cancelled */
  status: text("payment_status")
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type StripePaymentIntent = typeof stripePaymentIntents.$inferSelect;
export type InsertStripePaymentIntent = typeof stripePaymentIntents.$inferInsert;

// ─── BATTERY DIGITAL TWINS ────────────────────────────────────────────────────
export const batteryTwins = pgTable("battery_twins", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull().unique(),
  simulatedSoh: numeric("simulated_soh", { precision: 5, scale: 2 }),
  forecastHorizonDays: integer("forecast_horizon_days").default(365).notNull(),
  forecastData: json("forecast_data"),
  modelVersion: varchar("model_version", { length: 32 }).default("physics-v1.0").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BatteryTwin = typeof batteryTwins.$inferSelect;
export type InsertBatteryTwin = typeof batteryTwins.$inferInsert;

// ─── CARBON FOOTPRINTS ────────────────────────────────────────────────────────
export const carbonFootprints = pgTable("carbon_footprints", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull().unique(),
  manufacturingKgCo2: numeric("manufacturing_kg_co2", { precision: 10, scale: 3 }),
  transportKgCo2: numeric("transport_kg_co2", { precision: 10, scale: 3 }),
  operationalKgCo2: numeric("operational_kg_co2", { precision: 10, scale: 3 }),
  eolKgCo2: numeric("eol_kg_co2", { precision: 10, scale: 3 }),
  totalKgCo2: numeric("total_kg_co2", { precision: 10, scale: 3 }),
  gridCarbonIntensity: numeric("grid_carbon_intensity", { precision: 8, scale: 2 }),
  gridRegion: varchar("grid_region", { length: 64 }),
  certUrl: varchar("cert_url", { length: 512 }),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarbonFootprint = typeof carbonFootprints.$inferSelect;
export type InsertCarbonFootprint = typeof carbonFootprints.$inferInsert;

// ─── MODEL VERSIONS (Federated Learning) ─────────────────────────────────────
export const modelVersions = pgTable("model_versions", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 32 }).notNull().unique(),
  rmse: numeric("rmse", { precision: 6, scale: 4 }),
  mae: numeric("mae", { precision: 6, scale: 4 }),
  r2: numeric("r2", { precision: 6, scale: 4 }),
  batteryCount: integer("battery_count").default(0).notNull(),
  federatedRounds: integer("federated_rounds").default(0).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  trainedAt: timestamp("trained_at").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ModelVersion = typeof modelVersions.$inferSelect;
export type InsertModelVersion = typeof modelVersions.$inferInsert;

// ─── BLOCKCHAIN ANCHORS ───────────────────────────────────────────────────────
export const blockchainAnchors = pgTable("blockchain_anchors", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }),
  eventType: text("event_type").notNull(),
  dataHash: varchar("data_hash", { length: 64 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
  blockNumber: integer("block_number"),
  network: varchar("network", { length: 32 }).default("polygon-mumbai").notNull(),
  payload: json("payload"),
  anchoredAt: timestamp("anchored_at").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BlockchainAnchor = typeof blockchainAnchors.$inferSelect;
export type InsertBlockchainAnchor = typeof blockchainAnchors.$inferInsert;

// ─── DATA SHARING AGREEMENTS ──────────────────────────────────────────────────
export const dataSharingAgreements = pgTable("data_sharing_agreements", {
  id: serial("id").primaryKey(),
  requestingUserId: integer("requesting_user_id").notNull(),
  owningUserId: integer("owning_user_id").notNull(),
  bpan: varchar("bpan", { length: 21 }),
  scope: varchar("scope", { length: 256 }).notNull(),
  status: text("dsa_status")
    .default("pending").notNull(),
  requestMessage: text("request_message"),
  responseMessage: text("response_message"),
  expiresAt: timestamp("expires_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type DataSharingAgreement = typeof dataSharingAgreements.$inferSelect;
export type InsertDataSharingAgreement = typeof dataSharingAgreements.$inferInsert;

// ─── TRIAGE JOBS (Autonomous Routing) ────────────────────────────────────────
export const triageJobs = pgTable("triage_jobs", {
  id: serial("id").primaryKey(),
  bpan: varchar("bpan", { length: 21 }).notNull(),
  recommendedPath: text("recommended_path").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  status: text("triage_status").default("pending_approval").notNull(),
  autoActionsLog: json("auto_actions_log"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdListingId: integer("created_listing_id"),
  createdLogisticsId: integer("created_logistics_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type TriageJob = typeof triageJobs.$inferSelect;
export type InsertTriageJob = typeof triageJobs.$inferInsert;

// ─── FORWARD ORDERS (Predictive Procurement) ─────────────────────────────────
export const forwardOrders = pgTable("forward_orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  targetSohMin: numeric("target_soh_min", { precision: 5, scale: 2 }).notNull(),
  targetSohMax: numeric("target_soh_max", { precision: 5, scale: 2 }).notNull(),
  chemistry: text("fo_chemistry"),
  minCapacityKwh: numeric("min_capacity_kwh", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1).notNull(),
  deliveryMonth: varchar("delivery_month", { length: 7 }).notNull(),
  maxPricePerKwh: numeric("max_price_per_kwh", { precision: 10, scale: 2 }),
  status: text("fo_status")
    .default("pending").notNull(),
  matchedListingIds: json("matched_listing_ids"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
export type ForwardOrder = typeof forwardOrders.$inferSelect;
export type InsertForwardOrder = typeof forwardOrders.$inferInsert;

// ─── SDK META (SDK Regeneration Pipeline) ────────────────────────────────────
// Stores the current download URLs and metadata for each generated SDK.
// Updated atomically whenever admin.regenerateSdk completes successfully.
export const sdkMeta = pgTable("sdk_meta", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  downloadUrl: text("download_url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  sizeKb: integer("size_kb").notNull(),
  specHash: varchar("spec_hash", { length: 64 }).notNull(),   // SHA-256 of the OpenAPI JSON
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: varchar("generated_by", { length: 255 }),      // user name or "auto"
  buildLog: text("build_log"),
});

export type SdkMeta = typeof sdkMeta.$inferSelect;
export type InsertSdkMeta = typeof sdkMeta.$inferInsert;
