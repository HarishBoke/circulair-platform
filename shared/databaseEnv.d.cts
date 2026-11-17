export function resolvePostgresConnectionUrl(env: {
  [key: string]: string | undefined;
  RENDER_DATABASE_URL?: string;
  DATABASE_URL?: string;
}): string;
