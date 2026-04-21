CREATE TABLE `alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`metric` enum('temperature','voltage','current','soc','soh','cycleCount','internalResistance') NOT NULL,
	`operator` enum('gt','lt','gte','lte','eq') NOT NULL,
	`threshold` decimal(12,4) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`bpan` varchar(21),
	`chemistry` enum('LFP','NMC','NCA','LCO','LMO','LEAD_ACID'),
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
