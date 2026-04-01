ALTER TABLE `marketplace_listings_currency` MODIFY COLUMN `targetMarkets` json NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `activeJurisdictions` json NOT NULL;