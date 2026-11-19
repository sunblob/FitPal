import { readFileSync } from 'node:fs';
import { and, eq, isNull, like, or, sql } from 'drizzle-orm';
import type { Database } from '../db/db.module.js';
import { foods } from '../db/schema.js';
import { decodeEntities } from './open-food-facts.js';
import { buildSearchText } from './search-text.js';

/** Элемент data/generic-foods/generic-foods.json (собирается скриптом build.mjs рядом). */
interface GenericFood {
  id: string;
  name: string;
  aliases: string[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

const DATA_URL = new URL('../../data/generic-foods/generic-foods.json', import.meta.url);
const BATCH = 200;

export function loadGenericFoods(): GenericFood[] {
  return JSON.parse(readFileSync(DATA_URL, 'utf8')) as GenericFood[];
}

/**
 * Загружает встроенный справочник продуктов (обновляет по external_id) и заполняет
 * search_text у продуктов, где его ещё нет. Идемпотентно, запускается при старте API.
 */
export async function seedGenericFoods(db: Database): Promise<number> {
  const items = loadGenericFoods();
  for (let i = 0; i < items.length; i += BATCH) {
    const rows = items.slice(i, i + BATCH).map((f, j) => {
      const aliases = f.aliases.join(', ') || null;
      return {
        externalId: f.id,
        name: f.name,
        aliases,
        searchText: buildSearchText({ name: f.name, aliases }),
        sortOrder: i + j,
        source: 'builtin' as const,
        ownerId: null,
        kcal: f.kcal,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
      };
    });
    await db
      .insert(foods)
      .values(rows)
      .onConflictDoUpdate({
        target: foods.externalId,
        set: {
          name: sql`excluded.name`,
          aliases: sql`excluded.aliases`,
          searchText: sql`excluded.search_text`,
          sortOrder: sql`excluded.sort_order`,
          kcal: sql`excluded.kcal`,
          protein: sql`excluded.protein`,
          fat: sql`excluded.fat`,
          carbs: sql`excluded.carbs`,
          updatedAt: sql`now()`,
        },
      });
  }

  // Продукты, созданные до появления search_text: свои и кэш Open Food Facts
  for (;;) {
    const rows = await db
      .select({ id: foods.id, name: foods.name, brand: foods.brand, aliases: foods.aliases })
      .from(foods)
      .where(isNull(foods.searchText))
      .limit(BATCH);
    if (rows.length === 0) break;
    for (const r of rows) {
      await db
        .update(foods)
        .set({ searchText: buildSearchText(r) })
        .where(eq(foods.id, r.id));
    }
  }
  // Кэш OFF, сохранённый до расшифровки HTML-сущностей в названиях
  const broken = await db
    .select({ id: foods.id, name: foods.name, brand: foods.brand })
    .from(foods)
    .where(
      and(
        eq(foods.source, 'openfoodfacts'),
        or(like(foods.name, '%&%;%'), like(foods.brand, '%&%;%')),
      ),
    );
  for (const r of broken) {
    const name = decodeEntities(r.name);
    const brand = r.brand && decodeEntities(r.brand);
    await db
      .update(foods)
      .set({ name, brand, searchText: buildSearchText({ name, brand }) })
      .where(eq(foods.id, r.id));
  }
  return items.length;
}
