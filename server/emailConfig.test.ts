import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('native email environment configuration', () => {
  it('defaults to disabled token and existing sender when service env absent', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', undefined); vi.stubEnv('FROM_EMAIL', undefined); vi.stubEnv('RESEND_FROM_EMAIL', undefined); vi.stubEnv('OWNER_EMAIL', undefined); vi.resetModules();
    const { ENV } = await import('./_core/env'); expect(ENV.zeptomailToken).toBe(''); expect(ENV.fromEmail).toBe('noreply@circulair.energy'); expect(ENV.ownerEmail).toBe(''); const { validateEmailConfig } = await import('./email'); expect(validateEmailConfig()).toBe(false);
  });
  it('uses explicit native sender and synthetic token without provider substitution', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'Zoho-enczapikey synthetic-local-token'); vi.stubEnv('FROM_EMAIL', 'qa-sender@yopmail.com'); vi.stubEnv('OWNER_EMAIL', 'aimbim@yopmail.com'); vi.resetModules();
    const { ENV } = await import('./_core/env'); expect(ENV.fromEmail).toBe('qa-sender@yopmail.com'); expect(ENV.ownerEmail).toBe('aimbim@yopmail.com'); const { validateEmailConfig } = await import('./email'); expect(validateEmailConfig()).toBe(true);
  });
  it('retains legacy sender-variable alias only; no Resend API transport', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'Zoho-enczapikey synthetic-local-token'); vi.stubEnv('FROM_EMAIL', undefined); vi.stubEnv('OWNER_EMAIL', undefined); vi.stubEnv('RESEND_FROM_EMAIL', 'qa-sender@yopmail.com'); vi.resetModules();
    const { ENV } = await import('./_core/env'); expect(ENV.fromEmail).toBe('qa-sender@yopmail.com'); expect(ENV.ownerEmail).toBe('qa-sender@yopmail.com');
  });
  it('explicitly negative malformed sender fails config validation', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'Zoho-enczapikey synthetic-local-token'); vi.stubEnv('FROM_EMAIL', 'negative-malformed-address'); vi.resetModules(); const { validateEmailConfig } = await import('./email'); expect(validateEmailConfig()).toBe(false);
  });
});
