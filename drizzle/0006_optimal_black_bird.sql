CREATE TABLE `agent_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorName` varchar(255),
	`actorType` enum('human','agent','system') NOT NULL DEFAULT 'human',
	`action` varchar(255) NOT NULL,
	`description` text,
	`module` enum('battery','telemetry','marketplace','compliance','logistics','analytics','admin','system','agent','ai') NOT NULL DEFAULT 'system',
	`inputParams` json,
	`outputResult` json,
	`status` enum('success','failure','pending','cancelled') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`durationMs` int,
	`ipAddress` varchar(45),
	`targetEntity` varchar(255),
	`targetEntityType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_actions_id` PRIMARY KEY(`id`)
);
