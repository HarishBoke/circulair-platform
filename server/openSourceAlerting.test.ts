import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenSourceAlertingAdapter, type OpenSourceAlertEvent } from './openSourceAlerting';

const env = {
  OPEN_SOURCE_ALERTING_ENABLED: 'true',
  ALERTMANAGER_ORIGIN: 'https://alerts.example.net',
  ALERTMANAGER_ALLOWED_ORIGINS: 'https://alerts.example.net',
  ALERTMANAGER_USERNAME: 'publisher',
  ALERTMANAGER_PASSWORD: 'offline-only-random-password-1234',
  ALERTING_APPLICATION_ORIGIN: 'https://app.example.org',
  ALERTING_ENVIRONMENT: 'production',
};
const event: OpenSourceAlertEvent = {
  incidentId: '123e4567-e89b-42d3-a456-426614174000',
  action: 'trigger', category: 'operational',
  startedAt: '2026-11-17T19:00:00.000Z', provenance: 'live',
};
function fixture(overrides: NodeJS.ProcessEnv = {}, status = 200, headers: Record<string, string> = {}) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status, headers }));
  return { fetcher, adapter: createOpenSourceAlertingAdapter({ ...env, ...overrides }, fetcher) };
}
function body(fetcher: ReturnType<typeof fixture>['fetcher'], call = 0) {
  return JSON.parse(fetcher.mock.calls[call][1]!.body as string)[0];
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('open-source alert adapter (mocked offline)', () => {
  it('is disabled and unconfigured with an explicitly empty environment and does not fetch', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = createOpenSourceAlertingAdapter({}, fetcher);
    expect(adapter.enabled).toBe(false);
    expect(adapter.configured).toBe(false);
    expect(await adapter.send(event)).toEqual({ accepted: false, retryable: false, code: 'disabled' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires exact opt-in even if configuration is otherwise complete', async () => {
    const { adapter, fetcher } = fixture({ OPEN_SOURCE_ALERTING_ENABLED: 'TRUE' });
    expect(adapter.configured).toBe(true);
    expect(adapter.enabled).toBe(false);
    expect((await adapter.send(event)).code).toBe('disabled');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    'http://alerts.example.net', 'https://user:password@alerts.example.net',
    'https://alerts.example.net?credential=secret', 'https://alerts.example.net#secret',
    'https://alerts.example.net/path', 'https://alerts.example.net:9443',
    'https://127.0.0.1', 'https://[::1]', 'https://localhost',
    'https://monitor.internal', 'https://monitor.local', 'https://alerts.example.net.',
    'https://bad_host.example.net', ' https://alerts.example.net',
  ])('rejects unsafe origin %s without fetching', async origin => {
    const { adapter, fetcher } = fixture({ ALERTMANAGER_ORIGIN: origin, ALERTMANAGER_ALLOWED_ORIGINS: origin });
    expect((await adapter.send(event)).code).toBe('invalid_configuration');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { ALERTMANAGER_ALLOWED_ORIGINS: '' },
    { ALERTMANAGER_ALLOWED_ORIGINS: 'https://other.example.net' },
    { ALERTMANAGER_ALLOWED_ORIGINS: 'https://alerts.example.net,not-a-url' },
    { ALERTING_APPLICATION_ORIGIN: 'https://app.example.org/alerts' },
    { ALERTMANAGER_USERNAME: 'user:other' },
    { ALERTMANAGER_PASSWORD: 'too-short' },
    { ALERTMANAGER_PASSWORD: 'long-enough-but\nnewlines' },
    { ALERTMANAGER_PASSWORD: 'x'.repeat(257) },
    { ALERTING_ENVIRONMENT: 'development' },
  ])('fails closed for invalid admin config %#', async overrides => {
    const { adapter, fetcher } = fixture(overrides);
    expect(adapter.enabled).toBe(false);
    expect((await adapter.send(event)).code).toBe('invalid_configuration');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('posts exact v2 shape using Basic auth in the header with a bounded timeout and no redirect following', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const { adapter, fetcher } = fixture();
    expect(await adapter.send(event)).toEqual({ accepted: true, retryable: false, code: 'accepted', httpStatus: 200 });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://alerts.example.net/api/v2/alerts');
    expect(init!.method).toBe('POST');
    expect(init!.redirect).toBe('error');
    expect(timeout).toHaveBeenCalledWith(6000);
    expect(init!.signal).toBeInstanceOf(AbortSignal);
    expect(init!.headers).toEqual({ 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`publisher:${env.ALERTMANAGER_PASSWORD}`).toString('base64')}` });
    expect(body(fetcher)).toEqual({
      labels: { alertname: 'ApplicationCriticalIncident', incident_id: event.incidentId, environment: 'production', application: 'https://app.example.org' },
      annotations: { summary: 'Critical application incident (operational)', category: 'operational' },
      startsAt: event.startedAt, generatorURL: 'https://app.example.org/alerts',
    });
    expect(Buffer.byteLength(init!.body as string)).toBeLessThanOrEqual(2048);
  });
  it('discards free text, identifiers, metadata and caller-supplied destinations', async () => {
    const { adapter, fetcher } = fixture();
    await adapter.send({ ...event, message: 'person@example.com', deviceId: 'private-device',
      metadata: { token: 'secret-device-token' }, endpoint: 'https://evil.example.org',
      labels: { secret: 'secret-label' }, generatorURL: 'https://evil.example.org' } as OpenSourceAlertEvent);
    const serialized = fetcher.mock.calls[0][1]!.body as string;
    for (const privateData of ['person@example.com', 'private-device', 'secret-device-token', 'evil.example.org', 'secret-label']) {
      expect(serialized).not.toContain(privateData);
    }
  });
  it('keeps trigger, refresh, category changes and resolve label identity stable', async () => {
    const { adapter, fetcher } = fixture();
    await adapter.send(event);
    await adapter.send({ ...event, incidentId: event.incidentId.toUpperCase(), category: 'security' });
    await adapter.send({ ...event, action: 'resolve', resolvedAt: '2026-11-17T19:05:00.000Z' });
    expect(body(fetcher, 0).labels).toEqual(body(fetcher, 1).labels);
    expect(body(fetcher, 0).labels).toEqual(body(fetcher, 2).labels);
    expect(body(fetcher, 0).endsAt).toBeUndefined();
    expect(body(fetcher, 2).endsAt).toBe('2026-11-17T19:05:00.000Z');
  });
  it('provides a stable opaque routing fingerprint but does not expose credentials', () => {
    const { adapter } = fixture();
    expect(adapter.destinationFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(adapter.destinationFingerprint).toBe(fixture().adapter.destinationFingerprint);
    expect(adapter.destinationFingerprint).not.toBe(fixture({ ALERTMANAGER_PASSWORD: 'different-offline-password-1234' }).adapter.destinationFingerprint);
    expect(adapter.destinationFingerprint).not.toBe(fixture({ ALERTING_APPLICATION_ORIGIN: 'https://other.example.org' }).adapter.destinationFingerprint);
    expect(JSON.stringify(adapter)).not.toContain(env.ALERTMANAGER_PASSWORD);
    expect(Object.isFrozen(adapter)).toBe(true);
  });
  it.each(['demo', 'simulated', 'test', undefined])('rejects non-live provenance %s', async provenance => {
    const { adapter, fetcher } = fixture();
    expect((await adapter.send({ ...event, provenance } as OpenSourceAlertEvent)).code).toBe('ineligible_event');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { incidentId: 'person@example.com' }, { incidentId: 'x'.repeat(10_000) },
    { category: 'arbitrary text' }, { action: 'acknowledge' },
    { startedAt: 'not-a-date' }, { startedAt: '2026-02-30T19:00:00.000Z' },
    { startedAt: '2026-11-17T19:00:00+00:00' },
    { resolvedAt: '2026-11-17T19:05:00.000Z' }, { action: 'resolve' },
    { action: 'resolve', resolvedAt: '2026-11-17T18:00:00.000Z' },
  ])('rejects invalid event %# without fetching', async overrides => {
    const { adapter, fetcher } = fixture();
    expect((await adapter.send({ ...event, ...overrides } as OpenSourceAlertEvent)).code).toBe('invalid_event');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([202, 204, 400, 401, 403, 404])('does not accept undocumented success or permanent response %s', async status => {
    const { adapter } = fixture({}, status);
    expect(await adapter.send(event)).toEqual({ accepted: false, retryable: false, code: 'http_error', httpStatus: status, retryAfterMs: 0 });
  });
  it.each([301, 302, 307, 308])('rejects redirects %s without a second request', async status => {
    const { adapter, fetcher } = fixture({}, status, { location: 'https://other.example.org' });
    expect((await adapter.send(event)).code).toBe('redirect_rejected');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([429, 500, 503])('returns retryable errors for %s and bounds Retry-After', async status => {
    const { adapter } = fixture({}, status, { 'retry-after': '999999999' });
    expect(await adapter.send(event)).toEqual({ accepted: false, retryable: true, code: 'http_error', httpStatus: status, retryAfterMs: 3_600_000 });
  });
  it('supports date Retry-After and ignores invalid values', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-17T19:00:00.000Z'));
    expect((await fixture({}, 429, { 'retry-after': 'Tue, 17 Nov 2026 19:01:00 GMT' }).adapter.send(event)).retryAfterMs).toBe(60_000);
    expect((await fixture({}, 429, { 'retry-after': 'secret upstream text' }).adapter.send(event)).retryAfterMs).toBe(0);
  });
  it('sanitizes thrown errors and never logs credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(`secret ${env.ALERTMANAGER_PASSWORD}`));
    const log = vi.spyOn(console, 'log');
    const info = vi.spyOn(console, 'info');
    const error = vi.spyOn(console, 'error');
    const adapter = createOpenSourceAlertingAdapter(env, fetcher);
    expect(await adapter.send(event)).toEqual({ accepted: false, retryable: true, code: 'network_or_timeout' });
    expect(log).not.toHaveBeenCalled(); expect(info).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  });
  it('uses an abort signal that ends a stalled mocked fetch at the configured timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = createOpenSourceAlertingAdapter(env, fetcher).send(event);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await pending).toEqual({ accepted: false, retryable: true, code: 'network_or_timeout' });
  });
  it('does not read or persist the upstream response body', async () => {
    const text = vi.fn().mockRejectedValue(new Error('must not read'));
    const json = vi.fn().mockRejectedValue(new Error('must not read'));
    const cancel = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue({ status: 503, headers: new Headers(), text, json, body: { cancel } } as unknown as Response);
    expect((await createOpenSourceAlertingAdapter(env, fetcher).send(event)).code).toBe('http_error');
    expect(text).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  });
});
