import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Alert } from '../drizzle/schema';
import { pagerDutyConfig, shouldPageAlert, makePagerDutyEvent, retryDelay, sendPagerDutyEvent } from './pagerDuty';
const key = 'a'.repeat(32);
const config = pagerDutyConfig({ PAGERDUTY_ENABLED: 'true', PAGERDUTY_ROUTING_KEY: key, APP_URL: 'https://circulair.energy', NODE_ENV: 'production' });
const alert: Alert = { id: 12, userId: 7, batteryId: 22, bpan: 'INQATA1FLAINDA00000001', type: 'thermal_anomaly', severity: 'critical',
  title: 'private@example.invalid', message: 'password=do-not-send', metadata: { tMax: 65, email: 'private@example.invalid', devicePassword: 'do-not-send' },
  read: false, acknowledged: false, createdAt: new Date('2026-11-16T10:00:00Z') };
const event = makePagerDutyEvent(alert, config);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('PagerDuty safe configuration and payload', () => {
  it('is disabled by default', () => expect(pagerDutyConfig({}).enabled).toBe(false));
  it('requires explicit opt-in even when a key exists', () => expect(pagerDutyConfig({ PAGERDUTY_ROUTING_KEY: key }).enabled).toBe(false));
  it('rejects malformed routing keys', () => expect(pagerDutyConfig({ PAGERDUTY_ENABLED: 'true', PAGERDUTY_ROUTING_KEY: 'bad' }).enabled).toBe(false));
  it('uses the exact US endpoint', () => expect(config.endpoint).toBe('https://events.pagerduty.com/v2/enqueue'));
  it('supports the EU endpoint', () => expect(pagerDutyConfig({ PAGERDUTY_REGION: 'eu' }).endpoint).toBe('https://events.eu.pagerduty.com/v2/enqueue'));
  it('rejects unknown regions rather than arbitrary endpoints', () => expect(pagerDutyConfig({ PAGERDUTY_ENABLED: 'true', PAGERDUTY_ROUTING_KEY: key, PAGERDUTY_REGION: 'attacker' }).enabled).toBe(false));
  it('only pages critical alerts', () => expect(shouldPageAlert({ ...alert, severity: 'warning' })).toBe(false));
  it.each(['simulator', 'demo', 'flow_tester'])('does not page %s telemetry', source => expect(shouldPageAlert({ ...alert, metadata: { source } })).toBe(false));
  it('does not page explicit simulated data', () => expect(shouldPageAlert({ ...alert, metadata: { simulated: true } })).toBe(false));
  it('uses a stable per-alert deduplication key', () => expect(makePagerDutyEvent(alert, config).dedup_key).toBe(event.dedup_key));
  it('separates staging and production', () => expect(makePagerDutyEvent(alert, { ...config, environment: 'staging' }).dedup_key).not.toBe(event.dedup_key));
  it('does not persist routing keys in the event', () => expect(JSON.stringify(event)).not.toContain(key));
  it('omits private free text and arbitrary metadata', () => { expect(JSON.stringify(event)).not.toContain('private@example'); expect(JSON.stringify(event)).not.toContain('do-not-send'); });
  it('preserves whitelisted numeric telemetry', () => expect(event.payload.custom_details.tMax).toBe(65));
  it('rejects invalid alert identifiers', () => expect(() => makePagerDutyEvent({ ...alert, id: 0 }, config)).toThrow());
  it('caps retry delay', () => expect(retryDelay(100, 99_999_999)).toBe(3_600_000));
  it('honors retry-after without a busy retry loop', () => expect(retryDelay(1, 180_000)).toBe(180_000));
});
describe('PagerDuty Events v2 delivery', () => {
  it('never sends when disabled', async () => { const sender = vi.fn(); await sendPagerDutyEvent(event, { ...config, enabled: false }, sender); expect(sender).not.toHaveBeenCalled(); });
  it('accepts only documented 202 acceptance', async () => {
    const sender = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }));
    expect(await sendPagerDutyEvent(event, config, sender)).toMatchObject({ accepted: true, code: 'accepted' });
    const [url, options] = sender.mock.calls[0]; expect(url).toBe(config.endpoint); expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body).routing_key).toBe(key);
  });
  it.each([200, 400, 401, 403])('does not call HTTP %s success or retry it', async status => {
    const result = await sendPagerDutyEvent(event, config, vi.fn().mockResolvedValue(new Response('private-secret', { status })));
    expect(result.accepted).toBe(false); expect(result.retryable).toBe(false); expect(JSON.stringify(result)).not.toContain('private-secret');
  });
  it('retries 429 with the service delay', async () => {
    const result = await sendPagerDutyEvent(event, config, vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '120' } })));
    expect(result).toMatchObject({ retryable: true, retryAfterMs: 120_000 });
  });
  it('retries server errors', async () => expect(await sendPagerDutyEvent(event, config, vi.fn().mockResolvedValue(new Response('', { status: 503 })))).toMatchObject({ retryable: true }));
  it('retries network failures without leaking exception secrets', async () => {
    const result = await sendPagerDutyEvent(event, config, vi.fn().mockRejectedValue(new Error(`credential ${key}`)));
    expect(result).toMatchObject({ code: 'network_or_timeout', retryable: true }); expect(JSON.stringify(result)).not.toContain(key);
  });
});
