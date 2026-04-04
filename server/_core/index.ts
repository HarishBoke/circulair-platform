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
  // Security headers + rate limiting
  applySecurityMiddleware(app);
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
  // Swagger UI redirect
  app.get("/api/docs", (_req, res) => res.redirect("/api/v1/docs"));
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
