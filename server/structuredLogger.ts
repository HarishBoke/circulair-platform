/**
 * structuredLogger.ts — Enterprise Structured Logging
 * 
 * Provides:
 * - JSON-structured log output (SIEM-ready)
 * - Request correlation via trace IDs
 * - Log levels: debug, info, warn, error, fatal
 * - Automatic context enrichment (user, module, trace)
 * - Performance timing helpers
 * - ISO 27001 A.12.4 compliant logging format
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  traceId?: string;
  userId?: number;
  userName?: string;
  action?: string;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
  /** ISO 27001 data classification */
  dataClassification?: "public" | "internal" | "confidential" | "restricted";
  /** SOC 2 control reference */
  controlRef?: string;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    service: "circulair-platform",
    environment: process.env.NODE_ENV ?? "development",
    hostname: process.env.HOSTNAME ?? "unknown",
    pid: process.pid,
  });
}

function log(level: LogLevel, message: string, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
    case "fatal":
      console.error(formatted);
      break;
  }
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

export const logger = {
  debug: (message: string, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) =>
    log("debug", message, context),

  info: (message: string, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) =>
    log("info", message, context),

  warn: (message: string, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) =>
    log("warn", message, context),

  error: (message: string, err?: Error | unknown, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) => {
    const errorInfo = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : err ? { name: "Unknown", message: String(err) } : undefined;
    log("error", message, { ...context, error: errorInfo });
  },

  fatal: (message: string, err?: Error | unknown, context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>) => {
    const errorInfo = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : err ? { name: "Unknown", message: String(err) } : undefined;
    log("fatal", message, { ...context, error: errorInfo });
  },
};

// ─── PERFORMANCE TIMER ──────────────────────────────────────────────────────

export function createTimer(label: string, context?: { module?: string; traceId?: string }) {
  const start = performance.now();
  return {
    end: (metadata?: Record<string, unknown>) => {
      const durationMs = Math.round(performance.now() - start);
      logger.info(`${label} completed`, {
        ...context,
        durationMs,
        metadata,
      });
      return durationMs;
    },
  };
}

// ─── REQUEST CONTEXT ────────────────────────────────────────────────────────

export interface RequestContext {
  traceId: string;
  userId?: number;
  userName?: string;
  module?: string;
}

/** Create a scoped logger with pre-filled context */
export function createScopedLogger(context: RequestContext) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      logger.debug(message, { ...context, metadata: extra }),
    info: (message: string, extra?: Record<string, unknown>) =>
      logger.info(message, { ...context, metadata: extra }),
    warn: (message: string, extra?: Record<string, unknown>) =>
      logger.warn(message, { ...context, metadata: extra }),
    error: (message: string, err?: Error | unknown, extra?: Record<string, unknown>) =>
      logger.error(message, err, { ...context, metadata: extra }),
    timer: (label: string) => createTimer(label, context),
  };
}

// ─── COMPLIANCE LOGGING HELPERS ─────────────────────────────────────────────

/** Log a security-relevant event (ISO 27001 A.12.4.1) */
export function logSecurityEvent(message: string, context: {
  userId?: number;
  userName?: string;
  traceId?: string;
  controlRef?: string;
  metadata?: Record<string, unknown>;
}) {
  logger.info(message, {
    module: "security",
    dataClassification: "restricted",
    ...context,
  });
}

/** Log a data access event (SOC 2 CC6.1) */
export function logDataAccess(message: string, context: {
  userId?: number;
  userName?: string;
  traceId?: string;
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  metadata?: Record<string, unknown>;
}) {
  logger.info(message, {
    module: "data-access",
    controlRef: "SOC2-CC6.1",
    ...context,
  });
}

/** Log a configuration change (ISO 27001 A.12.1.2) */
export function logConfigChange(message: string, context: {
  userId?: number;
  userName?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}) {
  logger.warn(message, {
    module: "config",
    dataClassification: "restricted",
    controlRef: "ISO27001-A.12.1.2",
    ...context,
  });
}
