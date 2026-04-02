CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`keyHash` varchar(64) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`userId` int NOT NULL,
	`scopes` json NOT NULL,
	`rateLimitTier` enum('free','standard','premium','enterprise') NOT NULL DEFAULT 'standard',
	`rateLimit` int DEFAULT 100,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`lastUsedAt` timestamp,
	`totalRequests` bigint DEFAULT 0,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`revokedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `api_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`traceId` varchar(64) NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`userRole` varchar(64),
	`actorType` enum('human','agent','system','api_key') NOT NULL DEFAULT 'human',
	`apiKeyId` int,
	`action` varchar(255) NOT NULL,
	`dataClassification` enum('public','internal','confidential','restricted') NOT NULL DEFAULT 'internal',
	`resourceType` varchar(64),
	`resourceId` varchar(255),
	`module` varchar(64),
	`httpMethod` varchar(10),
	`httpPath` varchar(512),
	`ipAddress` varchar(45),
	`userAgent` text,
	`inputSummary` json,
	`outputSummary` json,
	`status` enum('success','failure','denied','error') NOT NULL DEFAULT 'success',
	`errorCode` varchar(64),
	`errorMessage` text,
	`durationMs` int,
	`sessionId` varchar(128),
	`complianceTags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('login_success','login_failure','logout','role_change','permission_denied','api_key_created','api_key_revoked','data_export','data_deletion','password_change','session_expired','concurrent_session_blocked','rate_limit_exceeded','suspicious_activity','compliance_violation','config_change') NOT NULL,
	`severity` enum('info','low','medium','high','critical') NOT NULL DEFAULT 'info',
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
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(128) NOT NULL,
	`events` json NOT NULL,
	`status` enum('active','paused','failed') NOT NULL DEFAULT 'active',
	`maxRetries` int DEFAULT 3,
	`totalDeliveries` int DEFAULT 0,
	`totalFailures` int DEFAULT 0,
	`lastDeliveryAt` timestamp,
	`lastFailureAt` timestamp,
	`lastFailureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
