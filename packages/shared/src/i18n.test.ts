import assert from 'node:assert/strict';
import { test } from 'node:test';
import { languageFromTelegram } from './i18n.js';

test('languageFromTelegram: русский для ru и соседних языков', () => {
  assert.equal(languageFromTelegram('ru'), 'ru');
  assert.equal(languageFromTelegram('uk'), 'ru');
  assert.equal(languageFromTelegram('ru-RU'), 'ru');
});

test('languageFromTelegram: английский для остальных и без кода', () => {
  assert.equal(languageFromTelegram('en'), 'en');
  assert.equal(languageFromTelegram('sk'), 'en');
  assert.equal(languageFromTelegram(undefined), 'en');
  assert.equal(languageFromTelegram(null), 'en');
});
