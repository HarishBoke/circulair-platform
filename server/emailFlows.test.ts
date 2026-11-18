import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const dbMock = vi.hoisted(() => ({ getUserByEmail: vi.fn(), createPasswordResetToken: vi.fn(), getDb: vi.fn(() => { throw new Error('UNEXPECTED_DATABASE'); }) }));
vi.mock('./db', async original => ({ ...await original<Record<string, unknown>>(), ...dbMock }));
vi.mock('./_core/env', () => ({ ENV: { zeptomailToken: 'Zoho-enczapikey synthetic-local-token', fromEmail: 'qa-sender@yopmail.com', ownerEmail: 'aimbim@yopmail.com', ownerName: 'QA Owner', isProduction: false } }));
import { ENV } from './_core/env';
import { registerPasswordResetRoutes } from './_core/auth';
const fetchMock = vi.fn(); const accepted = () => new Response(JSON.stringify({ data: [{ code: 'EM_104', message: 'OK' }], message: 'OK', request_id: 'req-local' }), { headers: { 'content-type': 'application/json' } });
function app() { const a = express(); a.use(express.json()); registerPasswordResetRoutes(a); return a; }
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset().mockImplementation(() => { throw new Error('UNEXPECTED_PROVIDER_FETCH'); }); vi.stubGlobal('fetch', fetchMock); vi.stubEnv('APP_URL', 'https://circulair.energy'); for (const method of ['log', 'warn', 'error'] as const) vi.spyOn(console, method).mockImplementation(() => {}); dbMock.getUserByEmail.mockResolvedValue({ id: 7, email: 'aimbim@yopmail.com', name: 'QA' }); dbMock.createPasswordResetToken.mockResolvedValue(undefined); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('actual native recovery route email flows', () => {
  it('sends reset once plus credential-free owner audit through the real native helpers', async () => {
    fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(accepted());
    const result = await request(app()).post('/api/auth/forgot-password').set('Origin', 'https://zoho.com/').send({ email: 'aimbim@yopmail.com' });
    expect(result.status).toBe(200); expect(result.body).toMatchObject({ success: true }); expect(result.body).not.toHaveProperty('token'); expect(result.body).not.toHaveProperty('resetUrl'); expect(fetchMock).toHaveBeenCalledTimes(2); expect(dbMock.createPasswordResetToken).toHaveBeenCalledOnce();
    const token = dbMock.createPasswordResetToken.mock.calls[0][0].token; expect(token).toMatch(/^[a-f0-9]{64}$/);
    const reset = JSON.parse(fetchMock.mock.calls[0][1].body); const audit = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(reset.textbody).toContain(`https://circulair.energy/reset-password?token=${token}`); expect(reset.textbody).not.toContain('https://zoho.com/'); expect(audit.textbody).not.toMatch(/token=|aimbim|reset-password\?/);
    expect(JSON.stringify([vi.mocked(console.log).mock.calls, vi.mocked(console.warn).mock.calls, vi.mocked(console.error).mock.calls])).not.toContain(token);
  });
  it('preserves generic 200 on ambiguous reset failure and does not retry the reset', async () => {
    fetchMock.mockRejectedValueOnce(new Error('synthetic-secret https://circulair.energy/reset?token=secret')).mockResolvedValueOnce(accepted());
    const result = await request(app()).post('/api/auth/forgot-password').send({ email: 'aimbim@yopmail.com' }); expect(result.status).toBe(200); expect(result.body.success).toBe(true); expect(fetchMock).toHaveBeenCalledTimes(2); const subjects = fetchMock.mock.calls.map(call => JSON.parse(call[1].body).subject); expect(subjects.filter(subject => subject === 'Reset your Circul-AI-r password')).toHaveLength(1); expect(subjects[1]).toContain('[Platform Alert]'); expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/synthetic-secret|yopmail|token=/);
  });
  it('preserves generic 200 when both native transports reject', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('', { status: 503 })); const result = await request(app()).post('/api/auth/forgot-password').send({ email: 'aimbim@yopmail.com' }); expect(result.status).toBe(200); expect(result.body.success).toBe(true); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('unknown account returns same generic response without transport or token', async () => {
    dbMock.getUserByEmail.mockResolvedValueOnce(undefined); const result = await request(app()).post('/api/auth/forgot-password').send({ email: 'aimbim@yopmail.com' }); expect(result.status).toBe(200); expect(result.body.success).toBe(true); expect(fetchMock).not.toHaveBeenCalled(); expect(dbMock.createPasswordResetToken).not.toHaveBeenCalled();
  });
  it('disabled native configuration returns generic 200 without transport', async () => {
    const token = ENV.zeptomailToken; try { ENV.zeptomailToken = ''; const result = await request(app()).post('/api/auth/forgot-password').send({ email: 'aimbim@yopmail.com' }); expect(result.status).toBe(200); expect(result.body.success).toBe(true); } finally { ENV.zeptomailToken = token; } expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe('retained unavailable contact and native system notification caller', () => {
  it('contact rejects before any database/provider invocation with valid positive-domain fixture', async () => {
    const { appRouter } = await import('./routers'); const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    await expect(caller.contact.submit({ name: 'QA User', email: 'aimbim@yopmail.com', message: 'Local synthetic contact draft only.' })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' }); expect(fetchMock).not.toHaveBeenCalled(); expect(dbMock.getDb).not.toHaveBeenCalled();
  });
  it('admin system caller preserves success boolean from real notification helper', async () => {
    const { appRouter } = await import('./routers'); const caller = appRouter.createCaller({ user: { id: 7, role: 'admin' } as any, req: {} as any, res: {} as any }); fetchMock.mockResolvedValueOnce(accepted()); expect(await caller.system.notifyOwner({ title: 'QA Alert', content: 'Local synthetic notice.' })).toEqual({ success: true }); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('admin system caller reports false without pretending provider accepted empty 200', async () => {
    const { appRouter } = await import('./routers'); const caller = appRouter.createCaller({ user: { id: 7, role: 'admin' } as any, req: {} as any, res: {} as any }); fetchMock.mockResolvedValueOnce(new Response('{}', { headers: { 'content-type': 'application/json' } })); expect(await caller.system.notifyOwner({ title: 'QA Alert', content: 'Local synthetic notice.' })).toEqual({ success: false });
  });
});
