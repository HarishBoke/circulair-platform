import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SignJWT } from 'jose';

vi.mock('./db', async importOriginal => ({
  ...await importOriginal<typeof import('./db')>(),
  getUserByEmail: vi.fn(), getUserByOpenId: vi.fn(), createLocalUser: vi.fn(),
  upsertUser: vi.fn(), createPasswordResetToken: vi.fn(), getPasswordResetToken: vi.fn(),
  updateUserPassword: vi.fn(), markPasswordResetTokenUsed: vi.fn(), getDb: vi.fn(),
}));
vi.mock('./email', () => ({ sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('./_core/notification', () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));
import * as db from './db';
import { sendPasswordResetEmail } from './email';
import { notifyOwner } from './_core/notification';
import { registerAuthRoutes, registerPasswordResetRoutes, createSessionToken, authenticateRequest, verifySessionToken } from './_core/auth';
import { getSessionCookieOptions } from './_core/cookies';
import { ENV } from './_core/env';
import { applySecurityMiddleware } from './security';
import { getApplicationOrigin } from './requestSecurity';
import { handleHealth } from './health';
import { COOKIE_NAME } from '../shared/const';

function authApp() { const app = express(); app.use(express.json()); registerAuthRoutes(app); registerPasswordResetRoutes(app); return app; }
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('Recovery credential protections', () => {
  it('ignores attacker-supplied Origin and Referer when mailing a recovery link', async () => {
    vi.stubEnv('APP_URL', 'https://circulair.energy');
    vi.mocked(db.getUserByEmail).mockResolvedValue({ id: 1, email: 'qa@example.com', name: 'QA' } as any);
    const res = await request(authApp()).post('/api/auth/forgot-password').set('Origin', 'https://attacker.invalid').set('Referer', 'https://attacker.invalid/phish').send({ email: 'qa@example.com' });
    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('qa@example.com', expect.stringMatching(/^https:\/\/circulair\.energy\/reset-password\?token=/), 'QA', 15);
    expect(res.body).not.toHaveProperty('token'); expect(res.body).not.toHaveProperty('resetUrl');
    const notice = vi.mocked(notifyOwner).mock.calls[0][0];
    expect(notice.content).not.toContain('reset-password?token=');
  });
  it('rejects insecure production APP_URL', () => { vi.stubEnv('NODE_ENV','production'); vi.stubEnv('APP_URL','http://attacker.invalid'); expect(() => getApplicationOrigin()).toThrow(); });
  it('rejects URLs containing embedded credentials', () => { vi.stubEnv('APP_URL','https://user:pass@circulair.energy'); expect(() => getApplicationOrigin()).toThrow(); });
});

describe('Authentication input and session safety', () => {
  it.each([{ email: {}, password:'ValidPass1!' }, { email:'qa@example.com', password:{} }, { email:55, password:'ValidPass1!' }])('rejects malformed login payload %j before database access', async payload => {
    const res = await request(authApp()).post('/api/auth/login').send(payload); expect(res.status).toBe(400); expect(db.getUserByEmail).not.toHaveBeenCalled();
  });
  it.each([{ email:{}, password:'ValidPass1!' }, { email:'qa@example.com', password:'ValidPass1!', name:{} }, { email:'qa@example.com', password:'x'.repeat(73) }])('rejects malformed registration payload %j', async payload => {
    const res=await request(authApp()).post('/api/auth/register').send(payload); expect(res.status).toBe(400); expect(db.createLocalUser).not.toHaveBeenCalled();
  });
  it('uses Lax cookies for HTTP local development', () => { expect(getSessionCookieOptions({ protocol:'http',headers:{} } as any)).toMatchObject({ sameSite:'lax',secure:false,httpOnly:true }); });
  it('uses Secure HttpOnly cookies for HTTPS previews', () => { expect(getSessionCookieOptions({ protocol:'https',headers:{} } as any)).toMatchObject({ sameSite:'none',secure:true,httpOnly:true }); });
  it('requires JWT subject to match the database user', async () => {
    const token=await createSessionToken({id:2,openId:'qa'}); vi.mocked(db.getUserByOpenId).mockResolvedValue({id:1,openId:'qa'} as any);
    expect(await authenticateRequest({headers:{cookie:`${COOKIE_NAME}=${token}`}} as any)).toBeNull(); expect(db.upsertUser).not.toHaveBeenCalled();
  });
  it('does not write lastSignedIn on every authenticated read', async () => {
    const token=await createSessionToken({id:1,openId:'qa'}); vi.mocked(db.getUserByOpenId).mockResolvedValue({id:1,openId:'qa'} as any);
    expect(await authenticateRequest({headers:{cookie:`${COOKIE_NAME}=${token}`}} as any)).toMatchObject({id:1}); expect(db.upsertUser).not.toHaveBeenCalled();
  });
  it('rejects signed tokens with non-integer subjects', async () => {
    const token=await new SignJWT({openId:'qa',sub:'1.5'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(ENV.cookieSecret));
    expect(await verifySessionToken(token)).toBeNull();
  });
  it('never returns passwordHash from tRPC auth.me', async () => {
    const {appRouter}=await import('./routers');
    const result=await appRouter.createCaller({req:{} as any,res:{} as any,user:{id:1,openId:'qa',passwordHash:'sensitive-hash',role:'user'} as any}).auth.me();
    expect(result).toMatchObject({id:1}); expect(result).not.toHaveProperty('passwordHash');
  });
});

describe('Cross-origin mutation enforcement', () => {
  function app(){ const a=express(); applySecurityMiddleware(a); a.post('/api/check',(_req,res)=>res.json({ok:true})); a.get('/api/auth/me',(_req,res)=>res.json({ok:true})); return a; }
  it('blocks attacker-origin mutations',async()=>{expect((await request(app()).post('/api/check').set('Origin','https://attacker.invalid')).status).toBe(403);});
  it('blocks opaque null origin mutations',async()=>{expect((await request(app()).post('/api/check').set('Origin','null')).status).toBe(403);});
  it('blocks cross-site fetch metadata even without Origin',async()=>{expect((await request(app()).post('/api/check').set('Sec-Fetch-Site','cross-site')).status).toBe(403);});
  it('allows the canonical application origin',async()=>{expect((await request(app()).post('/api/check').set('Origin','https://circulair.energy')).status).toBe(200);});
  it('allows nonbrowser API clients without Origin',async()=>{expect((await request(app()).post('/api/check')).status).toBe(200);});
  it('allows same-origin local requests',async()=>{expect((await request(app()).post('/api/check').set('Host','localhost:3000').set('Origin','http://localhost:3000')).status).toBe(200);});
  it('does not consume the login rate-limit budget on read-only session checks',async()=>{const a=app(); for(let i=0;i<22;i++) expect((await request(a).get('/api/auth/me')).status).toBe(200);});
});

describe('Query-backed readiness', () => {
  function app(){ const a=express(); a.get('/api/health',handleHealth); return a; }
  it('returns healthy only after a successful database query',async()=>{const execute=vi.fn().mockResolvedValue([]); vi.mocked(db.getDb).mockResolvedValue({execute} as any); const r=await request(app()).get('/api/health'); expect(r.status).toBe(200);expect(execute).toHaveBeenCalledOnce();});
  it('returns 503 when there is no database',async()=>{vi.mocked(db.getDb).mockResolvedValue(null);const r=await request(app()).get('/api/health');expect(r.status).toBe(503);expect(r.body.db).toBe('disconnected');});
  it('returns 503 without leaking connection errors',async()=>{vi.mocked(db.getDb).mockResolvedValue({execute:vi.fn().mockRejectedValue(new Error('sensitive connection string'))} as any);const r=await request(app()).get('/api/health');expect(r.status).toBe(503);expect(JSON.stringify(r.body)).not.toContain('sensitive');});
});
