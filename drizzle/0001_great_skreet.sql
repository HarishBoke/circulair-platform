CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`bpan` varchar(21),
	`batteryId` int,
	`type` enum('thermal_anomaly','eol_detected','logistics_dispatch','epr_token_issued','compliance_deadline','soh_degradation','sla_breach','yield_verified','marketplace_match','system') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`read` boolean NOT NULL DEFAULT false,
	`acknowledged` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batteries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`manufacturerId` varchar(3) NOT NULL,
	`capacityCode` varchar(2) NOT NULL,
	`capacityKwh` decimal(8,2) NOT NULL,
	`chemistryCode` varchar(1) NOT NULL,
	`chemistry` enum('LFP','NMC','NCA','LCO','LMO','LEAD_ACID') NOT NULL,
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
	`status` enum('operational','second_life','end_of_life','in_transit','recycling') NOT NULL DEFAULT 'operational',
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
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batteries_id` PRIMARY KEY(`id`),
	CONSTRAINT `batteries_bpan_unique` UNIQUE(`bpan`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('battery_certificate','health_passport','compliance_report','recycling_manifest','hazmat_manifest','audit_trail','cpcb_form','pli_passport','material_composition','other') NOT NULL,
	`bpan` varchar(21),
	`batteryId` int,
	`uploadedById` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`fileSizeBytes` int,
	`mimeType` varchar(100),
	`accessLevel` enum('public','organization','private','government') NOT NULL DEFAULT 'organization',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `epr_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`status` enum('pending','verified','rejected','disputed') NOT NULL DEFAULT 'pending',
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
CREATE TABLE `logistics` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`slaTier` enum('24h','48h','72h') DEFAULT '48h',
	`status` enum('pending','dispatched','in_transit','delivered','failed') NOT NULL DEFAULT 'pending',
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
CREATE TABLE `marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`sellerId` int NOT NULL,
	`listingType` enum('direct_reuse','module_repurposing','black_mass','second_life_pack') NOT NULL,
	`askingPriceInr` decimal(12,2),
	`spotPriceInr` decimal(12,2),
	`sohAtListing` decimal(5,2),
	`rulAtListing` int,
	`capacityKwh` decimal(8,2),
	`chemistry` varchar(20),
	`healthPassportUrl` text,
	`description` text,
	`status` enum('active','sold','reserved','expired','withdrawn') NOT NULL DEFAULT 'active',
	`buyerId` int,
	`transactionDate` timestamp,
	`finalPriceInr` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`serviceProviderId` int NOT NULL,
	`serviceType` enum('inspection','maintenance','repair','replacement','eol_assessment','triage') NOT NULL,
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
CREATE TABLE `soh_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`predictedSoh` decimal(5,2) NOT NULL,
	`rulCycles` int,
	`confidence` decimal(5,2),
	`rmse` decimal(6,4),
	`triagePath` enum('direct_reuse','module_repurposing','material_recycling'),
	`triageReason` text,
	`maintenanceRecommendations` json,
	`modelVersion` varchar(20) DEFAULT 'v3.2.1',
	`predictedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `soh_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telemetry` (
	`id` bigint AUTO_INCREMENT NOT NULL,
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
	`source` enum('mqtt','manual','api','simulated') DEFAULT 'simulated',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `yield_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`eprTokenId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `yield_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `yield_verifications_batchId_unique` UNIQUE(`batchId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `platformRole` enum('admin','oem','manufacturer','recycler','bess_developer','service_provider','government') DEFAULT 'oem' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organization` varchar(255);