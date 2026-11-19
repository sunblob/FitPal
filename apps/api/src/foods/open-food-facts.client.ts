import { Injectable, Logger } from '@nestjs/common';
import { Env } from '../config/env.js';
import { parseOffProduct, type OffProduct } from './open-food-facts.js';

const FIELDS = 'code,product_name,product_name_ru,generic_name,brands,nutriments';
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
    return products.map(parseOffProduct).filter((p): p is OffProduct => p !== null);
  }

  private async get(path: string): Promise<unknown> {
    try {
      const res = await fetch(`${this.env.OFF_BASE_URL}${path}`, {
        headers: { 'User-Agent': 'FitPal/0.1' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`OFF ${res.status} for ${path}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      this.logger.warn(`OFF request failed: ${(e as Error).message}`);
      return null;
    }
  }
}
