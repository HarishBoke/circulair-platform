import { ENV } from './env';

// Retain the application's India-region ZeptoMail API; never follow redirects with credentials.
export const ZEPTO_API_URL = 'https://api.zeptomail.in/v1.1/email';
export const EMAIL_TIMEOUT_MS = 10_000;
export const EMAIL_RESPONSE_MAX_BYTES = 64 * 1024;
const CONTROLS = /[\u0000-\u001f\u007f\u2028\u2029]/;

export class EmailFailure extends Error {}
export const safeEmailError = (error: unknown): string =>
  error instanceof EmailFailure ? error.message : 'Email request failed; acceptance is unknown';

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function validEmailAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 254 || CONTROLS.test(value)) return false;
  const [local, domain, extra] = value.split('@');
  if (extra !== undefined || !local || local.length > 64 || !domain || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) && domain.length <= 253 && domain.includes('.') && domain.split('.').every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

export function validateEmailHeader(value: string, max = 250): void {
  if (typeof value !== 'string' || value.length > max || CONTROLS.test(value)) throw new EmailFailure('Invalid email header');
}

export function validateEmailUrl(value: string, originOnly = false): string {
  if (typeof value !== 'string' || value.length > 4096 || /[\s<>"'\\]/.test(value) || CONTROLS.test(value)) throw new EmailFailure('Invalid email URL');
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && !ENV.isProduction))) throw new Error();
    if (originOnly && (url.pathname !== '/' || url.search)) throw new Error();
    return originOnly ? url.origin : url.href;
  } catch { throw new EmailFailure('Invalid email URL'); }
}

export interface ZeptoMailPayload {
  from: { address: string; name: string };
  to: { email_address: { address: string; name: string } }[];
  reply_to?: { address: string; name: string }[];
  subject: string;
  htmlbody?: string;
  textbody?: string;
}

export function validateZeptoMailConfig(): boolean {
  // Keys are opaque: preserve legitimate Base64/URL-safe encodings as-is.
  return typeof ENV.zeptomailToken === 'string' && /^Zoho-enczapikey [A-Za-z0-9._~+/:=-]+$/i.test(ENV.zeptomailToken) && ENV.zeptomailToken.length <= 4096 && validEmailAddress(ENV.fromEmail);
}

function validatePayload(payload: ZeptoMailPayload): void {
  for (const address of [payload.from, ...payload.to.map(to => to.email_address), ...(payload.reply_to ?? [])]) {
    if (!validEmailAddress(address.address)) throw new EmailFailure('Invalid email address');
    validateEmailHeader(address.name);
  }
  validateEmailHeader(payload.subject, 500);
}

export async function sendViaZeptoAPI(payload: ZeptoMailPayload): Promise<{ request_id: string }> {
  if (!validateZeptoMailConfig()) throw new EmailFailure('Email configuration is unavailable or invalid');
  validatePayload(payload);
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new EmailFailure('Email request timed out; acceptance is unknown'));
    }, EMAIL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetch(ZEPTO_API_URL, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: ENV.zeptomailToken },
        body: JSON.stringify(payload),
      });
      const cancelBody = () => { void response.body?.cancel().catch(() => {}); };
      if (controller.signal.aborted) {
        cancelBody(); throw new EmailFailure('Email request timed out; acceptance is unknown');
      }
      if (response.redirected || response.status >= 300 && response.status < 400) {
        cancelBody(); throw new EmailFailure('Email redirect refused; acceptance is unknown');
      }
      if (!response.ok) {
        cancelBody(); throw new EmailFailure(`Email provider rejected request (HTTP ${response.status})`);
      }
      if (!/^application\/json\b/i.test(response.headers.get('content-type') ?? '') || !response.body) {
        cancelBody(); throw new EmailFailure('Invalid email provider response; acceptance is unknown');
      }
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > EMAIL_RESPONSE_MAX_BYTES)) {
        cancelBody(); throw new EmailFailure('Invalid email provider response; acceptance is unknown');
      }
      reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > EMAIL_RESPONSE_MAX_BYTES) {
          void reader.cancel().catch(() => {});
          throw new EmailFailure('Invalid email provider response; acceptance is unknown');
        }
        chunks.push(value);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      // Zoho's documented accepted send: EM_104 plus a unique request_id. A request_id alone also occurs on failures.
      if (!data || data.error || data.message !== 'OK' || !Array.isArray(data.data) || data.data.length === 0 || !data.data.every((entry: unknown) => entry && typeof entry === 'object' && (entry as { code?: unknown }).code === 'EM_104' && (entry as { message?: unknown }).message === 'OK') || typeof data.request_id !== 'string' || !/^[A-Za-z0-9._:-]{1,256}$/.test(data.request_id)) {
        throw new EmailFailure('Invalid email provider response; acceptance is unknown');
      }
      return { request_id: data.request_id };
    })()]);
  } catch (error) {
    if (error instanceof EmailFailure) throw error;
    throw new EmailFailure(controller.signal.aborted ? 'Email request timed out; acceptance is unknown' : 'Email request failed; acceptance is unknown');
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
    void reader?.cancel().catch(() => {});
  }
}
