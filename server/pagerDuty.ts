import { createHash } from 'node:crypto';
import type { Alert } from '../drizzle/schema';
import { getApplicationOrigin } from './requestSecurity';

export type PagerDutyConfig = {
  enabled: boolean; configured: boolean; region: 'us' | 'eu'; endpoint: string;
  routingKey: string; routingFingerprint: string; environment: string; appUrl: string;
};
export type PagerDutyEvent = {
  event_action: 'trigger'; dedup_key: string; client: string; client_url: string;
  payload: { summary: string; source: string; severity: 'critical'; timestamp: string;
    component: string; class: string; custom_details: Record<string, string | number> };
  links: { href: string; text: string }[];
};
export type DeliveryResult = { accepted: boolean; retryable: boolean; code: string; httpStatus?: number; retryAfterMs?: number };
const ENDPOINTS = { us: 'https://events.pagerduty.com/v2/enqueue', eu: 'https://events.eu.pagerduty.com/v2/enqueue' };
export const MAX_DELIVERY_ATTEMPTS = 8;

export function pagerDutyConfig(env: NodeJS.ProcessEnv = process.env): PagerDutyConfig {
  const routingKey = (env.PAGERDUTY_ROUTING_KEY ?? '').trim();
  const region = env.PAGERDUTY_REGION === 'eu' ? 'eu' : 'us';
  const configured = /^[A-Za-z0-9]{32}$/.test(routingKey) && (!env.PAGERDUTY_REGION || ['us', 'eu'].includes(env.PAGERDUTY_REGION));
  const environment = (env.PAGERDUTY_ENVIRONMENT ?? env.NODE_ENV ?? 'development').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'development';
  return { enabled: env.PAGERDUTY_ENABLED === 'true' && configured, configured, region, endpoint: ENDPOINTS[region], routingKey,
    routingFingerprint: createHash('sha256').update(routingKey).digest('hex').slice(0, 24), environment,
    appUrl: getApplicationOrigin(env) };
}

export function shouldPageAlert(alert: Pick<Alert, 'severity' | 'metadata' | 'type'>): boolean {
  if (alert.severity !== 'critical') return false;
  const metadata = alert.metadata as Record<string, unknown> | null;
  const source = String(metadata?.source ?? '').toLowerCase();
  return metadata?.demo !== true && metadata?.simulated !== true && !/(simulat|demo|test)/i.test(source)
    && !/(simulat|demo|test)/i.test(alert.type);
}

export function makePagerDutyEvent(alert: Alert, config: PagerDutyConfig): PagerDutyEvent {
  if (!Number.isSafeInteger(alert.id) || alert.id <= 0 || !shouldPageAlert(alert)) throw new Error('Alert is not eligible for paging');
  const type = alert.type.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'critical_alert';
  const host = new URL(config.appUrl).hostname;
  // Do not send free-text title/message, arbitrary metadata, user IDs, email, device credentials or tokens.
  const details: Record<string, string | number> = { alertId: alert.id, alertType: type };
  if (alert.bpan && /^[A-Za-z0-9]{19,21}$/.test(alert.bpan)) details.bpan = alert.bpan;
  if (alert.batteryId && Number.isSafeInteger(alert.batteryId)) details.batteryId = alert.batteryId;
  const metadata = alert.metadata as Record<string, unknown> | null;
  for (const key of ['tMax', 'tMin', 'tPack', 'soh', 'soc', 'threshold', 'value']) {
    const value = metadata?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) details[key] = value;
  }
  return { event_action: 'trigger', dedup_key: `circulair:${host}:${config.environment}:alert:${alert.id}`, client: 'Circul-AI-r', client_url: config.appUrl,
    payload: { summary: `Circul-AI-r critical incident: ${type}`, source: `${host}/${config.environment}`, severity: 'critical',
      timestamp: new Date(alert.createdAt).toISOString(), component: 'battery-platform', class: type, custom_details: details },
    links: [{ href: `${config.appUrl}/alerts`, text: 'Open authenticated Circul-AI-r alerts' }] };
}

export function retryDelay(attempt: number, retryAfterMs = 0): number {
  return Math.min(3_600_000, Math.max(60_000 * 2 ** Math.max(0, attempt - 1), retryAfterMs));
}

export async function sendPagerDutyEvent(event: PagerDutyEvent, config: PagerDutyConfig, fetcher: typeof fetch = fetch): Promise<DeliveryResult> {
  if (!config.enabled) return { accepted: false, retryable: false, code: 'disabled_or_unconfigured' };
  try {
    const response = await fetcher(config.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...event, routing_key: config.routingKey }) });
    if (response.status === 202) return { accepted: true, retryable: false, code: 'accepted', httpStatus: 202 };
    const retryAfter = response.headers.get('retry-after');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    const retryAfterMs = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.now()) : 0;
    // Never persist/log the upstream body or exception message: either may contain secrets.
    return { accepted: false, retryable: response.status === 429 || response.status >= 500,
      code: `http_${response.status}`, httpStatus: response.status, retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : 0 };
  } catch {
    return { accepted: false, retryable: true, code: 'network_or_timeout' };
  }
}
