import { defineConfig } from "drizzle-kit";
import { resolvePostgresConnectionUrl } from "./shared/databaseEnv.cjs";

const connectionString = resolvePostgresConnectionUrl(process.env);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
