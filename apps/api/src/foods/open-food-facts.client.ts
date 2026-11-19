import { Injectable, Logger } from '@nestjs/common';
import { Env } from '../config/env.js';
import { parseOffProduct, preferCountries, type OffProduct } from './open-food-facts.js';

const FIELDS =
  'code,product_name,product_name_ru,product_name_sk,product_name_cs,generic_name,brands,countries_tags,nutriments,image_front_small_url,image_front_url,image_small_url,image_url';
const TIMEOUT_MS = 6000;

/** Клиент Open Food Facts. Ошибки сети не пробрасываются: продукт просто не найден. */
@Injectable()
export class OpenFoodFactsClient {
  private readonly logger = new Logger(OpenFoodFactsClient.name);

  constructor(private readonly env: Env) {}

  async byBarcode(code: string): Promise<OffProduct | null> {
    const data = await this.get(`/api/v2/product/${code}.json?fields=${FIELDS}`);
    if (!data || (data as { status?: number }).status !== 1) return null;
    return parseOffProduct((data as { product?: unknown }).product);
  }

  async search(q: string, limit = 20): Promise<OffProduct[]> {
    const params = new URLSearchParams({
      search_terms: q,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(limit),
      fields: FIELDS,
    });
    const data = await this.get(`/cgi/search.pl?${params}`);
    const products = (data as { products?: unknown[] } | null)?.products ?? [];
    const parsed = products.map(parseOffProduct).filter((p): p is OffProduct => p !== null);
    return preferCountries(parsed, this.env.OFF_PREFERRED_COUNTRIES);
  }

  /** Поиск OFF часто отвечает 503 под нагрузкой, поэтому одна повторная попытка. */
  private async get(path: string, retry = true): Promise<unknown> {
    try {
      const res = await fetch(`${this.env.OFF_BASE_URL}${path}`, {
        headers: { 'User-Agent': 'FitPal/0.1' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`OFF ${res.status} for ${path}`);
        if (retry && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 500));
          return this.get(path, false);
        }
        return null;
      }
      return await res.json();
    } catch (e) {
      this.logger.warn(`OFF request failed: ${(e as Error).message}`);
      return null;
    }
  }
}
