CREATE TABLE `carbon_footprint_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`totalKgCo2e` decimal(10,3) NOT NULL,
	`rawMaterialKgCo2e` decimal(10,3),
	`productionKgCo2e` decimal(10,3),
	`distributionKgCo2e` decimal(10,3),
	`endOfLifeKgCo2e` decimal(10,3),
	`performanceClass` enum('A','B','C','D','E'),
	`methodology` enum('GHG_PROTOCOL','ISO_14067','EU_PEF','GBA') NOT NULL DEFAULT 'GHG_PROTOCOL',
	`certifyingBody` varchar(255),
	`declaredById` int NOT NULL,
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `carbon_footprint_declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_listings_currency` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`priceUsd` decimal(14,4),
	`listingCurrency` varchar(10) NOT NULL DEFAULT 'INR',
	`listingCurrencyAmount` decimal(14,4),
	`exchangeRateAtListing` decimal(14,6),
	`targetMarkets` json NOT NULL DEFAULT ('["IN"]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_currency_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_listings_currency_listingId_unique` UNIQUE(`listingId`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`locale` varchar(20) NOT NULL DEFAULT 'en-IN',
	`displayCurrency` varchar(10) NOT NULL DEFAULT 'INR',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`activeJurisdictions` json NOT NULL DEFAULT ('["IN"]'),
	`dataResidencyRegion` enum('in','eu','cn','us','global') NOT NULL DEFAULT 'in',
	`organisationName` varchar(255),
	`organisationCountry` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regulatory_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`jurisdiction` varchar(10) NOT NULL,
	`localId` varchar(128),
	`status` enum('compliant','non_compliant','pending','not_applicable','data_incomplete') NOT NULL DEFAULT 'pending',
	`profileData` json NOT NULL,
	`govSyncStatus` enum('synced','pending','failed','not_required') NOT NULL DEFAULT 'not_required',
	`lastGovSyncAt` timestamp,
	`lastCheckedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regulatory_profiles_id` PRIMARY KEY(`id`)
);
