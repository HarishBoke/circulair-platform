CREATE TABLE `battery_twins` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `blockchain_anchors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21),
	`event_type` enum('bpan_registration','soh_prediction','epr_token_issuance','compliance_report','marketplace_transaction','logistics_dispatch','data_sharing_consent') NOT NULL,
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
CREATE TABLE `carbon_footprints` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `data_sharing_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesting_user_id` int NOT NULL,
	`owning_user_id` int NOT NULL,
	`bpan` varchar(21),
	`scope` varchar(256) NOT NULL,
	`dsa_status` enum('pending','approved','rejected','revoked','expired') NOT NULL DEFAULT 'pending',
	`request_message` text,
	`response_message` text,
	`expires_at` timestamp,
	`approved_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sharing_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forward_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyer_id` int NOT NULL,
	`target_soh_min` decimal(5,2) NOT NULL,
	`target_soh_max` decimal(5,2) NOT NULL,
	`fo_chemistry` enum('LFP','NMC','NCA','LCO','LMO','LEAD_ACID','SOLID_STATE'),
	`min_capacity_kwh` decimal(10,2),
	`quantity` int NOT NULL DEFAULT 1,
	`delivery_month` varchar(7) NOT NULL,
	`max_price_per_kwh` decimal(10,2),
	`fo_status` enum('pending','matched','fulfilled','cancelled','expired') NOT NULL DEFAULT 'pending',
	`matched_listing_ids` json,
	`expires_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forward_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `triage_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`recommended_path` enum('direct_reuse','module_repurposing','material_recycling') NOT NULL,
	`confidence` decimal(4,3),
	`triage_status` enum('pending_approval','approved','rejected','executing','completed','failed') NOT NULL DEFAULT 'pending_approval',
	`auto_actions_log` json,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_note` text,
	`created_listing_id` int,
	`created_logistics_id` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `triage_jobs_id` PRIMARY KEY(`id`)
);
