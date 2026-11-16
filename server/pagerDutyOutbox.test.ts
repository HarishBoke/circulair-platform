import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('./db', () => ({ getDb: vi.fn().mockResolvedValue(null) }));
import { processPagerDutyOutbox, getPagerDutyStatus, type OutboxRow, type OutboxStore } from './pagerDutyOutbox';
import { pagerDutyConfig, type PagerDutyEvent } from './pagerDuty';
const key = 'b'.repeat(32);
const event = { event_action: 'trigger', dedup_key: 'test-dedup', payload: { summary: 'test', source: 'test', severity: 'critical' } } as PagerDutyEvent;
let row: OutboxRow;
beforeEach(() => {
  vi.stubEnv('PAGERDUTY_ENABLED', 'true'); vi.stubEnv('PAGERDUTY_ROUTING_KEY', key);
  row = { id: 1, alertId: 3, event, routingFingerprint: pagerDutyConfig().routingFingerprint, attempts: 1, leaseToken: 'lease' };
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function store(rows = [row]): OutboxStore { return { claim: vi.fn().mockResolvedValue(rows), finish: vi.fn().mockResolvedValue(undefined) }; }
describe('durable PagerDuty outbox', () => {
  it('does not read or send while disabled', async () => {
    vi.stubEnv('PAGERDUTY_ENABLED', 'false'); const db = store(); const send = vi.fn();
    expect(await processPagerDutyOutbox(10, db, send)).toEqual({ enabled: false, attempted: 0, accepted: 0 }); expect(db.claim).not.toHaveBeenCalled();
  });
  it('limits each drain to ten rows', async () => { const db = store([]); await processPagerDutyOutbox(100, db, vi.fn()); expect(db.claim).toHaveBeenCalledWith(10); });
  it('records Events API acceptance instead of claiming an on-call notification', async () => {
    const db = store(); const send = vi.fn().mockResolvedValue({ accepted: true, retryable: false, code: 'accepted', httpStatus: 202 });
    expect(await processPagerDutyOutbox(1, db, send)).toEqual({ enabled: true, attempted: 1, accepted: 1 });
    expect(db.finish).toHaveBeenCalledWith(row, expect.objectContaining({ code: 'accepted' }), expect.any(Date));
  });
  it('stores retryable failures for a later independent drain', async () => {
    const db = store(); const send = vi.fn().mockResolvedValue({ accepted: false, retryable: true, code: 'http_429' });
    await processPagerDutyOutbox(1, db, send); expect(db.finish).toHaveBeenCalledWith(row, expect.objectContaining({ retryable: true }), expect.any(Date));
  });
  it('quarantines a queued event after routing-key rotation instead of rerouting it', async () => {
    const db = store([{ ...row, routingFingerprint: 'old-integration' }]); const send = vi.fn();
    await processPagerDutyOutbox(1, db, send); expect(send).not.toHaveBeenCalled(); expect(db.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ code: 'routing_key_changed' }), expect.any(Date));
  });
  it('never logs credentials or private event bodies', async () => {
    await processPagerDutyOutbox(1, store(), vi.fn().mockResolvedValue({ accepted: false, retryable: false, code: 'http_400' }));
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(key); expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('test-dedup');
  });
  it('reports unready schema without fabricated green status', async () => expect(await getPagerDutyStatus()).toMatchObject({ outboxReady: false }));
  it('never returns the routing key in configuration status', async () => expect(JSON.stringify(await getPagerDutyStatus())).not.toContain(key));
});
