import { describe, it, expect, vi, afterEach } from 'vitest';
import { appRouter } from './routers';
afterEach(() => vi.unstubAllEnvs());
const caller = (user: any) => appRouter.createCaller({ req: {} as any, res: {} as any, user });
describe('PagerDuty administrator status', () => {
  it('rejects anonymous callers', async () => expect(caller(null).pagerDuty.status()).rejects.toMatchObject({ code: 'FORBIDDEN' }));
  it('rejects ordinary users', async () => expect(caller({ id: 1, role: 'user', openId: 'qa' }).pagerDuty.status()).rejects.toMatchObject({ code: 'FORBIDDEN' }));
  it('returns safe status to administrators without exposing a configured key', async () => {
    vi.stubEnv('PAGERDUTY_ENABLED', 'false'); vi.stubEnv('PAGERDUTY_ROUTING_KEY', 'd'.repeat(32));
    const status = await caller({ id: 1, role: 'admin', openId: 'qa' }).pagerDuty.status();
    expect(status).toMatchObject({ enabled: false, configured: true, outboxReady: null });
    expect(JSON.stringify(status)).not.toContain('d'.repeat(32));
  });
});
