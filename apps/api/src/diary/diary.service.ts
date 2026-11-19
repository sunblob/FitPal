import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
  MEAL_TYPES,
  rescaleNutrients,
  scaleNutrients,
  sumNutrients,
  type CopyDiary,
  type CreateDiaryEntry,
  type DiaryDayDto,
  type DiaryEntryDto,
  type Language,
  type MealType,
  type UpdateDiaryEntry,
} from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { diaryEntries, foods, type DiaryEntry, type User } from '../db/schema.js';

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

    return {
      date,
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
