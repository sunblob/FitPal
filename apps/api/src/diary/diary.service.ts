import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import {
  MEAL_TYPES,
  rescaleNutrients,
  scaleNutrients,
  streakDto,
  todayIn,
  addDays,
  sumNutrients,
  type CloseDay,
  type CopyDiary,
  type CreateDiaryEntry,
  type DiaryDayDto,
  type DiaryEntryDto,
  type Language,
  type MealType,
  type StreakDto,
  type WeekSummaryDto,
  type UpdateDiaryEntry,
} from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { closedDays, diaryEntries, foods, type DiaryEntry, type User } from '../db/schema.js';

type FoodLook = {
  name: string;
  nameEn: string | null;
  imageUrl: string | null;
  category: string | null;
} | null;

/**
 * Название в записи копируется на момент записи. Если запись сделана из справочника и не
 * переименована, показываем название на текущем языке пользователя.
 */
function entryName(e: DiaryEntry, food: FoodLook, lang: Language): string {
  if (!food?.nameEn || (e.name !== food.name && e.name !== food.nameEn)) return e.name;
  return lang === 'en' ? food.nameEn : food.name;
}

function toEntryDto(e: DiaryEntry, food: FoodLook, lang: Language): DiaryEntryDto {
  return {
    id: e.id,
    foodId: e.foodId,
    name: entryName(e, food, lang),
    meal: e.meal,
    grams: e.grams,
    eatenAt: e.eatenAt.toISOString(),
    nutrients: { kcal: e.kcal, protein: e.protein, fat: e.fat, carbs: e.carbs },
    imageUrl: food?.imageUrl ?? null,
    category: food?.category ?? null,
  };
}

@Injectable()
export class DiaryService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Записи за день с итогами по приёмам пищи. День считается в таймзоне пользователя. */
  async day(user: User, date: string): Promise<DiaryDayDto> {
    const localDate = sql`(${diaryEntries.eatenAt} at time zone ${user.timezone})::date`;
    const rows = await this.db
      .select({
        entry: diaryEntries,
        // id первым: drizzle решает, что left join пустой, по первому полю объекта
        food: {
          id: foods.id,
          name: foods.name,
          nameEn: foods.nameEn,
          imageUrl: foods.imageUrl,
          category: foods.category,
        },
      })
      .from(diaryEntries)
      .leftJoin(foods, eq(foods.id, diaryEntries.foodId))
      .where(and(eq(diaryEntries.userId, user.id), sql`${localDate} = ${date}::date`))
      .orderBy(asc(diaryEntries.eatenAt), asc(diaryEntries.createdAt));

    const entries = rows.map((r) => toEntryDto(r.entry, r.food, user.language));
    const meals = Object.fromEntries(
      MEAL_TYPES.map((meal) => {
        const list = entries.filter((e) => e.meal === meal);
        return [meal, { entries: list, totals: sumNutrients(list.map((e) => e.nutrients)) }];
      }),
    ) as DiaryDayDto['meals'];

    const target =
      user.targetKcal != null
        ? {
            kcal: user.targetKcal,
            protein: user.targetProtein ?? 0,
            fat: user.targetFat ?? 0,
            carbs: user.targetCarbs ?? 0,
          }
        : null;

    const [closed] = await this.db
      .select({ date: closedDays.date })
      .from(closedDays)
      .where(and(eq(closedDays.userId, user.id), eq(closedDays.date, date)));

    return {
      date,
      closed: closed != null,
      target,
      totals: sumNutrients(entries.map((e) => e.nutrients)),
      meals,
    };
  }

  async add(userId: string, input: CreateDiaryEntry, lang: Language): Promise<DiaryEntryDto> {
    const n = scaleNutrients(input.per100g, input.grams);
    const [entry] = await this.db
      .insert(diaryEntries)
      .values({
        userId,
        foodId: input.foodId ?? null,
        name: input.name,
        meal: input.meal as MealType,
        grams: input.grams,
        ...n,
        ...(input.eatenAt ? { eatenAt: new Date(input.eatenAt) } : {}),
      })
      .returning();
    return this.withFood(entry!, lang);
  }

  /** Итоги КБЖУ за 7 дней, заканчивая днём date (по таймзоне пользователя). */
  async week(user: User, date: string): Promise<WeekSummaryDto> {
    const from = addDays(date, -6);
    const localDate = sql<string>`to_char(${diaryEntries.eatenAt} at time zone ${user.timezone}, 'YYYY-MM-DD')`;
    const rows = await this.db
      .select({
        date: localDate,
        kcal: sql<number>`sum(${diaryEntries.kcal})::float`,
        protein: sql<number>`sum(${diaryEntries.protein})::float`,
        fat: sql<number>`sum(${diaryEntries.fat})::float`,
        carbs: sql<number>`sum(${diaryEntries.carbs})::float`,
      })
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.userId, user.id),
          sql`(${diaryEntries.eatenAt} at time zone ${user.timezone})::date between ${from}::date and ${date}::date`,
        ),
      )
      // По номеру колонки: таймзона передаётся параметром, и одно и то же выражение
      // в select и group by для Postgres выглядит разным
      .groupBy(sql`1`);
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return {
      days: Array.from({ length: 7 }, (_, i) => {
        const d = addDays(from, i);
        const r = byDate.get(d);
        return {
          date: d,
          nutrients: r
            ? {
                kcal: Math.round(r.kcal),
                protein: r1(r.protein),
                fat: r1(r.fat),
                carbs: r1(r.carbs),
              }
            : { kcal: 0, protein: 0, fat: 0, carbs: 0 },
        };
      }),
      target:
        user.targetKcal != null
          ? {
              kcal: user.targetKcal,
              protein: user.targetProtein ?? 0,
              fat: user.targetFat ?? 0,
              carbs: user.targetCarbs ?? 0,
            }
          : null,
    };
  }

  async setClosed(userId: string, input: CloseDay): Promise<void> {
    if (input.closed) {
      await this.db.insert(closedDays).values({ userId, date: input.date }).onConflictDoNothing();
    } else {
      await this.db
        .delete(closedDays)
        .where(and(eq(closedDays.userId, userId), eq(closedDays.date, input.date)));
    }
  }

  /** Местные даты за последний год, в которые есть записи или день отмечен заполненным. */
  async loggedDates(user: User): Promise<Set<string>> {
    const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const localDate = sql<string>`to_char(${diaryEntries.eatenAt} at time zone ${user.timezone}, 'YYYY-MM-DD')`;
    const [entries, closed] = await Promise.all([
      this.db
        .selectDistinct({ date: localDate })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.userId, user.id), gte(diaryEntries.eatenAt, since))),
      this.db
        .select({ date: closedDays.date })
        .from(closedDays)
        .where(eq(closedDays.userId, user.id)),
    ]);
    return new Set([...entries, ...closed].map((r) => r.date));
  }

  async streak(user: User): Promise<StreakDto> {
    return streakDto(await this.loggedDates(user), todayIn(user.timezone));
  }

  /**
   * Повторяет записи другого дня (весь день или один приём пищи) в выбранный день.
   * Время суток сохраняется, считается в таймзоне пользователя. КБЖУ копируются как есть.
   */
  async copy(user: User, input: CopyDiary): Promise<{ copied: number }> {
    const tz = user.timezone;
    const localDate = sql`(${diaryEntries.eatenAt} at time zone ${tz})::date`;
    const source = await this.db
      .select()
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.userId, user.id),
          sql`${localDate} = ${input.fromDate}::date`,
          input.meal ? eq(diaryEntries.meal, input.meal) : undefined,
        ),
      );
    if (source.length === 0) return { copied: 0 };

    await this.db.insert(diaryEntries).values(
      source.map((e) => ({
        userId: user.id,
        foodId: e.foodId,
        name: e.name,
        meal: e.meal,
        grams: e.grams,
        kcal: e.kcal,
        protein: e.protein,
        fat: e.fat,
        carbs: e.carbs,
        eatenAt: sql`(${input.toDate}::date + (${e.eatenAt.toISOString()}::timestamptz at time zone ${tz})::time) at time zone ${tz}`,
      })),
    );
    return { copied: source.length };
  }

  /** Меняет вес, приём пищи или время записи. При смене веса КБЖУ пересчитываются. */
  async update(
    userId: string,
    id: string,
    input: UpdateDiaryEntry,
    lang: Language,
  ): Promise<DiaryEntryDto> {
    const [current] = await this.db
      .select()
      .from(diaryEntries)
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)));
    if (!current) throw new NotFoundException();

    const nutrients =
      input.grams != null && input.grams !== current.grams
        ? rescaleNutrients(
            {
              kcal: current.kcal,
              protein: current.protein,
              fat: current.fat,
              carbs: current.carbs,
            },
            current.grams,
            input.grams,
          )
        : {};
    const [entry] = await this.db
      .update(diaryEntries)
      .set({
        ...(input.grams != null ? { grams: input.grams } : {}),
        ...nutrients,
        ...(input.meal ? { meal: input.meal } : {}),
        ...(input.eatenAt ? { eatenAt: new Date(input.eatenAt) } : {}),
      })
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)))
      .returning();
    return this.withFood(entry!, lang);
  }

  private async withFood(entry: DiaryEntry, lang: Language): Promise<DiaryEntryDto> {
    if (!entry.foodId) return toEntryDto(entry, null, lang);
    const [food] = await this.db
      .select({
        name: foods.name,
        nameEn: foods.nameEn,
        imageUrl: foods.imageUrl,
        category: foods.category,
      })
      .from(foods)
      .where(eq(foods.id, entry.foodId));
    return toEntryDto(entry, food ?? null, lang);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)))
      .returning({ id: diaryEntries.id });
    if (deleted.length === 0) throw new NotFoundException();
  }
}
