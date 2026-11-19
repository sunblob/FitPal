import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { CreateFood, FoodDto } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { diaryEntries, foods, type Food } from '../db/schema.js';
import { toFoodDto } from './foods.mapper.js';
import { OpenFoodFactsClient } from './open-food-facts.client.js';
import type { OffProduct } from './open-food-facts.js';

const LIMIT = 30;
/** С какой длины запроса идём во внешнюю базу. */
const REMOTE_MIN_QUERY = 3;

@Injectable()
export class FoodsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly off: OpenFoodFactsClient,
  ) {}

  /** Свои продукты пользователя и общие (встроенные, из Open Food Facts). */
  private visibleTo(userId: string) {
    return or(eq(foods.ownerId, userId), isNull(foods.ownerId));
  }

  /**
   * Поиск по названию и бренду: сначала своя база, затем Open Food Facts.
   * Найденное во внешней базе кэшируется. Без запроса возвращает продукты,
   * которые пользователь чаще всего добавлял в дневник.
   */
  async search(userId: string, q: string): Promise<FoodDto[]> {
    if (!q) return this.frequent(userId);

    const local = await this.searchLocal(userId, q);
    if (q.length < REMOTE_MIN_QUERY || local.length >= LIMIT) return local;

    const remote = await this.cache(await this.off.search(q, LIMIT - local.length));
    const seen = new Set(local.map((f) => f.id));
    return [...local, ...remote.filter((f) => !seen.has(f.id)).map(toFoodDto)];
  }

  /** Продукт по штрихкоду: из кэша, иначе из Open Food Facts. */
  async byBarcode(code: string): Promise<FoodDto> {
    const cached = await this.db.query.foods.findFirst({ where: eq(foods.barcode, code) });
    if (cached) return toFoodDto(cached);

    const product = await this.off.byBarcode(code);
    if (!product) throw new NotFoundException('Product not found');
    const [food] = await this.cache([product]);
    return toFoodDto(food!);
  }

  /** Сохраняет продукты из Open Food Facts как общие (без владельца), обновляя по штрихкоду. */
  private async cache(products: OffProduct[]): Promise<Food[]> {
    if (products.length === 0) return [];
    const unique = [...new Map(products.map((p) => [p.barcode, p])).values()];
    return this.db
      .insert(foods)
      .values(
        unique.map((p) => ({
          name: p.name,
          brand: p.brand,
          barcode: p.barcode,
          source: 'openfoodfacts' as const,
          ownerId: null,
          ...p.per100g,
        })),
      )
      .onConflictDoUpdate({
        target: foods.barcode,
        set: {
          name: sql`excluded.name`,
          brand: sql`excluded.brand`,
          kcal: sql`excluded.kcal`,
          protein: sql`excluded.protein`,
          fat: sql`excluded.fat`,
          carbs: sql`excluded.carbs`,
        },
      })
      .returning();
  }

  private async searchLocal(userId: string, q: string): Promise<FoodDto[]> {
    const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const rows = await this.db
      .select()
      .from(foods)
      .where(
        and(this.visibleTo(userId), or(ilike(foods.name, pattern), ilike(foods.brand, pattern))),
      )
      .orderBy(sql`${foods.ownerId} is null`, foods.name)
      .limit(LIMIT);
    return rows.map(toFoodDto);
  }

  private async frequent(userId: string): Promise<FoodDto[]> {
    const uses = sql<number>`count(${diaryEntries.id})`;
    const rows = await this.db
      .select({ food: foods, uses })
      .from(foods)
      .innerJoin(diaryEntries, eq(diaryEntries.foodId, foods.id))
      .where(and(eq(diaryEntries.userId, userId), this.visibleTo(userId)))
      .groupBy(foods.id)
      .orderBy(desc(uses))
      .limit(LIMIT);
    return rows.map((r) => toFoodDto(r.food));
  }

  async create(userId: string, input: CreateFood): Promise<FoodDto> {
    const [food] = await this.db
      .insert(foods)
      .values({
        name: input.name,
        brand: input.brand ?? null,
        // Штрихкод уникален глобально, у своих продуктов его не храним, чтобы не конфликтовать с общей базой
        barcode: null,
        source: 'manual',
        ownerId: userId,
        ...input.per100g,
      })
      .returning();
    return toFoodDto(food!);
  }
}
