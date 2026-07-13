import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes, registerPasswordResetRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { attachTelemetrySocket, stopAllSimulations } from "../telemetrySocket";
import { applySecurityMiddleware } from "../security";
import { startMqttSubscriber, stopMqttSubscriber } from "../mqttSubscriber";
import { createApiGateway } from "../apiGateway";
import { createMcpRouter } from "../mcpServer";
import { createSitemapRouter } from "../sitemap";
import { handleStripeWebhook } from "../stripe";
import { openapiSpec as trpcOpenapiSpec } from "../openapi";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust the first proxy hop (Manus reverse proxy / Cloudflare)
  // Required for express-rate-limit to correctly identify client IPs from X-Forwarded-For
  app.set("trust proxy", 1);
  // Security headers + rate limiting
  applySecurityMiddleware(app);
  // Stripe webhook MUST be registered with raw body BEFORE express.json() middleware
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    try {
      const result = await handleStripeWebhook(req.body as Buffer, signature);
      res.json(result);
    } catch (err) {
      console.error("[Stripe Webhook] Error:", err);
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Custom JWT auth routes under /api/auth/*
  registerAuthRoutes(app);
  // Forgot / reset password routes
  registerPasswordResetRoutes(app);
  // REST API v1 Gateway (microservices)
  app.use("/api/v1", createApiGateway());
  // MCP Server (Model Context Protocol for AI agents)
  app.use("/api/mcp", createMcpRouter());
  // Health check endpoint (used by Render and load balancers)
  app.get("/api/health", async (_req, res) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    const dbUrl = process.env.DATABASE_URL || "";
    const dbType = dbUrl.startsWith("postgres") ? "postgresql" : dbUrl.startsWith("mysql") ? "mysql" : "unknown";
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: db ? "connected" : "disconnected",
      dbType,
      env: process.env.NODE_ENV || "development",
    });
  });
  // Admin bootstrap endpoint — promotes a user to admin role using a shared secret
  // Usage: POST /api/admin/bootstrap-admin with { secret, email }
  app.post("/api/admin/bootstrap-admin", express.json(), async (req, res) => {
    const { secret, email } = req.body || {};
    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret || !secret || secret !== bootstrapSecret) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }
    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }
      const result = await db.update(users).set({ role: "admin" }).where(eq(users.email, email)).returning({ id: users.id, email: users.email, role: users.role });
      if (result.length === 0) { res.status(404).json({ error: "User not found" }); return; }
      res.json({ success: true, user: result[0] });
    } catch (err) {
      console.error("[AdminBootstrap] Error:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });
  // Swagger UI redirect
  app.get("/api/docs", (_req, res) => res.redirect("/api/v1/docs"));
  // tRPC OpenAPI JSON spec — served at /api/trpc/openapi.json
  app.get("/api/trpc/openapi.json", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(trpcOpenapiSpec);
  });
  // tRPC Swagger UI — served at /api/trpc/docs
  app.get("/api/trpc/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Circul-AI-r tRPC API \u2014 Full Reference</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0f0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1280px; margin: 0 auto; }
    .api-nav { background: #0d1f17; border-bottom: 1px solid #1a3a28; padding: 12px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .api-nav a { color: #4ade80; text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 6px; border: 1px solid #1a3a28; white-space: nowrap; }
    .api-nav a:hover { background: #1a3a28; }
    .api-nav .active { background: #166534; border-color: #4ade80; }
    .api-nav .brand { color: #4ade80; font-weight: 700; font-size: 15px; margin-right: 8px; white-space: nowrap; }
    .api-nav .badge { background: #166534; color: #4ade80; font-size: 11px; padding: 2px 7px; border-radius: 10px; margin-left: 4px; }
  </style>
</head>
<body>
  <div class="api-nav">
    <span class="brand">Circul-AI-r API Docs</span>
    <a href="/api/v1/docs">REST API v1 (Bearer Token)</a>
    <a href="/api/trpc/docs" class="active">tRPC API (Session Cookie)<span class="badge">130+ endpoints</span></a>
    <a href="/api/v1/openapi.json" target="_blank">REST OpenAPI JSON</a>
    <a href="/api/trpc/openapi.json" target="_blank">tRPC OpenAPI JSON</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/trpc/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      tryItOutEnabled: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      withCredentials: true,
    });
  </script>
</body>
</html>`);
  });
  // Sitemap.xml for SEO
  app.use(createSitemapRouter());
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Attach Socket.io telemetry namespace
  attachTelemetrySocket(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Start real MQTT subscriber if MQTT_BROKER_URL is configured
  startMqttSubscriber();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    stopAllSimulations();
    stopMqttSubscriber();
    server.close();
  });
  process.on("SIGINT", () => {
    stopAllSimulations();
    stopMqttSubscriber();
    server.close();
    process.exit(0);
  });
}

startServer().catch(console.error);
