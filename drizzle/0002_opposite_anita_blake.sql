CREATE TABLE `roleAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
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
