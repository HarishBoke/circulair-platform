CREATE TABLE `recycled_content_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bpan` varchar(21) NOT NULL,
	`batteryId` int NOT NULL,
	`cobaltPct` decimal(5,2),
	`lithiumPct` decimal(5,2),
	`nickelPct` decimal(5,2),
	`leadPct` decimal(5,2),
	`totalRecycledPct` decimal(5,2),
	`verificationMethod` enum('SELF_DECLARED','THIRD_PARTY_AUDIT','CERTIFIED_LAB') NOT NULL DEFAULT 'SELF_DECLARED',
	`certifyingBody` varchar(255),
	`certificateRef` varchar(255),
	`notes` text,
	`declaredById` int NOT NULL,
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recycled_content_declarations_id` PRIMARY KEY(`id`)
);
