import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { CreateFood, FoodDto } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { diaryEntries, foods } from '../db/schema.js';
import { toFoodDto } from './foods.mapper.js';

const LIMIT = 30;

@Injectable()
export class FoodsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Свои продукты пользователя и общие (встроенные, из Open Food Facts). */
  private visibleTo(userId: string) {
    return or(eq(foods.ownerId, userId), isNull(foods.ownerId));
  }

  /**
   * Поиск по названию и бренду. Без запроса возвращает продукты,
   * которые пользователь чаще всего добавлял в дневник.
   */
  async search(userId: string, q: string): Promise<FoodDto[]> {
    if (!q) return this.frequent(userId);

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
