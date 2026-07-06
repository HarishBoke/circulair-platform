CREATE TABLE "agent_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorId" integer,
	"actorName" varchar(255),
	"actorType" text DEFAULT 'human' NOT NULL,
	"action" varchar(255) NOT NULL,
	"description" text,
	"module" text DEFAULT 'system' NOT NULL,
	"inputParams" json,
	"outputResult" json,
	"status" text DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"durationMs" integer,
	"ipAddress" varchar(45),
	"targetEntity" varchar(255),
	"targetEntityType" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"metric" text NOT NULL,
	"operator" text NOT NULL,
	"threshold" numeric(12, 4) NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"bpan" varchar(21),
	"chemistry" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"bpan" varchar(21),
	"batteryId" integer,
	"type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" json,
	"read" boolean DEFAULT false NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"keyHash" varchar(64) NOT NULL,
	"keyPrefix" varchar(12) NOT NULL,
	"userId" integer NOT NULL,
	"scopes" json NOT NULL,
	"rateLimitTier" text DEFAULT 'standard' NOT NULL,
	"rateLimit" integer DEFAULT 100,
	"status" text DEFAULT 'active' NOT NULL,
	"lastUsedAt" timestamp,
	"totalRequests" bigint DEFAULT 0,
	"expiresAt" timestamp,
	"revokedAt" timestamp,
	"revokedReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"apiKeyId" integer NOT NULL,
	"endpoint" varchar(512) NOT NULL,
	"method" varchar(10) NOT NULL,
	"statusCode" integer,
	"durationMs" integer,
	"requestSize" integer,
	"responseSize" integer,
	"ipAddress" varchar(45),
	"traceId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"traceId" varchar(64) NOT NULL,
	"userId" integer,
	"userName" varchar(255),
	"userRole" varchar(64),
	"actorType" text DEFAULT 'human' NOT NULL,
	"apiKeyId" integer,
	"action" varchar(255) NOT NULL,
	"dataClassification" text DEFAULT 'internal' NOT NULL,
	"resourceType" varchar(64),
	"resourceId" varchar(255),
	"module" varchar(64),
	"httpMethod" varchar(10),
	"httpPath" varchar(512),
	"ipAddress" varchar(45),
	"userAgent" text,
	"inputSummary" json,
	"outputSummary" json,
	"status" text DEFAULT 'success' NOT NULL,
	"errorCode" varchar(64),
	"errorMessage" text,
	"durationMs" integer,
	"sessionId" varchar(128),
	"complianceTags" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batteries" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"countryCode" varchar(2) NOT NULL,
	"manufacturerId" varchar(3) NOT NULL,
	"capacityCode" varchar(2) NOT NULL,
	"capacityKwh" numeric(8, 2) NOT NULL,
	"chemistryCode" varchar(1) NOT NULL,
	"chemistry" text NOT NULL,
	"voltageCode" varchar(2) NOT NULL,
	"voltageV" numeric(8, 1) NOT NULL,
	"cellOriginCode" varchar(2) NOT NULL,
	"cellOriginCountry" varchar(100) NOT NULL,
	"extinguisherClass" varchar(1) NOT NULL,
	"mfgYear" integer NOT NULL,
	"mfgMonth" integer NOT NULL,
	"mfgDay" integer NOT NULL,
	"factoryCode" varchar(1) NOT NULL,
	"serialNumber" varchar(4) NOT NULL,
	"recyclabilityPct" numeric(5, 2),
	"lithiumPct" numeric(5, 2),
	"cobaltPct" numeric(5, 2),
	"nickelPct" numeric(5, 2),
	"manganesePct" numeric(5, 2),
	"carbonFootprintKgCo2" numeric(10, 2),
	"status" text DEFAULT 'operational' NOT NULL,
	"currentSoh" numeric(5, 2),
	"cycleCount" integer DEFAULT 0,
	"lastServiceDate" timestamp,
	"disassemblyMethod" varchar(255),
	"registeredById" integer,
	"ownerId" integer,
	"vehicleId" varchar(100),
	"qrCodeUrl" text,
	"healthPassportUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batteries_bpan_unique" UNIQUE("bpan")
);
--> statement-breakpoint
CREATE TABLE "battery_twins" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"simulated_soh" numeric(5, 2),
	"forecast_horizon_days" integer DEFAULT 365 NOT NULL,
	"forecast_data" json,
	"model_version" varchar(32) DEFAULT 'physics-v1.0' NOT NULL,
	"confidence" numeric(4, 3),
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "battery_twins_bpan_unique" UNIQUE("bpan")
);
--> statement-breakpoint
CREATE TABLE "blockchain_anchors" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21),
	"event_type" text NOT NULL,
	"data_hash" varchar(64) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" integer,
	"network" varchar(32) DEFAULT 'polygon-mumbai' NOT NULL,
	"payload" json,
	"anchored_at" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blockchain_anchors_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "bulk_onboarding_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobName" varchar(255) NOT NULL,
	"source" text DEFAULT 'csv_import' NOT NULL,
	"totalRecords" integer NOT NULL,
	"processedRecords" integer DEFAULT 0,
	"successCount" integer DEFAULT 0,
	"failureCount" integer DEFAULT 0,
	"skippedCount" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"errorLog" json,
	"generatedBpans" json,
	"autoGenerateBpan" boolean DEFAULT true,
	"registerWarranty" boolean DEFAULT false,
	"defaultWarrantyMonths" integer,
	"createdById" integer NOT NULL,
	"csvFileUrl" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carbon_footprint_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"totalKgCo2e" numeric(10, 3) NOT NULL,
	"rawMaterialKgCo2e" numeric(10, 3),
	"productionKgCo2e" numeric(10, 3),
	"distributionKgCo2e" numeric(10, 3),
	"endOfLifeKgCo2e" numeric(10, 3),
	"performanceClass" text,
	"methodology" text DEFAULT 'GHG_PROTOCOL' NOT NULL,
	"certifyingBody" varchar(255),
	"declaredById" integer NOT NULL,
	"declaredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carbon_footprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"manufacturing_kg_co2" numeric(10, 3),
	"transport_kg_co2" numeric(10, 3),
	"operational_kg_co2" numeric(10, 3),
	"eol_kg_co2" numeric(10, 3),
	"total_kg_co2" numeric(10, 3),
	"grid_carbon_intensity" numeric(8, 2),
	"grid_region" varchar(64),
	"cert_url" varchar(512),
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "carbon_footprints_bpan_unique" UNIQUE("bpan")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"fingerprint" varchar(64),
	"level" text NOT NULL,
	"analytics" boolean DEFAULT false NOT NULL,
	"marketing" boolean DEFAULT false NOT NULL,
	"essential" boolean DEFAULT true NOT NULL,
	"userAgent" text,
	"ipHash" varchar(64),
	"source" text DEFAULT 'banner' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sharing_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"requesting_user_id" integer NOT NULL,
	"owning_user_id" integer NOT NULL,
	"bpan" varchar(21),
	"scope" varchar(256) NOT NULL,
	"dsa_status" text DEFAULT 'pending' NOT NULL,
	"request_message" text,
	"response_message" text,
	"expires_at" timestamp,
	"approved_at" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"bpan" varchar(21),
	"batteryId" integer,
	"uploadedById" integer NOT NULL,
	"fileUrl" text NOT NULL,
	"fileKey" varchar(512),
	"fileSizeBytes" integer,
	"mimeType" varchar(100),
	"accessLevel" text DEFAULT 'organization' NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epr_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tokenId" varchar(64) NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"recyclerId" integer NOT NULL,
	"producerId" integer,
	"actualYieldKg" numeric(10, 3) NOT NULL,
	"theoreticalYieldKg" numeric(10, 3) NOT NULL,
	"yieldRatio" numeric(5, 4) NOT NULL,
	"blackMassKg" numeric(10, 3),
	"lithiumRecoveredKg" numeric(10, 3),
	"cobaltRecoveredKg" numeric(10, 3),
	"nickelRecoveredKg" numeric(10, 3),
	"status" text DEFAULT 'pending' NOT NULL,
	"blockchainTxHash" varchar(128),
	"blockchainBlock" integer,
	"cpcbFormUrl" text,
	"pliPassportUrl" text,
	"verifiedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epr_tokens_tokenId_unique" UNIQUE("tokenId")
);
--> statement-breakpoint
CREATE TABLE "forward_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"target_soh_min" numeric(5, 2) NOT NULL,
	"target_soh_max" numeric(5, 2) NOT NULL,
	"fo_chemistry" text,
	"min_capacity_kwh" numeric(10, 2),
	"quantity" integer DEFAULT 1 NOT NULL,
	"delivery_month" varchar(7) NOT NULL,
	"max_price_per_kwh" numeric(10, 2),
	"fo_status" text DEFAULT 'pending' NOT NULL,
	"matched_listing_ids" json,
	"expires_at" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" varchar(32) NOT NULL,
	"name" varchar(256) NOT NULL,
	"deviceType" text DEFAULT 'gateway' NOT NULL,
	"bpan" varchar(32),
	"mqttTopic" varchar(256) NOT NULL,
	"mqttUsername" varchar(128) NOT NULL,
	"mqttPassword" varchar(256) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"lastSeen" timestamp,
	"firmwareVersion" varchar(64),
	"hardwareModel" varchar(128),
	"location" varchar(512),
	"notes" text,
	"registeredBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iot_devices_deviceId_unique" UNIQUE("deviceId")
);
--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" integer NOT NULL,
	"url" text NOT NULL,
	"fileKey" varchar(512),
	"caption" varchar(256),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"fileSizeBytes" integer,
	"mimeType" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipmentId" varchar(20) NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"requestedById" integer NOT NULL,
	"pickupAddress" text NOT NULL,
	"deliveryAddress" text NOT NULL,
	"pickupLat" numeric(10, 7),
	"pickupLng" numeric(10, 7),
	"deliveryLat" numeric(10, 7),
	"deliveryLng" numeric(10, 7),
	"currentLat" numeric(10, 7),
	"currentLng" numeric(10, 7),
	"logisticsPartner" varchar(255),
	"driverName" varchar(255),
	"vehicleNumber" varchar(20),
	"hazmatManifestUrl" text,
	"slaTier" text DEFAULT '48h',
	"status" text DEFAULT 'pending' NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"dispatchedAt" timestamp,
	"estimatedDelivery" timestamp,
	"deliveredAt" timestamp,
	"slaBreached" boolean DEFAULT false,
	"notes" text,
	CONSTRAINT "logistics_shipmentId_unique" UNIQUE("shipmentId")
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"sellerId" integer NOT NULL,
	"listingType" text NOT NULL,
	"askingPriceInr" numeric(12, 2),
	"spotPriceInr" numeric(12, 2),
	"sohAtListing" numeric(5, 2),
	"rulAtListing" integer,
	"capacityKwh" numeric(8, 2),
	"chemistry" varchar(20),
	"healthPassportUrl" text,
	"description" text,
	"condition_grade" varchar(20),
	"condition_notes" text,
	"location" varchar(256),
	"photoCount" integer DEFAULT 0,
	"primaryPhotoUrl" text,
	"status" text DEFAULT 'active' NOT NULL,
	"buyerId" integer,
	"transactionDate" timestamp,
	"finalPriceInr" numeric(12, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings_currency" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" integer NOT NULL,
	"priceUsd" numeric(14, 4),
	"listingCurrency" varchar(10) DEFAULT 'INR' NOT NULL,
	"listingCurrencyAmount" numeric(14, 4),
	"exchangeRateAtListing" numeric(14, 6),
	"targetMarkets" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_listings_currency_listingId_unique" UNIQUE("listingId")
);
--> statement-breakpoint
CREATE TABLE "marketplace_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" integer NOT NULL,
	"buyerId" integer NOT NULL,
	"offerAmount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(32) NOT NULL,
	"rmse" numeric(6, 4),
	"mae" numeric(6, 4),
	"r2" numeric(6, 4),
	"battery_count" integer DEFAULT 0 NOT NULL,
	"federated_rounds" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"trained_at" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"locale" varchar(20) DEFAULT 'en-IN' NOT NULL,
	"displayCurrency" varchar(10) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"activeJurisdictions" json NOT NULL,
	"dataResidencyRegion" text DEFAULT 'in' NOT NULL,
	"organisationName" varchar(255),
	"organisationCountry" varchar(2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recycled_content_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"cobaltPct" numeric(5, 2),
	"lithiumPct" numeric(5, 2),
	"nickelPct" numeric(5, 2),
	"leadPct" numeric(5, 2),
	"totalRecycledPct" numeric(5, 2),
	"verificationMethod" text DEFAULT 'SELF_DECLARED' NOT NULL,
	"certifyingBody" varchar(255),
	"certificateRef" varchar(255),
	"notes" text,
	"declaredById" integer NOT NULL,
	"declaredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"jurisdiction" varchar(10) NOT NULL,
	"localId" varchar(128),
	"status" text DEFAULT 'pending' NOT NULL,
	"profileData" json NOT NULL,
	"govSyncStatus" text DEFAULT 'not_required' NOT NULL,
	"lastGovSyncAt" timestamp,
	"lastCheckedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roleAuditLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"targetUserId" integer NOT NULL,
	"targetUserName" text,
	"targetUserEmail" varchar(320),
	"changedByUserId" integer NOT NULL,
	"changedByName" text,
	"previousPlatformRole" varchar(64),
	"newPlatformRole" varchar(64) NOT NULL,
	"previousRole" varchar(32),
	"newRole" varchar(32),
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdk_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"version" varchar(32) NOT NULL,
	"download_url" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"size_kb" integer NOT NULL,
	"spec_hash" varchar(64) NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" varchar(255),
	"build_log" text
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventType" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"userId" integer,
	"userName" varchar(255),
	"description" text NOT NULL,
	"metadata" json,
	"ipAddress" varchar(45),
	"userAgent" text,
	"traceId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"serviceProviderId" integer NOT NULL,
	"serviceType" text NOT NULL,
	"sohBefore" numeric(5, 2),
	"sohAfter" numeric(5, 2),
	"cycleCountAtService" integer,
	"notes" text,
	"technicianName" varchar(255),
	"location" varchar(255),
	"servicedAt" timestamp DEFAULT now() NOT NULL,
	"nextServiceDue" timestamp
);
--> statement-breakpoint
CREATE TABLE "soh_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"predictedSoh" numeric(5, 2) NOT NULL,
	"rulCycles" integer,
	"confidence" numeric(5, 2),
	"rmse" numeric(6, 4),
	"triagePath" text,
	"triageReason" text,
	"maintenanceRecommendations" json,
	"modelVersion" varchar(20) DEFAULT 'v3.2.1',
	"predictedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_payment_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_payment_intent_id" varchar(64) NOT NULL,
	"stripe_session_id" varchar(128),
	"offer_id" integer NOT NULL,
	"listing_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_payment_intents_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"batteryId" integer NOT NULL,
	"vPack" numeric(8, 2),
	"iPack" numeric(8, 2),
	"vMin" numeric(7, 3),
	"vMax" numeric(7, 3),
	"tPack" numeric(6, 2),
	"tMax" numeric(6, 2),
	"cycleCount" integer,
	"irPack" numeric(8, 3),
	"sohEstimate" numeric(5, 2),
	"dtcCodes" json,
	"thermalAnomaly" boolean DEFAULT false,
	"anomalyType" varchar(100),
	"source" text DEFAULT 'simulated',
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"recommended_path" text NOT NULL,
	"confidence" numeric(4, 3),
	"triage_status" text DEFAULT 'pending_approval' NOT NULL,
	"auto_actions_log" json,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_listing_id" integer,
	"created_logistics_id" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorial_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"stepKey" varchar(128) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" text DEFAULT 'user' NOT NULL,
	"platformRole" text DEFAULT 'oem' NOT NULL,
	"organization" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"warrantyId" integer NOT NULL,
	"batteryId" integer NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"claimType" text NOT NULL,
	"description" text NOT NULL,
	"evidenceUrls" json,
	"sohAtClaim" numeric(5, 2),
	"cycleCountAtClaim" integer,
	"status" text DEFAULT 'submitted' NOT NULL,
	"assignedTo" varchar(255),
	"resolutionType" text DEFAULT 'pending',
	"resolutionNotes" text,
	"resolutionDate" timestamp,
	"claimedById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"batteryId" integer NOT NULL,
	"bpan" varchar(21) NOT NULL,
	"serialNumber" varchar(100),
	"modelNumber" varchar(100),
	"warrantyType" text DEFAULT 'standard' NOT NULL,
	"coverageType" text DEFAULT 'full_replacement' NOT NULL,
	"warrantyTermMonths" integer NOT NULL,
	"purchaseDate" timestamp NOT NULL,
	"warrantyStartDate" timestamp NOT NULL,
	"warrantyEndDate" timestamp NOT NULL,
	"status" text DEFAULT 'pending_activation' NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerPhone" varchar(20),
	"customerWhatsApp" varchar(20),
	"customerEmail" varchar(320),
	"customerAddress" text,
	"dealerName" varchar(255),
	"dealerCode" varchar(50),
	"dealerPhone" varchar(20),
	"dealerEmail" varchar(320),
	"invoiceNumber" varchar(100),
	"invoiceUrl" text,
	"purchaseAmount" numeric(12, 2),
	"purchaseCurrency" varchar(10) DEFAULT 'INR',
	"manufacturer" varchar(255),
	"totalClaims" integer DEFAULT 0,
	"lastClaimDate" timestamp,
	"notes" text,
	"metadata" json,
	"registeredById" integer NOT NULL,
	"activatedAt" timestamp,
	"voidedAt" timestamp,
	"voidReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(128) NOT NULL,
	"events" json NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"maxRetries" integer DEFAULT 3,
	"totalDeliveries" integer DEFAULT 0,
	"totalFailures" integer DEFAULT 0,
	"lastDeliveryAt" timestamp,
	"lastFailureAt" timestamp,
	"lastFailureReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"articleId" varchar(128) NOT NULL,
	"articleTitle" varchar(256) NOT NULL,
	"feedbackType" text NOT NULL,
	"content" text,
	"suggestedContent" text,
	"section" varchar(256),
	"rating" integer,
	"reviewStatus" text DEFAULT 'pending' NOT NULL,
	"reviewNotes" text,
	"reviewedBy" integer,
	"reviewedAt" timestamp,
	"userId" integer,
	"userName" varchar(256),
	"userEmail" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yield_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" varchar(32) NOT NULL,
	"recyclerId" integer NOT NULL,
	"bpanList" json NOT NULL,
	"totalBatteriesCount" integer NOT NULL,
	"totalTheoreticalYieldKg" numeric(12, 3) NOT NULL,
	"totalActualYieldKg" numeric(12, 3),
	"blackMassYieldKg" numeric(12, 3),
	"lithiumYieldKg" numeric(12, 3),
	"cobaltYieldKg" numeric(12, 3),
	"nickelYieldKg" numeric(12, 3),
	"processingMethod" varchar(100),
	"scadaDataUrl" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"eprTokenId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "yield_verifications_batchId_unique" UNIQUE("batchId")
);
