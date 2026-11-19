import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
  MEAL_TYPES,
  scaleNutrients,
  sumNutrients,
  type CreateDiaryEntry,
  type DiaryDayDto,
  type DiaryEntryDto,
  type MealType,
} from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { diaryEntries, foods, type DiaryEntry, type User } from '../db/schema.js';

type FoodLook = { imageUrl: string | null; category: string | null } | null;

function toEntryDto(e: DiaryEntry, food: FoodLook = null): DiaryEntryDto {
  return {
    id: e.id,
    foodId: e.foodId,
    name: e.name,
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
        food: { id: foods.id, imageUrl: foods.imageUrl, category: foods.category },
      })
      .from(diaryEntries)
      .leftJoin(foods, eq(foods.id, diaryEntries.foodId))
      .where(and(eq(diaryEntries.userId, user.id), sql`${localDate} = ${date}::date`))
      .orderBy(asc(diaryEntries.eatenAt), asc(diaryEntries.createdAt));

    const entries = rows.map((r) => toEntryDto(r.entry, r.food));
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

  async add(userId: string, input: CreateDiaryEntry): Promise<DiaryEntryDto> {
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
    if (!entry!.foodId) return toEntryDto(entry!);
    const [food] = await this.db
      .select({ imageUrl: foods.imageUrl, category: foods.category })
      .from(foods)
      .where(eq(foods.id, entry!.foodId));
    return toEntryDto(entry!, food ?? null);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)))
      .returning({ id: diaryEntries.id });
    if (deleted.length === 0) throw new NotFoundException();
  }
}
