/** A single query-backed observation, never overall uptime or integration acceptance. */
export function isPostgresProbeReady(httpStatus: number, body: unknown): boolean {
  if (httpStatus !== 200 || body === null || typeof body !== "object" || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  return value.status === "ok" && value.db === "connected" && value.dbType === "postgresql";
}
