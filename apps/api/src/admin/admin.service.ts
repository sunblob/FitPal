import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type {
  AdminDayStat,
  AdminDiaryUpdate,
  AdminExerciseUpdate,
  AdminFoodCreate,
  AdminFoodUpdate,
  AdminListQuery,
  AdminPage,
  AdminStats,
  AdminUserUpdate,
  FoodSource,
} from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import {
  aiRequests,
  diaryEntries,
  exercises,
  foods,
  users,
  workoutPlans,
  type Food,
} from '../db/schema.js';
import { buildSearchText, normalize } from '../foods/search-text.js';

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Условие поиска «подстрока в любом из полей» или undefined, если запрос пустой. */
function searchIn(q: string | undefined, columns: (PgColumn | SQL)[]): SQL | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  const pattern = `%${escapeLike(term)}%`;
  return or(...columns.map((c) => ilike(c, pattern)));
}

const n = (v: unknown) => Number(v ?? 0);

@Injectable()
export class AdminService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private async page<T>(
    table: PgTable,
    where: SQL | undefined,
    query: AdminListQuery,
    rows: (limit: number, offset: number) => Promise<T[]>,
  ): Promise<AdminPage<T>> {
    const { page, pageSize } = query;
    const [items, [total]] = await Promise.all([
      rows(pageSize, (page - 1) * pageSize),
      this.db.select({ value: count() }).from(table).where(where),
    ]);
    return { items, total: total?.value ?? 0, page, pageSize };
  }

  // ---------- Статистика ----------

  async stats(): Promise<AdminStats> {
    const [u] = await this.db
      .select({
        total: count(),
        activeToday: sql<number>`count(*) filter (where ${users.lastSeenAt} >= date_trunc('day', now()))`,
        active7d: sql<number>`count(*) filter (where ${users.lastSeenAt} >= now() - interval '7 days')`,
        new7d: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '7 days')`,
        new30d: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '30 days')`,
      })
      .from(users);

    const [d] = await this.db
      .select({
        total: count(),
        today: sql<number>`count(*) filter (where ${diaryEntries.createdAt} >= date_trunc('day', now()))`,
        last7d: sql<number>`count(*) filter (where ${diaryEntries.createdAt} >= now() - interval '7 days')`,
      })
      .from(diaryEntries);

    const [a] = await this.db
      .select({
        today: sql<number>`count(*) filter (where ${aiRequests.createdAt} >= date_trunc('day', now()))`,
        last7d: sql<number>`count(*) filter (where ${aiRequests.createdAt} >= now() - interval '7 days')`,
        last30d: count(),
        failed7d: sql<number>`count(*) filter (where not ${aiRequests.ok} and ${aiRequests.createdAt} >= now() - interval '7 days')`,
        inputTokens30d: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
        outputTokens30d: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`,
      })
      .from(aiRequests)
      .where(sql`${aiRequests.createdAt} >= now() - interval '30 days'`);

    const byKind = await this.db
      .select({ kind: aiRequests.kind, count: count() })
      .from(aiRequests)
      .where(sql`${aiRequests.createdAt} >= now() - interval '30 days'`)
      .groupBy(aiRequests.kind)
      .orderBy(desc(count()));

    const [[f], [e], [w]] = await Promise.all([
      this.db.select({ value: count() }).from(foods),
      this.db.select({ value: count() }).from(exercises),
      this.db.select({ value: count() }).from(workoutPlans),
    ]);

    return {
      users: {
        total: n(u?.total),
        activeToday: n(u?.activeToday),
        active7d: n(u?.active7d),
        new7d: n(u?.new7d),
        new30d: n(u?.new30d),
      },
      diary: { total: n(d?.total), today: n(d?.today), last7d: n(d?.last7d) },
      ai: {
        today: n(a?.today),
        last7d: n(a?.last7d),
        last30d: n(a?.last30d),
        failed7d: n(a?.failed7d),
        inputTokens30d: n(a?.inputTokens30d),
        outputTokens30d: n(a?.outputTokens30d),
        byKind30d: byKind.map((r) => ({ kind: r.kind, count: n(r.count) })),
      },
      catalog: { foods: n(f?.value), exercises: n(e?.value), workoutPlans: n(w?.value) },
      daily: await this.daily(),
    };
  }

  /** По дням за 30 дней (UTC). Активный за день: любая запись или AI-запрос в этот день. */
  private async daily(): Promise<AdminDayStat[]> {
    const rows = await this.db.execute<{
      date: string;
      signups: string;
      active_users: string;
      diary_entries: string;
      ai_requests: string;
    }>(sql`
      with days as (
        select generate_series(
          (now() at time zone 'utc')::date - 29,
          (now() at time zone 'utc')::date,
          interval '1 day'
        )::date as d
      ),
      activity as (
        select user_id, created_at from diary_entries
        union all select user_id, created_at from weight_logs
        union all select user_id, created_at from step_logs
        union all select user_id, created_at from exercise_logs
        union all select user_id, created_at from ai_requests where user_id is not null
      )
      select
        to_char(days.d, 'YYYY-MM-DD') as date,
        (select count(*) from users
          where (users.created_at at time zone 'utc')::date = days.d) as signups,
        (select count(distinct user_id) from activity
          where (activity.created_at at time zone 'utc')::date = days.d) as active_users,
        (select count(*) from diary_entries
          where (diary_entries.created_at at time zone 'utc')::date = days.d) as diary_entries,
        (select count(*) from ai_requests
          where (ai_requests.created_at at time zone 'utc')::date = days.d) as ai_requests
      from days
      order by days.d
    `);
    return [...rows].map((r) => ({
      date: r.date,
      signups: n(r.signups),
      activeUsers: n(r.active_users),
      diaryEntries: n(r.diary_entries),
      aiRequests: n(r.ai_requests),
    }));
  }

  // ---------- Пользователи ----------

  listUsers(query: AdminListQuery) {
    const where = searchIn(query.q, [
      users.username,
      users.firstName,
      sql`${users.telegramId}::text`,
    ]);
    return this.page(users, where, query, (limit, offset) =>
      this.db
        .select({
          ...getTableColumns(users),
          // Имена с таблицей явно: внутри select drizzle пишет колонки без префикса
          diaryCount: sql<number>`(select count(*)::int from diary_entries d where d.user_id = users.id)`,
          aiCount: sql<number>`(select count(*)::int from ai_requests a where a.user_id = users.id)`,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
    );
  }

  async updateUser(id: string, patch: AdminUserUpdate) {
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (!row) throw new NotFoundException();
    return row;
  }

  async deleteUser(id: string): Promise<void> {
    const rows = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (rows.length === 0) throw new NotFoundException();
  }

  // ---------- Продукты ----------

  listFoods(query: AdminListQuery & { source?: FoodSource }) {
    const term = query.q?.trim();
    const where = and(
      query.source ? eq(foods.source, query.source) : undefined,
      term
        ? or(
            searchIn(term, [foods.name, foods.nameEn, foods.brand, foods.barcode]),
            sql`${foods.searchText} like ${`%${escapeLike(normalize(term))}%`}`,
          )
        : undefined,
    );
    return this.page(foods, where, query, (limit, offset) =>
      this.db
        .select()
        .from(foods)
        .where(where)
        .orderBy(desc(foods.updatedAt))
        .limit(limit)
        .offset(offset),
    );
  }

  async createFood(input: AdminFoodCreate): Promise<Food> {
    const [row] = await this.db
      .insert(foods)
      .values({ ...input, searchText: buildSearchText(input) })
      .returning();
    return row!;
  }

  async updateFood(id: string, patch: AdminFoodUpdate): Promise<Food> {
    const current = await this.db.query.foods.findFirst({ where: eq(foods.id, id) });
    if (!current) throw new NotFoundException();
    const next = { ...current, ...patch };
    const [row] = await this.db
      .update(foods)
      .set({ ...patch, searchText: buildSearchText(next) })
      .where(eq(foods.id, id))
      .returning();
    return row!;
  }

  async deleteFood(id: string): Promise<void> {
    const rows = await this.db.delete(foods).where(eq(foods.id, id)).returning({ id: foods.id });
    if (rows.length === 0) throw new NotFoundException();
  }

  // ---------- Упражнения ----------

  listExercises(query: AdminListQuery) {
    const where = searchIn(query.q, [exercises.id, exercises.nameEn, exercises.nameRu]);
    return this.page(exercises, where, query, (limit, offset) =>
      this.db
        .select()
        .from(exercises)
        .where(where)
        .orderBy(exercises.nameEn)
        .limit(limit)
        .offset(offset),
    );
  }

  async updateExercise(id: string, patch: AdminExerciseUpdate) {
    const [row] = await this.db
      .update(exercises)
      .set(patch)
      .where(eq(exercises.id, id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }

  // ---------- Дневник ----------

  listDiary(query: AdminListQuery & { userId?: string }) {
    const where = and(
      query.userId ? eq(diaryEntries.userId, query.userId) : undefined,
      searchIn(query.q, [diaryEntries.name]),
    );
    return this.page(diaryEntries, where, query, (limit, offset) =>
      this.db
        .select({
          id: diaryEntries.id,
          userId: diaryEntries.userId,
          foodId: diaryEntries.foodId,
          name: diaryEntries.name,
          meal: diaryEntries.meal,
          grams: diaryEntries.grams,
          kcal: diaryEntries.kcal,
          protein: diaryEntries.protein,
          fat: diaryEntries.fat,
          carbs: diaryEntries.carbs,
          eatenAt: diaryEntries.eatenAt,
          createdAt: diaryEntries.createdAt,
          user: {
            telegramId: users.telegramId,
            username: users.username,
            firstName: users.firstName,
          },
        })
        .from(diaryEntries)
        .innerJoin(users, eq(users.id, diaryEntries.userId))
        .where(where)
        .orderBy(desc(diaryEntries.eatenAt))
        .limit(limit)
        .offset(offset),
    );
  }

  async updateDiary(id: string, patch: AdminDiaryUpdate) {
    const { eatenAt, ...rest } = patch;
    const [row] = await this.db
      .update(diaryEntries)
      .set({ ...rest, ...(eatenAt ? { eatenAt: new Date(eatenAt) } : {}) })
      .where(eq(diaryEntries.id, id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }

  async deleteDiary(id: string): Promise<void> {
    const rows = await this.db
      .delete(diaryEntries)
      .where(eq(diaryEntries.id, id))
      .returning({ id: diaryEntries.id });
    if (rows.length === 0) throw new NotFoundException();
  }
}
