import { defineConfig } from "drizzle-kit";

// Render PostgreSQL internal URL (fallback when DATABASE_URL is MySQL/TiDB)
const RENDER_PG_INTERNAL = 'postgresql://circulair_user:wKbtM8fh9EfLkjnLkoYqzL7EouQlTTSC@dpg-d95qdlcvikkc73e2aeig-a/circulair_production';

function resolveConnectionUrl(): string {
  const renderDbUrl = process.env.RENDER_DATABASE_URL;
  if (renderDbUrl && renderDbUrl.startsWith('postgres')) return renderDbUrl;
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgres')) return dbUrl;
  if (dbUrl.startsWith('mysql://') || dbUrl.includes('tidbcloud.com') || !dbUrl) return RENDER_PG_INTERNAL;
  return dbUrl;
}

const connectionString = resolveConnectionUrl();
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
