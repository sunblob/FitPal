import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import type { AdminLogin } from '@fitpal/shared';
import { signAdminSession, verifyAdminSession, verifyTelegramLogin } from './admin-auth.js';

const token = '123456:TEST';
const now = 1_800_000_000_000;

function login(fields: Omit<AdminLogin, 'hash'>, botToken = token): AdminLogin {
  const dcs = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('\n');
  const secret = createHash('sha256').update(botToken).digest();
  return { ...fields, hash: createHmac('sha256', secret).update(dcs).digest('hex') };
}

const fields = { id: 42, first_name: 'Gleb', username: 'gleb', auth_date: now / 1000 - 30 };

test('accepts a correctly signed login', () => {
  assert.equal(verifyTelegramLogin(login(fields), token, now), true);
});

test('rejects a login signed with another bot token', () => {
  assert.equal(verifyTelegramLogin(login(fields, '999:OTHER'), token, now), false);
});

test('rejects a tampered login', () => {
  assert.equal(verifyTelegramLogin({ ...login(fields), id: 43 }, token, now), false);
});

test('rejects a stale login', () => {
  const old = login({ ...fields, auth_date: now / 1000 - 3600 });
  assert.equal(verifyTelegramLogin(old, token, now), false);
});

test('session round-trips and expires', () => {
  const { token: session, expiresAt } = signAdminSession(42, token, now);
  assert.equal(verifyAdminSession(session, token, now), 42);
  assert.equal(verifyAdminSession(session, token, expiresAt.getTime()), null);
});

test('rejects a forged or foreign session', () => {
  const { token: session } = signAdminSession(42, token, now);
  const [payload, sig] = session.split('.');
  const forged = Buffer.from(JSON.stringify({ tid: 1, exp: 9_999_999_999 })).toString('base64url');
  assert.equal(verifyAdminSession(`${forged}.${sig}`, token, now), null);
  assert.equal(verifyAdminSession(`${payload}.${sig}`, '999:OTHER', now), null);
  assert.equal(verifyAdminSession('garbage', token, now), null);
});
