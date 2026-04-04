CREATE TABLE `listing_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `marketplace_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerId` int NOT NULL,
	`offerAmount` decimal(14,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'INR',
	`message` text,
	`status` enum('pending','accepted','rejected','withdrawn','expired') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `iot_devices` ADD `status` enum('active','inactive','pending','revoked') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `condition_grade` varchar(20);--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `condition_notes` text;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `location` varchar(256);--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `photoCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `primaryPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `iot_devices` DROP COLUMN `deviceStatus`;