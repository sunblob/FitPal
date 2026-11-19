/**
 * Собирает generic-foods.json из foods.tsv и выгрузки USDA FoodData Central SR Legacy (CSV).
 *
 *   curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
 *   unzip FoodData_Central_sr_legacy_food_csv_2018-04.zip
 *   node apps/api/data/generic-foods/build.mjs ./FoodData_Central_sr_legacy_food_csv_2018-04
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const usdaDir = process.argv[2];
if (!usdaDir) throw new Error('Usage: build.mjs <usda-csv-dir>');
const here = new URL('.', import.meta.url).pathname;

/** Разбор CSV из USDA: все поля в кавычках, кавычка внутри экранируется удвоением. */
const parseLine = (line) =>
  [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replaceAll('""', '"'));
function* csvRows(file) {
  const lines = readFileSync(join(usdaDir, file), 'utf8').split('\n');
  const header = parseLine(lines[0]);
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    yield Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  }
}

const NUTRIENTS = { 1008: 'kcal', 1003: 'protein', 1004: 'fat', 1005: 'carbs' };
const descriptions = new Map();
for (const r of csvRows('food.csv')) descriptions.set(r.fdc_id, r.description);

/** Заголовки групп в foods.tsv («# Овощи и зелень») → ключ категории для иконки в Mini App. */
export const CATEGORIES = [
  ['Крупы', 'grains'],
  ['Хлеб', 'bread'],
  ['Молочные', 'dairy'],
  ['Мясо и птица', 'meat'],
  ['Колбасы', 'sausages'],
  ['Рыба', 'fish'],
  ['Бобовые', 'legumes'],
  ['Орехи', 'nuts'],
  ['Овощи', 'vegetables'],
  ['Фрукты', 'fruits'],
  ['Масла', 'fats'],
  ['Сладкое', 'sweets'],
  ['Напитки', 'drinks'],
  ['Приправы', 'spices'],
  ['Готовые блюда', 'dishes'],
];

let category = null;
const entries = [];
for (const line of readFileSync(join(here, 'foods.tsv'), 'utf8').split('\n')) {
  if (line.startsWith('#')) {
    const title = line.slice(1).trim();
    const found = CATEGORIES.find(([prefix]) => title.startsWith(prefix));
    if (found) category = found[1];
    continue;
  }
  if (line.trim()) entries.push([category, ...line.split('\t')]);
}

const wanted = new Set(entries.map((e) => e[1]).filter((k) => /^\d+$/.test(k)));
const values = new Map();
for (const r of csvRows('food_nutrient.csv')) {
  const key = NUTRIENTS[r.nutrient_id];
  if (!key || !wanted.has(r.fdc_id)) continue;
  values.set(r.fdc_id, { ...values.get(r.fdc_id), [key]: Number(r.amount) });
}

/** Английские названия: names-en.tsv, ключ как в foods.tsv. */
const namesEn = new Map(
  readFileSync(join(here, 'names-en.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.split('\t').map((s) => s.trim())),
);

const round1 = (n) => Math.round(n * 10) / 10;
const ids = new Set();
const errors = [];
const foods = entries.map(([category, key, name, aliases = '', ...manual]) => {
  let per100g;
  let id;
  if (key.startsWith('ref:')) {
    id = key;
    const [kcal, protein, fat, carbs] = manual.map(Number);
    per100g = { kcal, protein, fat, carbs };
  } else {
    id = `usda:${key}`;
    const v = values.get(key);
    if (!descriptions.has(key) || v?.kcal == null) errors.push(`${key} ${name}: нет в USDA`);
    per100g = { kcal: v?.kcal, protein: v?.protein ?? 0, fat: v?.fat ?? 0, carbs: v?.carbs ?? 0 };
  }
  if (Object.values(per100g).some((n) => !Number.isFinite(n))) errors.push(`${key} ${name}: КБЖУ`);
  if (ids.has(id)) errors.push(`${key}: дубль`);
  if (!category) errors.push(`${key} ${name}: нет группы`);
  if (!namesEn.get(key)) errors.push(`${key} ${name}: нет английского названия`);
  ids.add(id);
  return {
    id,
    name: name.trim(),
    nameEn: namesEn.get(key),
    category,
    aliases: aliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    kcal: Math.round(per100g.kcal),
    protein: round1(per100g.protein),
    fat: round1(per100g.fat),
    carbs: round1(per100g.carbs),
    ...(key.startsWith('ref:') ? {} : { usda: descriptions.get(key) }),
  };
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
// По продукту на строку: так диффы при правке справочника остаются читаемыми
writeFileSync(
  join(here, 'generic-foods.json'),
  `[\n${foods.map((f) => JSON.stringify(f)).join(',\n')}\n]\n`,
);
console.log(`generic-foods.json: ${foods.length} продуктов`);
