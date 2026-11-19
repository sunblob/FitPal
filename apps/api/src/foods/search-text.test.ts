import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchText, normalize, queryTerms, stem } from './search-text.js';

test('normalize lowercases, folds ё and Slovak diacritics, keeps й', () => {
  assert.equal(normalize('Ёжик  Рис-Белый'), 'ежик рис белый');
  assert.equal(normalize('Ryža, Kuracie PRSIA'), 'ryza kuracie prsia');
  assert.equal(normalize('Чай зелёный'), 'чай зеленый');
  assert.equal(normalize('Молоко 3,2%'), 'молоко 3 2');
});

test('buildSearchText puts name first, then aliases and brand', () => {
  assert.equal(
    buildSearchText({ name: 'Гречка, сухая', aliases: 'ядрица, pohánka', brand: 'Мистраль' }),
    'гречка сухая ядрица pohanka мистраль',
  );
  assert.equal(buildSearchText({ name: 'Рис' }), 'рис');
});

test('stem cuts endings only on longer words', () => {
  assert.equal(stem('рис'), 'рис');
  assert.equal(stem('риса'), 'рис');
  assert.equal(stem('яблоки'), 'яблок');
  assert.equal(stem('гречка'), 'гречк');
  assert.equal(stem('куриная'), 'курин');
  assert.equal(stem('ryza'), 'ryz');
  assert.equal(stem('масло'), 'масл');
  assert.equal(stem('2,5'), '2,5');
});

test('every stemmed term is found in the search text of the food it names', () => {
  const text = buildSearchText({ name: 'Яблоко', aliases: 'яблоки, jablko' });
  for (const q of ['яблоки', 'яблоко', 'Яблок', 'jablká']) {
    assert.ok(
      queryTerms(q).every((t) => text.includes(t)),
      q,
    );
  }
});

test('queryTerms drops punctuation and duplicates', () => {
  assert.deepEqual(queryTerms('  рис, рис!! '), ['рис']);
  assert.deepEqual(queryTerms('%%'), []);
});
