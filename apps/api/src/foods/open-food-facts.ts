import type { Nutrients } from '@fitpal/shared';

export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  /** Теги стран продаж, например en:slovakia. */
  countries: string[];
  /** Фото товара с CDN Open Food Facts, если есть. */
  imageUrl: string | null;
  per100g: Nutrients;
}

type Raw = Record<string, unknown>;

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
};
const ENTITIES: Record<string, string> = {
  quot: '"',
  amp: '&',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

/** OFF отдаёт часть названий с HTML-сущностями: «ООО &quot;Агро&quot;». */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const str = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = decodeEntities(v).trim();
  return s || undefined;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Берём только https-картинки с доменов Open Food Facts, чтобы не показывать чужие ссылки. */
export function offImageUrl(p: Raw): string | null {
  for (const key of ['image_front_small_url', 'image_front_url', 'image_small_url', 'image_url']) {
    const v = p[key];
    if (typeof v !== 'string') continue;
    try {
      const url = new URL(v);
      if (
        url.protocol === 'https:' &&
        (url.hostname === 'openfoodfacts.org' || url.hostname.endsWith('.openfoodfacts.org'))
      ) {
        return url.toString();
      }
    } catch {
      // невалидный URL, пробуем следующий
    }
  }
  return null;
}

/**
 * Превращает продукт из ответа Open Food Facts в наш формат.
 * Возвращает null, если нет названия, штрихкода или калорийности.
 */
export function parseOffProduct(raw: unknown): OffProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Raw;
  const n = (p.nutriments ?? {}) as Raw;

  const barcode = str(p.code);
  // Русское название, иначе основное (на языке страны товара), иначе словацкое или чешское
  const name =
    str(p.product_name_ru) ??
    str(p.product_name) ??
    str(p.product_name_sk) ??
    str(p.product_name_cs) ??
    str(p.generic_name);
  const kj = num(n['energy_100g']);
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : undefined);
  if (!barcode || !/^\d{8,14}$/.test(barcode) || !name || kcal == null) return null;

  const brand = str(p.brands)?.split(',')[0]?.trim() ?? null;
  return {
    barcode,
    name,
    brand,
    countries: Array.isArray(p.countries_tags)
      ? p.countries_tags.filter((c): c is string => typeof c === 'string')
      : [],
    imageUrl: offImageUrl(p),
    per100g: {
      kcal: Math.round(kcal),
      protein: round1(num(n['proteins_100g']) ?? 0),
      fat: round1(num(n['fat_100g']) ?? 0),
      carbs: round1(num(n['carbohydrates_100g']) ?? 0),
    },
  };
}

/** Товары из предпочитаемых стран вперёд, порядок внутри групп сохраняется. */
export function preferCountries(products: OffProduct[], countries: string[]): OffProduct[] {
  if (countries.length === 0) return products;
  const preferred = (p: OffProduct) => p.countries.some((c) => countries.includes(c));
  return [...products.filter(preferred), ...products.filter((p) => !preferred(p))];
}
