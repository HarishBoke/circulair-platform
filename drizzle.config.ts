import { defineConfig } from "drizzle-kit";
import { resolvePostgresConnectionUrl } from "./shared/databaseEnv.cjs";

const connectionString = resolvePostgresConnectionUrl(process.env);

export default defineConfig({
  // Pilot SQL-only guards require the separately reviewed apply-once migration;
  // schema discovery is not authorization to generate/push/apply tables.
  // Incidents are additive discovery only; no production SQL or paging activation.
  schema: ["./drizzle/schema.ts", "./drizzle/pilotSchema.ts", "./drizzle/incidentSchema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
