import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import type { CreateFood, FoodDto } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { diaryEntries, foods, type Food } from '../db/schema.js';
import { toFoodDto } from './foods.mapper.js';
import { seedGenericFoods } from './generic-foods.seed.js';
import { OpenFoodFactsClient } from './open-food-facts.client.js';
import type { OffProduct } from './open-food-facts.js';
import { buildSearchText, queryTerms } from './search-text.js';

const LIMIT = 30;
/** С какой длины запроса идём во внешнюю базу. */
const REMOTE_MIN_QUERY = 3;
/** Если своих результатов меньше, добираем из Open Food Facts (он медленный и нестабильный). */
const REMOTE_BELOW = 10;

const escapeLike = (s: string) => s.replace(/[%_\\]/g, '\\$&');

@Injectable()
export class FoodsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FoodsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly off: OpenFoodFactsClient,
  ) {}

  /** Загружает встроенный справочник при старте. Ошибка не мешает API подняться. */
  async onApplicationBootstrap() {
    try {
      const count = await seedGenericFoods(this.db);
      this.logger.log(`Справочник продуктов загружен: ${count}`);
    } catch (e) {
      this.logger.error(`Не удалось загрузить справочник продуктов: ${(e as Error).message}`);
    }
  }

  /** Свои продукты пользователя и общие (встроенные, из Open Food Facts). */
  private visibleTo(userId: string) {
    return or(eq(foods.ownerId, userId), isNull(foods.ownerId));
  }

  /**
   * Поиск по названию, синонимам и бренду: сначала своя база (справочник, свои продукты,
   * кэш), затем Open Food Facts, если своих результатов мало. Найденное во внешней базе
   * кэшируется. Без запроса возвращает продукты, которые пользователь чаще всего добавлял.
   */
  async search(userId: string, q: string): Promise<FoodDto[]> {
    if (!q) return this.frequent(userId);

    const local = await this.searchLocal(userId, q);
    if (q.length < REMOTE_MIN_QUERY || local.length >= REMOTE_BELOW) return local;

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
          searchText: buildSearchText(p),
          ...p.per100g,
        })),
      )
      .onConflictDoUpdate({
        target: foods.barcode,
        set: {
          name: sql`excluded.name`,
          brand: sql`excluded.brand`,
          searchText: sql`excluded.search_text`,
          kcal: sql`excluded.kcal`,
          protein: sql`excluded.protein`,
          fat: sql`excluded.fat`,
          carbs: sql`excluded.carbs`,
        },
      })
      .returning();
  }

  /**
   * Каждое слово запроса (основа, см. queryTerms) должно встречаться в search_text.
   * Порядок: название начинается с запроса, затем слово начинается с запроса, затем
   * вхождение где угодно; при равенстве справочник (в порядке файла), свои продукты, кэш OFF; короче выше.
   */
  private async searchLocal(userId: string, q: string): Promise<FoodDto[]> {
    const terms = queryTerms(q);
    if (terms.length === 0) return [];
    const first = escapeLike(terms[0]!);
    const matchRank = sql`case
      when ${foods.searchText} like ${first + '%'} then 0
      when ${foods.searchText} like ${'% ' + first + '%'} then 1
      else 2 end`;
    const sourceRank = sql`case
      when ${foods.source} = 'builtin' then 0
      when ${foods.ownerId} is not null then 1
      else 2 end`;
    const rows = await this.db
      .select()
      .from(foods)
      .where(
        and(
          this.visibleTo(userId),
          ...terms.map((t) => like(foods.searchText, `%${escapeLike(t)}%`)),
        ),
      )
      .orderBy(
        matchRank,
        sourceRank,
        sql`${foods.sortOrder} nulls last`,
        sql`length(${foods.name})`,
        foods.name,
      )
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
        searchText: buildSearchText({ name: input.name, brand: input.brand }),
        ...input.per100g,
      })
      .returning();
    return toFoodDto(food!);
  }
}
