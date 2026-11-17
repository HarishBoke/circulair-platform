import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

/** No DB, timers, workers or environment reads at import time. Application integration is deliberately absent. */
export type OpenSourceAlertEvent = {
  // Generate once and persist with the incident; never derive from a person/device identifier.
  incidentId: string;
  action: 'trigger' | 'resolve';
  category: 'availability' | 'telemetry' | 'security' | 'operational';
  startedAt: string;
  resolvedAt?: string;
  provenance: 'live' | 'demo' | 'simulated' | 'test';
};

export type OpenSourceDeliveryResult = {
  accepted: boolean;
  retryable: boolean;
  code: 'disabled' | 'invalid_configuration' | 'invalid_event' | 'ineligible_event'
    | 'accepted' | 'http_error' | 'redirect_rejected' | 'network_or_timeout';
  httpStatus?: number;
  retryAfterMs?: number;
};

export type OpenSourceAlertingAdapter = Readonly<{
  enabled: boolean;
  configured: boolean;
  // Pin in the durable outbox row; mismatches require operator review, not silent rerouting.
  destinationFingerprint: string | null;
  send(event: OpenSourceAlertEvent): Promise<OpenSourceDeliveryResult>;
}>;

const CATEGORIES = new Set(['availability', 'telemetry', 'security', 'operational']);
const TIMEOUT_MS = 6000;
const MAX_PAYLOAD_BYTES = 2048;
const MAX_RETRY_AFTER_MS = 3_600_000;

function canonicalPublicOrigin(value: string | undefined): string | null {
  if (!value || value.length > 256 || value !== value.trim() || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/' || url.port || isIP(host) || host.includes(':')
      || !host.includes('.') || host.endsWith('.')
      || /(^|\.)(localhost|local|internal|lan|home|onion)$/.test(host)
      || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    return url.origin;
  } catch { return null; }
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 32
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

function retryAfterMs(value: string | null): number {
  if (!value || value.length > 128) return 0;
  const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.min(MAX_RETRY_AFTER_MS, Math.max(0, delay)) : 0;
}

/**
 * Server-admin environment only. Do not pass request bodies, tenant settings or a client-supplied URL here.
 * Pin approved DNS and enforce network egress rules at deployment; origin allowlisting is not DNS-rebinding protection.
 * Basic auth matches Alertmanager's native web config and Caddy. Never return/log credentials or upstream text.
 */
export function createOpenSourceAlertingAdapter(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): OpenSourceAlertingAdapter {
  const requested = env.OPEN_SOURCE_ALERTING_ENABLED === 'true';
  const origin = canonicalPublicOrigin(env.ALERTMANAGER_ORIGIN);
  const appOrigin = canonicalPublicOrigin(env.ALERTING_APPLICATION_ORIGIN);
  const rawAllowed = env.ALERTMANAGER_ALLOWED_ORIGINS ?? '';
  const allowed = rawAllowed.length <= 2048 ? rawAllowed.split(',').map(item => canonicalPublicOrigin(item.trim())) : [];
  const username = env.ALERTMANAGER_USERNAME ?? '';
  const password = env.ALERTMANAGER_PASSWORD ?? '';
  const environment = env.ALERTING_ENVIRONMENT ?? 'production';
  const configured = Boolean(origin && appOrigin && allowed.length > 0 && allowed.every(Boolean)
    && allowed.includes(origin) && /^[A-Za-z0-9_-]{1,64}$/.test(username)
    && password.length >= 16 && password.length <= 256 && /^[\x21-\x7e]+$/.test(password)
    && ['production', 'staging'].includes(environment));
  const enabled = requested && configured;
  const destinationFingerprint = configured
    ? createHash('sha256').update(JSON.stringify([origin, appOrigin, environment, username, password])).digest('hex')
    : null;
  // Keep credentials in this closure only. No exported mutable configuration can bypass the origin gate.
  const authorization = enabled ? `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}` : '';

  return Object.freeze({
    enabled,
    configured,
    destinationFingerprint,
    async send(event: OpenSourceAlertEvent): Promise<OpenSourceDeliveryResult> {
      if (!requested) return { accepted: false, retryable: false, code: 'disabled' };
      if (!enabled) return { accepted: false, retryable: false, code: 'invalid_configuration' };
      // Only opaque incident UUIDs and enumerated categories leave the application. All extra fields are ignored.
      if (!event || typeof event !== 'object' || typeof event.incidentId !== 'string'
        || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(event.incidentId)
        || !['trigger', 'resolve'].includes(event.action) || !CATEGORIES.has(event.category)
        || !validTime(event.startedAt)
        || (event.action === 'trigger' && event.resolvedAt !== undefined)
        || (event.action === 'resolve' && (!validTime(event.resolvedAt) || Date.parse(event.resolvedAt) < Date.parse(event.startedAt)))) {
        return { accepted: false, retryable: false, code: 'invalid_event' };
      }
      if (event.provenance !== 'live') return { accepted: false, retryable: false, code: 'ineligible_event' };
      // Labels are identical for trigger, refresh and resolve; do not add status, timestamps or severity changes to labels.
      const alert = {
        labels: {
          alertname: 'ApplicationCriticalIncident',
          incident_id: event.incidentId.toLowerCase(),
          environment,
          application: appOrigin!,
        },
        annotations: {
          summary: `Critical application incident (${event.category})`,
          category: event.category,
        },
        startsAt: event.startedAt,
        ...(event.action === 'resolve' ? { endsAt: event.resolvedAt } : {}),
        generatorURL: `${appOrigin}/alerts`,
      };
      const body = JSON.stringify([alert]);
      if (Buffer.byteLength(body, 'utf8') > MAX_PAYLOAD_BYTES) {
        return { accepted: false, retryable: false, code: 'invalid_event' };
      }
      try {
        const response = await fetcher(`${origin}/api/v2/alerts`, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'Content-Type': 'application/json', Authorization: authorization },
          body,
        });
        // Never buffer or parse the response body, which is not needed by this API and may contain secrets.
        // Cancel without awaiting: an untrusted slow response stream must not hold up the durable outbox.
        try { void response.body?.cancel().catch(() => undefined); } catch { /* no response text is retained */ }
        if (response.status === 200) return { accepted: true, retryable: false, code: 'accepted', httpStatus: 200 };
        if (response.status >= 300 && response.status < 400) {
          return { accepted: false, retryable: false, code: 'redirect_rejected', httpStatus: response.status };
        }
        return {
          accepted: false,
          retryable: response.status === 429 || response.status >= 500,
          code: 'http_error',
          httpStatus: response.status,
          retryAfterMs: retryAfterMs(response.headers.get('retry-after')),
        };
      } catch {
        // Timeout/connection failure (including fetch rejecting a redirect) is delivery-ambiguous.
        // Stable receiver-side labels make durable retries safe from creating a different incident.
        return { accepted: false, retryable: true, code: 'network_or_timeout' };
      }
    },
  });
}
