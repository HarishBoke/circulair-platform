CREATE TABLE IF NOT EXISTS `agent_actions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorName` varchar(255),
	`actorType` varchar(255) NOT NULL DEFAULT 'human',
	`action` varchar(255) NOT NULL,
	`description` text,
	`module` varchar(255) NOT NULL DEFAULT 'system',
	`inputParams` json,
	`outputResult` json,
	`status` varchar(255) NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`durationMs` int,
	`ipAddress` varchar(45),
	`targetEntity` varchar(255),
	`targetEntityType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `alert_rules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`metric` text NOT NULL,
	`operator` text NOT NULL,
	`threshold` decimal(12,4) NOT NULL,
	`severity` varchar(255) NOT NULL DEFAULT 'warning',
	`bpan` varchar(21),
	`chemistry` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `alerts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int,
	`bpan` varchar(21),
	`batteryId` int,
	`type` text NOT NULL,
	`severity` varchar(255) NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`read` boolean NOT NULL DEFAULT false,
	`acknowledged` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `api_keys` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`keyHash` varchar(64) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`userId` int NOT NULL,
	`scopes` json NOT NULL,
	`rateLimitTier` varchar(255) NOT NULL DEFAULT 'standard',
	`rateLimit` int DEFAULT 100,
	`status` varchar(255) NOT NULL DEFAULT 'active',
	`lastUsedAt` timestamp,
	`totalRequests` bigint DEFAULT 0,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`revokedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `api_usage_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`apiKeyId` int NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`method` varchar(10) NOT NULL,
	`statusCode` int,
	`durationMs` int,
	`requestSize` int,
	`responseSize` int,
	`ipAddress` varchar(45),
	`traceId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`traceId` varchar(64) NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(64),
	`actorType` varchar(255) NOT NULL DEFAULT 'human',
	`apiKeyId` int,
	`action` varchar(255) NOT NULL,
	`dataClassification` varchar(255) NOT NULL DEFAULT 'internal',
	`resourceType` varchar(64),
	`resourceId` varchar(255),
	`module` varchar(64),
	`httpMethod` varchar(10),
	`httpPath` varchar(512),
	`ipAddress` varchar(45),
	`userAgent` text,
	`inputSummary` json,
	`outputSummary` json,
	`status` varchar(255) NOT NULL DEFAULT 'success',
	`errorCode` varchar(64),
	`errorMessage` text,
	`durationMs` int,
	`sessionId` varchar(128),
	`complianceTags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batteries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`manufacturerId` varchar(3) NOT NULL,
	`capacityCode` varchar(2) NOT NULL,
	`capacityKwh` decimal(8,2) NOT NULL,
	`chemistryCode` varchar(1) NOT NULL,
	`chemistry` text NOT NULL,
	`voltageCode` varchar(2) NOT NULL,
	`voltageV` decimal(8,1) NOT NULL,
	`cellOriginCode` varchar(2) NOT NULL,
	`cellOriginCountry` varchar(100) NOT NULL,
	`extinguisherClass` varchar(1) NOT NULL,
	`mfgYear` int NOT NULL,
	`mfgMonth` int NOT NULL,
	`mfgDay` int NOT NULL,
	`factoryCode` varchar(1) NOT NULL,
	`serialNumber` varchar(4) NOT NULL,
	`recyclabilityPct` decimal(5,2),
	`lithiumPct` decimal(5,2),
	`cobaltPct` decimal(5,2),
	`nickelPct` decimal(5,2),
	`manganesePct` decimal(5,2),
	`carbonFootprintKgCo2` decimal(10,2),
	`status` varchar(255) NOT NULL DEFAULT 'operational',
	`currentSoh` decimal(5,2),
	`cycleCount` int DEFAULT 0,
	`lastServiceDate` timestamp,
	`disassemblyMethod` varchar(255),
	`registeredById` int,
	`ownerId` int,
	`vehicleId` varchar(100),
	`qrCodeUrl` text,
	`healthPassportUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `batteries_id` PRIMARY KEY(`id`),
	CONSTRAINT `batteries_bpan_unique` UNIQUE(`bpan`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `battery_twins` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`simulated_soh` decimal(5,2),
	`forecast_horizon_days` int NOT NULL DEFAULT 365,
	`forecast_data` json,
	`model_version` varchar(32) NOT NULL DEFAULT 'physics-v1.0',
	`confidence` decimal(4,3),
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battery_twins_id` PRIMARY KEY(`id`),
	CONSTRAINT `battery_twins_bpan_unique` UNIQUE(`bpan`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `blockchain_anchors` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21),
	`event_type` text NOT NULL,
	`data_hash` varchar(64) NOT NULL,
	`tx_hash` varchar(66) NOT NULL,
	`block_number` int,
	`network` varchar(32) NOT NULL DEFAULT 'polygon-mumbai',
	`payload` json,
	`anchored_at` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blockchain_anchors_id` PRIMARY KEY(`id`),
	CONSTRAINT `blockchain_anchors_tx_hash_unique` UNIQUE(`tx_hash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bulk_onboarding_jobs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`jobName` varchar(255) NOT NULL,
	`source` varchar(255) NOT NULL DEFAULT 'csv_import',
	`totalRecords` int NOT NULL,
	`processedRecords` int DEFAULT 0,
	`successCount` int DEFAULT 0,
	`failureCount` int DEFAULT 0,
	`skippedCount` int DEFAULT 0,
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`errorLog` json,
	`generatedBpans` json,
	`autoGenerateBpan` boolean DEFAULT true,
	`registerWarranty` boolean DEFAULT false,
	`defaultWarrantyMonths` int,
	`createdById` int NOT NULL,
	`csvFileUrl` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bulk_onboarding_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_footprint_declarations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`totalKgCo2e` decimal(10,3) NOT NULL,
	`rawMaterialKgCo2e` decimal(10,3),
	`productionKgCo2e` decimal(10,3),
	`distributionKgCo2e` decimal(10,3),
	`endOfLifeKgCo2e` decimal(10,3),
	`performanceClass` text,
	`methodology` varchar(255) NOT NULL DEFAULT 'GHG_PROTOCOL',
	`certifyingBody` varchar(255),
	`declaredById` int NOT NULL,
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `carbon_footprint_declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_footprints` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`manufacturing_kg_co2` decimal(10,3),
	`transport_kg_co2` decimal(10,3),
	`operational_kg_co2` decimal(10,3),
	`eol_kg_co2` decimal(10,3),
	`total_kg_co2` decimal(10,3),
	`grid_carbon_intensity` decimal(8,2),
	`grid_region` varchar(64),
	`cert_url` varchar(512),
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `carbon_footprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `carbon_footprints_bpan_unique` UNIQUE(`bpan`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consent_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fingerprint` varchar(64),
	`level` text NOT NULL,
	`analytics` boolean NOT NULL DEFAULT false,
	`marketing` boolean NOT NULL DEFAULT false,
	`essential` boolean NOT NULL DEFAULT true,
	`userAgent` text,
	`ipHash` varchar(64),
	`source` varchar(255) NOT NULL DEFAULT 'banner',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_inquiries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(255),
	`role` varchar(100),
	`message` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`ip_address` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `data_sharing_agreements` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`requesting_user_id` int NOT NULL,
	`owning_user_id` int NOT NULL,
	`bpan` varchar(21),
	`scope` varchar(256) NOT NULL,
	`dsa_status` varchar(255) NOT NULL DEFAULT 'pending',
	`request_message` text,
	`response_message` text,
	`expires_at` timestamp,
	`approved_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_sharing_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `documents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` text NOT NULL,
	`bpan` varchar(21),
	`batteryId` int,
	`uploadedById` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`fileSizeBytes` int,
	`mimeType` varchar(100),
	`accessLevel` varchar(255) NOT NULL DEFAULT 'organization',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `epr_tokens` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tokenId` varchar(64) NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`recyclerId` int NOT NULL,
	`producerId` int,
	`actualYieldKg` decimal(10,3) NOT NULL,
	`theoreticalYieldKg` decimal(10,3) NOT NULL,
	`yieldRatio` decimal(5,4) NOT NULL,
	`blackMassKg` decimal(10,3),
	`lithiumRecoveredKg` decimal(10,3),
	`cobaltRecoveredKg` decimal(10,3),
	`nickelRecoveredKg` decimal(10,3),
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`blockchainTxHash` varchar(128),
	`blockchainBlock` int,
	`cpcbFormUrl` text,
	`pliPassportUrl` text,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `epr_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `epr_tokens_tokenId_unique` UNIQUE(`tokenId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `forward_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`buyer_id` int NOT NULL,
	`target_soh_min` decimal(5,2) NOT NULL,
	`target_soh_max` decimal(5,2) NOT NULL,
	`fo_chemistry` text,
	`min_capacity_kwh` decimal(10,2),
	`quantity` int NOT NULL DEFAULT 1,
	`delivery_month` varchar(7) NOT NULL,
	`max_price_per_kwh` decimal(10,2),
	`fo_status` varchar(255) NOT NULL DEFAULT 'pending',
	`matched_listing_ids` json,
	`expires_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forward_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `iot_devices` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(32) NOT NULL,
	`name` varchar(256) NOT NULL,
	`deviceType` varchar(255) NOT NULL DEFAULT 'gateway',
	`bpan` varchar(32),
	`mqttTopic` varchar(256) NOT NULL,
	`mqttUsername` varchar(128) NOT NULL,
	`mqttPassword` varchar(256) NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`lastSeen` timestamp,
	`firmwareVersion` varchar(64),
	`hardwareModel` varchar(128),
	`location` varchar(512),
	`notes` text,
	`registeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `iot_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `iot_devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `listing_photos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512),
	`caption` varchar(256),
	`sortOrder` int NOT NULL DEFAULT 0,
	`fileSizeBytes` int,
	`mimeType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `logistics` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shipmentId` varchar(20) NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`requestedById` int NOT NULL,
	`pickupAddress` text NOT NULL,
	`deliveryAddress` text NOT NULL,
	`pickupLat` decimal(10,7),
	`pickupLng` decimal(10,7),
	`deliveryLat` decimal(10,7),
	`deliveryLng` decimal(10,7),
	`currentLat` decimal(10,7),
	`currentLng` decimal(10,7),
	`logisticsPartner` varchar(255),
	`driverName` varchar(255),
	`vehicleNumber` varchar(20),
	`hazmatManifestUrl` text,
	`slaTier` varchar(255) DEFAULT '48h',
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`dispatchedAt` timestamp,
	`estimatedDelivery` timestamp,
	`deliveredAt` timestamp,
	`slaBreached` boolean DEFAULT false,
	`notes` text,
	CONSTRAINT `logistics_id` PRIMARY KEY(`id`),
	CONSTRAINT `logistics_shipmentId_unique` UNIQUE(`shipmentId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_listings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`sellerId` int NOT NULL,
	`listingType` text NOT NULL,
	`askingPriceInr` decimal(12,2),
	`spotPriceInr` decimal(12,2),
	`sohAtListing` decimal(5,2),
	`rulAtListing` int,
	`capacityKwh` decimal(8,2),
	`chemistry` varchar(20),
	`healthPassportUrl` text,
	`description` text,
	`condition_grade` varchar(20),
	`condition_notes` text,
	`location` varchar(256),
	`photoCount` int DEFAULT 0,
	`primaryPhotoUrl` text,
	`status` varchar(255) NOT NULL DEFAULT 'active',
	`buyerId` int,
	`transactionDate` timestamp,
	`finalPriceInr` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_listings_currency` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`priceUsd` decimal(14,4),
	`listingCurrency` varchar(10) NOT NULL DEFAULT 'INR',
	`listingCurrencyAmount` decimal(14,4),
	`exchangeRateAtListing` decimal(14,6),
	`targetMarkets` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_listings_currency_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_listings_currency_listingId_unique` UNIQUE(`listingId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_offers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerId` int NOT NULL,
	`offerAmount` decimal(14,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'INR',
	`message` text,
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `model_versions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`version` varchar(32) NOT NULL,
	`rmse` decimal(6,4),
	`mae` decimal(6,4),
	`r2` decimal(6,4),
	`battery_count` int NOT NULL DEFAULT 0,
	`federated_rounds` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT false,
	`trained_at` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `model_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_versions_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `platform_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int,
	`locale` varchar(20) NOT NULL DEFAULT 'en-IN',
	`displayCurrency` varchar(10) NOT NULL DEFAULT 'INR',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`activeJurisdictions` json NOT NULL,
	`dataResidencyRegion` varchar(255) NOT NULL DEFAULT 'in',
	`organisationName` varchar(255),
	`organisationCountry` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `recycled_content_declarations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`cobaltPct` decimal(5,2),
	`lithiumPct` decimal(5,2),
	`nickelPct` decimal(5,2),
	`leadPct` decimal(5,2),
	`totalRecycledPct` decimal(5,2),
	`verificationMethod` varchar(255) NOT NULL DEFAULT 'SELF_DECLARED',
	`certifyingBody` varchar(255),
	`certificateRef` varchar(255),
	`notes` text,
	`declaredById` int NOT NULL,
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recycled_content_declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `regulatory_profiles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`jurisdiction` varchar(10) NOT NULL,
	`localId` varchar(128),
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`profileData` json NOT NULL,
	`govSyncStatus` varchar(255) NOT NULL DEFAULT 'not_required',
	`lastGovSyncAt` timestamp,
	`lastCheckedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regulatory_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `roleAuditLog` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`targetUserId` int NOT NULL,
	`targetUserName` text,
	`targetUserEmail` varchar(320),
	`changedByUserId` int NOT NULL,
	`changedByName` text,
	`previousPlatformRole` varchar(64),
	`newPlatformRole` varchar(64) NOT NULL,
	`previousRole` varchar(32),
	`newRole` varchar(32),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roleAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sdk_meta` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`language` text NOT NULL,
	`version` varchar(32) NOT NULL,
	`download_url` text NOT NULL,
	`filename` varchar(255) NOT NULL,
	`size_kb` int NOT NULL,
	`spec_hash` varchar(64) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_by` varchar(255),
	`build_log` text,
	CONSTRAINT `sdk_meta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `security_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`eventType` text NOT NULL,
	`severity` varchar(255) NOT NULL DEFAULT 'info',
	`userId` int,
	`userName` varchar(255),
	`description` text NOT NULL,
	`metadata` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`traceId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `service_history` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`serviceProviderId` int NOT NULL,
	`serviceType` text NOT NULL,
	`sohBefore` decimal(5,2),
	`sohAfter` decimal(5,2),
	`cycleCountAtService` int,
	`notes` text,
	`technicianName` varchar(255),
	`location` varchar(255),
	`servicedAt` timestamp NOT NULL DEFAULT (now()),
	`nextServiceDue` timestamp,
	CONSTRAINT `service_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `soh_predictions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`predictedSoh` decimal(5,2) NOT NULL,
	`rulCycles` int,
	`confidence` decimal(5,2),
	`rmse` decimal(6,4),
	`triagePath` text,
	`triageReason` text,
	`maintenanceRecommendations` json,
	`modelVersion` varchar(20) DEFAULT 'v3.2.1',
	`predictedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `soh_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stripe_payment_intents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`stripe_payment_intent_id` varchar(64) NOT NULL,
	`stripe_session_id` varchar(128),
	`offer_id` int NOT NULL,
	`listing_id` int NOT NULL,
	`buyer_id` int NOT NULL,
	`seller_id` int NOT NULL,
	`payment_status` varchar(255) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stripe_payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_payment_intents_stripe_payment_intent_id_unique` UNIQUE(`stripe_payment_intent_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `telemetry` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`vPack` decimal(8,2),
	`iPack` decimal(8,2),
	`vMin` decimal(7,3),
	`vMax` decimal(7,3),
	`tPack` decimal(6,2),
	`tMax` decimal(6,2),
	`cycleCount` int,
	`irPack` decimal(8,3),
	`sohEstimate` decimal(5,2),
	`dtcCodes` json,
	`thermalAnomaly` boolean DEFAULT false,
	`anomalyType` varchar(100),
	`source` varchar(255) DEFAULT 'simulated',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `triage_jobs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`recommended_path` text NOT NULL,
	`confidence` decimal(4,3),
	`triage_status` varchar(255) NOT NULL DEFAULT 'pending_approval',
	`auto_actions_log` json,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_note` text,
	`created_listing_id` int,
	`created_logistics_id` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `triage_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tutorial_progress` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stepKey` varchar(128) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutorial_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`passwordHash` varchar(255),
	`loginMethod` varchar(64),
	`role` varchar(255) NOT NULL DEFAULT 'user',
	`platformRole` varchar(255) NOT NULL DEFAULT 'oem',
	`organization` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `warranty_claims` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`warrantyId` int NOT NULL,
	`batteryId` int NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`claimType` text NOT NULL,
	`description` text NOT NULL,
	`evidenceUrls` json,
	`sohAtClaim` decimal(5,2),
	`cycleCountAtClaim` int,
	`status` varchar(255) NOT NULL DEFAULT 'submitted',
	`assignedTo` varchar(255),
	`resolutionType` varchar(255) DEFAULT 'pending',
	`resolutionNotes` text,
	`resolutionDate` timestamp,
	`claimedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warranty_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `warranty_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`batteryId` int NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`serialNumber` varchar(100),
	`modelNumber` varchar(100),
	`warrantyType` varchar(255) NOT NULL DEFAULT 'standard',
	`coverageType` varchar(255) NOT NULL DEFAULT 'full_replacement',
	`warrantyTermMonths` int NOT NULL,
	`purchaseDate` timestamp NOT NULL,
	`warrantyStartDate` timestamp NOT NULL,
	`warrantyEndDate` timestamp NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'pending_activation',
	`customerName` varchar(255) NOT NULL,
	`customerPhone` varchar(20),
	`customerWhatsApp` varchar(20),
	`customerEmail` varchar(320),
	`customerAddress` text,
	`dealerName` varchar(255),
	`dealerCode` varchar(50),
	`dealerPhone` varchar(20),
	`dealerEmail` varchar(320),
	`invoiceNumber` varchar(100),
	`invoiceUrl` text,
	`purchaseAmount` decimal(12,2),
	`purchaseCurrency` varchar(10) DEFAULT 'INR',
	`manufacturer` varchar(255),
	`totalClaims` int DEFAULT 0,
	`lastClaimDate` timestamp,
	`notes` text,
	`metadata` json,
	`registeredById` int NOT NULL,
	`activatedAt` timestamp,
	`voidedAt` timestamp,
	`voidReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warranty_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webhooks` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(128) NOT NULL,
	`events` json NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'active',
	`maxRetries` int DEFAULT 3,
	`totalDeliveries` int DEFAULT 0,
	`totalFailures` int DEFAULT 0,
	`lastDeliveryAt` timestamp,
	`lastFailureAt` timestamp,
	`lastFailureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wiki_feedback` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`articleId` varchar(128) NOT NULL,
	`articleTitle` varchar(256) NOT NULL,
	`feedbackType` text NOT NULL,
	`content` text,
	`suggestedContent` text,
	`section` varchar(256),
	`rating` int,
	`reviewStatus` varchar(255) NOT NULL DEFAULT 'pending',
	`reviewNotes` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`userId` int,
	`userName` varchar(256),
	`userEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wiki_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `yield_verifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`batchId` varchar(32) NOT NULL,
	`recyclerId` int NOT NULL,
	`bpanList` json NOT NULL,
	`totalBatteriesCount` int NOT NULL,
	`totalTheoreticalYieldKg` decimal(12,3) NOT NULL,
	`totalActualYieldKg` decimal(12,3),
	`blackMassYieldKg` decimal(12,3),
	`lithiumYieldKg` decimal(12,3),
	`cobaltYieldKg` decimal(12,3),
	`nickelYieldKg` decimal(12,3),
	`processingMethod` varchar(100),
	`scadaDataUrl` text,
	`status` varchar(255) NOT NULL DEFAULT 'pending',
	`eprTokenId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `yield_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `yield_verifications_batchId_unique` UNIQUE(`batchId`)
);
