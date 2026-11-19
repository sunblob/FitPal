import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateInitData } from './init-data.js';

const token = '123456:TEST';

function sign(fields: Record<string, string>): string {
  const dcs = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const now = 1_800_000_000_000;
const fields = {
  auth_date: String(now / 1000 - 60),
  user: JSON.stringify({ id: 42, first_name: 'Gleb' }),
};

test('accepts correctly signed initData', () => {
  assert.deepEqual(validateInitData(sign(fields), token, 3600, now), {
    id: 42,
    first_name: 'Gleb',
  });
});

test('rejects tampered initData', () => {
  const tampered = sign(fields).replace('42', '43');
  assert.equal(validateInitData(tampered, token, 3600, now), null);
});

test('rejects expired initData', () => {
  assert.equal(validateInitData(sign(fields), token, 30, now), null);
});
