import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AdminLogin } from '@fitpal/shared';

/** Сессия админки живёт 12 часов, потом нужен повторный вход через Telegram. */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
/** Данные Login Widget принимаем, только если вход был не раньше 10 минут назад. */
const LOGIN_MAX_AGE_SECONDS = 10 * 60;

function safeEqualHex(a: string, b: Buffer): boolean {
  const actual = Buffer.from(a, 'hex');
  return actual.length === b.length && timingSafeEqual(actual, b);
}

/**
 * Проверяет подпись Telegram Login Widget.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  data: AdminLogin,
  botToken: string,
  now = Date.now(),
  maxAgeSeconds = LOGIN_MAX_AGE_SECONDS,
): boolean {
  const { hash, ...fields } = data;
  const dataCheckString = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  if (!safeEqualHex(hash, expected)) return false;

  const age = now / 1000 - data.auth_date;
  return age >= -60 && age <= maxAgeSeconds;
}

/** Ключ подписи сессий выводится из токена бота: смена токена разлогинивает админку. */
function sessionKey(botToken: string): Buffer {
  return createHmac('sha256', 'fitpal-admin-session').update(botToken).digest();
}

interface SessionPayload {
  tid: number;
  exp: number;
}

/** Токен вида `<payload base64url>.<hmac hex>`. */
export function signAdminSession(
  telegramId: number,
  botToken: string,
  now = Date.now(),
): { token: string; expiresAt: Date } {
  const exp = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ tid: telegramId, exp })).toString('base64url');
  const sig = createHmac('sha256', sessionKey(botToken)).update(payload).digest('hex');
  return { token: `${payload}.${sig}`, expiresAt: new Date(exp * 1000) };
}

/** Возвращает Telegram ID из валидного и не просроченного токена. */
export function verifyAdminSession(
  token: string,
  botToken: string,
  now = Date.now(),
): number | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', sessionKey(botToken)).update(payload).digest();
  if (!safeEqualHex(sig, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  const { tid, exp } = (parsed ?? {}) as Partial<SessionPayload>;
  if (typeof tid !== 'number' || typeof exp !== 'number') return null;
  if (exp * 1000 <= now) return null;
  return tid;
}
