import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { zeptomailToken: 'Zoho-enczapikey synthetic-local-token', fromEmail: 'qa-sender@yopmail.com', ownerEmail: 'aimbim@yopmail.com', ownerName: 'QA Owner', isProduction: false } }));
import { ENV } from './_core/env';
import { sendPasswordResetEmail } from './email';
import { notifyOwner } from './_core/notification';
import { EMAIL_RESPONSE_MAX_BYTES, EMAIL_TIMEOUT_MS } from './_core/zeptomail';
const fetchMock = vi.fn(); const acceptance = { message: 'OK', request_id: 'req-local-123', data: [{ code: 'EM_104', message: 'OK' }] };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const send = () => sendPasswordResetEmail('aimbim@yopmail.com', 'https://circulair.energy/reset?token=synthetic-local-token', 'QA');
beforeEach(() => { fetchMock.mockReset().mockImplementation(() => { throw new Error('UNEXPECTED_PROVIDER_FETCH'); }); vi.stubGlobal('fetch', fetchMock); for (const method of ['log', 'error', 'warn'] as const) vi.spyOn(console, method).mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('ZeptoMail provider boundaries', () => {
  it('preserves opaque encoded API keys without rejecting or transforming their authorization header', async () => {
    const original = ENV.zeptomailToken;
    const synthetic = 'Zoho-enczapikey synthetic/local+encoded:key==';
    try {
      ENV.zeptomailToken = synthetic;
      fetchMock.mockResolvedValueOnce(response(acceptance));
      expect((await send()).success).toBe(true);
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(synthetic);
    } finally { ENV.zeptomailToken = original; }
  });
  it.each([{}, null, [], { request_id: 'req-only' }, { ...acceptance, request_id: '' }, { ...acceptance, request_id: 'bad\nsecret' }, { ...acceptance, request_id: 42 }, { ...acceptance, data: [] }, { ...acceptance, message: 'error' }, { ...acceptance, data: [{ code: 'TM_5001', message: 'OK' }] }, { ...acceptance, error: { message: 'synthetic-secret' } }, { ...acceptance, data: [...acceptance.data, { code: 'REJECTED', message: 'error' }] }])('rejects explicitly negative acceptance body %j', async body => { fetchMock.mockResolvedValueOnce(response(body)); const result = await send(); expect(result.success).toBe(false); expect(result.messageId).toBeUndefined(); expect(fetchMock).toHaveBeenCalledOnce(); });
  it.each([400, 401, 403, 429, 500, 503])('sanitizes HTTP %s without reading hostile body', async status => { fetchMock.mockResolvedValueOnce(response({ error: { message: 'synthetic-secret aimbim@yopmail.com' } }, status)); expect(await send()).toEqual({ success: false, error: `Email provider rejected request (HTTP ${status})` }); expect(fetchMock).toHaveBeenCalledOnce(); });
  it.each([301, 302, 307, 308])('refuses redirect %s without second request', async status => { fetchMock.mockResolvedValueOnce(new Response('', { status, headers: { location: 'https://zoho.com/' } })); expect((await send()).success).toBe(false); expect(fetchMock).toHaveBeenCalledOnce(); expect(fetchMock.mock.calls[0][1].redirect).toBe('error'); });
  it.each([new Response('', { status: 200 }), new Response('<html>secret</html>', { headers: { 'content-type': 'text/html' } }), new Response('{broken', { headers: { 'content-type': 'application/json' } })])('rejects empty non-JSON malformed 200 responses', async synthetic => { fetchMock.mockResolvedValueOnce(synthetic); expect((await send()).success).toBe(false); });
  it('bounds chunked bytes and cancels stream', async () => { const cancel = vi.fn(); fetchMock.mockResolvedValueOnce(new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(EMAIL_RESPONSE_MAX_BYTES + 1)); }, cancel }), { headers: { 'content-type': 'application/json' } })); expect((await send()).success).toBe(false); expect(cancel).toHaveBeenCalledOnce(); });
  it('rejects oversized declared body before read', async () => { const cancel = vi.fn(); fetchMock.mockResolvedValueOnce(new Response(new ReadableStream({ cancel }), { headers: { 'content-type': 'application/json', 'content-length': String(EMAIL_RESPONSE_MAX_BYTES + 1) } })); expect((await send()).success).toBe(false); expect(cancel).toHaveBeenCalledOnce(); });
  it('bounds waiting for headers even if fetch ignores abort', async () => { vi.useFakeTimers(); fetchMock.mockImplementationOnce(() => new Promise(() => {})); const promise = send(); await vi.advanceTimersByTimeAsync(EMAIL_TIMEOUT_MS); expect(await promise).toEqual({ success: false, error: 'Email request timed out; acceptance is unknown' }); expect(fetchMock).toHaveBeenCalledOnce(); expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0); });
  it('bounds accepted-then-stalled body cancels it never resends', async () => { vi.useFakeTimers(); const cancel = vi.fn(); fetchMock.mockResolvedValueOnce(new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"request_id":"req-local-123",')); }, cancel }), { headers: { 'content-type': 'application/json' } })); const promise = send(); await vi.advanceTimersByTimeAsync(EMAIL_TIMEOUT_MS); expect(await promise).toMatchObject({ success: false, error: 'Email request timed out; acceptance is unknown' }); expect(cancel).toHaveBeenCalledOnce(); expect(fetchMock).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); });
  it('cancels a response arriving after the timeout without beginning a body read', async () => {
    vi.useFakeTimers(); let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveResponse = resolve; }));
    const promise = send(); await vi.advanceTimersByTimeAsync(EMAIL_TIMEOUT_MS);
    expect(await promise).toMatchObject({ success: false });
    const cancel = vi.fn(); resolveResponse(new Response(new ReadableStream({ cancel }), { headers: { 'content-type': 'application/json' } }));
    await vi.advanceTimersByTimeAsync(0); expect(cancel).toHaveBeenCalledOnce(); expect(fetchMock).toHaveBeenCalledOnce();
  });
});
describe('native notifyOwner', () => {
  it('sends accepted owner notification with escaped title content', async () => { fetchMock.mockResolvedValueOnce(response(acceptance)); expect(await notifyOwner({ title: '<img> "QA"', content: '**QA**\n<script>bad</script>' })).toBe(true); const body = JSON.parse(fetchMock.mock.calls[0][1].body); expect(body.to[0].email_address.address).toBe('aimbim@yopmail.com'); expect(body.htmlbody).toContain('<title>&lt;img&gt;'); expect(body.htmlbody).toContain('&lt;script&gt;'); expect(body.htmlbody).toContain('<strong>QA</strong>'); expect(body.htmlbody).not.toMatch(/ISO 27001|GDPR/); expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toMatch(/req-local|yopmail/); });
  it.each([{ title: '', content: 'QA' }, { title: 'QA', content: '' }, { title: 'x'.repeat(1201), content: 'QA' }, { title: 'QA', content: 'x'.repeat(20001) }, { title: 'QA\r\nBcc: injected', content: 'QA' }])('preserves BAD_REQUEST for invalid notification', async payload => { await expect(notifyOwner(payload)).rejects.toMatchObject({ code: 'BAD_REQUEST' }); expect(fetchMock).not.toHaveBeenCalled(); });
  it('returns false without transport when token absent', async () => { const token = ENV.zeptomailToken; try { ENV.zeptomailToken = ''; expect(await notifyOwner({ title: 'QA', content: 'QA' })).toBe(false); } finally { ENV.zeptomailToken = token; } expect(fetchMock).not.toHaveBeenCalled(); });
  it('returns false for malformed owner without fetch', async () => { const owner = ENV.ownerEmail; try { ENV.ownerEmail = 'negative-malformed-address'; expect(await notifyOwner({ title: 'QA', content: 'QA' })).toBe(false); } finally { ENV.ownerEmail = owner; } expect(fetchMock).not.toHaveBeenCalled(); });
  it('retains sender fallback for absent owner', async () => { const owner = ENV.ownerEmail; try { ENV.ownerEmail = ''; fetchMock.mockResolvedValueOnce(response(acceptance)); expect(await notifyOwner({ title: 'QA', content: 'QA' })).toBe(true); expect(JSON.parse(fetchMock.mock.calls[0][1].body).to[0].email_address.address).toBe('qa-sender@yopmail.com'); } finally { ENV.ownerEmail = owner; } });
  it('returns false for missing acceptance and sanitized failure', async () => { fetchMock.mockResolvedValueOnce(response({})); expect(await notifyOwner({ title: 'QA', content: 'QA' })).toBe(false); fetchMock.mockRejectedValueOnce(new Error('synthetic-secret aimbim@yopmail.com')); expect(await notifyOwner({ title: 'QA', content: 'QA' })).toBe(false); expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/synthetic-secret|yopmail/); });
  it('uses same timeout for stalled owner response', async () => { vi.useFakeTimers(); fetchMock.mockImplementationOnce(() => new Promise(() => {})); const promise = notifyOwner({ title: 'QA', content: 'QA' }); await vi.advanceTimersByTimeAsync(EMAIL_TIMEOUT_MS); expect(await promise).toBe(false); expect(fetchMock).toHaveBeenCalledOnce(); });
});
