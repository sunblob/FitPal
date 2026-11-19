import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  workoutPlanBodySchema,
  type GenerateWorkoutPlan,
  type WorkoutPlanBody,
  type WorkoutPlanDto,
  type WorkoutPlanSummaryDto,
} from '@fitpal/shared';
import { ClaudeService } from '../ai/claude.service.js';
import { DB, type Database } from '../db/db.module.js';
import { workoutPlans, type User, type WorkoutPlan } from '../db/schema.js';
import { ExercisesService } from '../exercises/exercises.service.js';
import { buildPlanPrompt, PLAN_SYSTEM } from './plan-prompt.js';

/** Больше кандидатов только раздувает промпт: Claude всё равно берёт 4–8 упражнений на день. */
const MAX_CANDIDATES = 300;

@Injectable()
export class WorkoutsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly claude: ClaudeService,
    private readonly exercises: ExercisesService,
  ) {}

  async generate(user: User, params: GenerateWorkoutPlan): Promise<WorkoutPlanDto> {
    const candidates = await this.exercises.findCandidates(params);
    if (candidates.length === 0) {
      throw new BadRequestException(
        'Каталог упражнений пуст. Запусти импорт: pnpm exercises:import',
      );
    }
    // Сначала упражнения, где выбранная мышца основная, и базовые.
    const muscles = new Set<string>(params.muscles);
    const score = (e: (typeof candidates)[number]) =>
      (e.primaryMuscles.some((m) => muscles.has(m)) ? 2 : 0) + (e.mechanic === 'compound' ? 1 : 0);
    const catalog = candidates.sort((a, b) => score(b) - score(a)).slice(0, MAX_CANDIDATES);

    const body = await this.claude.parse({
      schema: workoutPlanBodySchema,
      system: PLAN_SYSTEM,
      prompt: buildPlanPrompt(params, user, catalog),
      effort: 'medium',
    });

    const plan = this.sanitize(body, new Set(catalog.map((e) => e.id)));
    if (plan.days.every((d) => d.exercises.length === 0)) {
      throw new BadRequestException('Не получилось составить план, попробуй изменить параметры');
    }

    const [row] = await this.db
      .insert(workoutPlans)
      .values({ userId: user.id, title: plan.title, params, plan })
      .returning();
    return this.hydrate(row!);
  }

  async list(userId: string): Promise<WorkoutPlanSummaryDto[]> {
    const rows = await this.db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.userId, userId))
      .orderBy(desc(workoutPlans.createdAt));
    return rows.map((r) => this.summary(r));
  }

  async get(userId: string, id: string): Promise<WorkoutPlanDto> {
    const [row] = await this.db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)));
    if (!row) throw new NotFoundException();
    return this.hydrate(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning({ id: workoutPlans.id });
    if (deleted.length === 0) throw new NotFoundException();
  }

  /** Выкидывает упражнения, которых нет в каталоге-кандидатах, и чинит числа. */
  private sanitize(body: WorkoutPlanBody, allowed: Set<string>): WorkoutPlanBody {
    return {
      ...body,
      days: body.days.map((day) => ({
        ...day,
        exercises: day.exercises
          .filter((e) => allowed.has(e.exerciseId))
          .map((e) => ({
            ...e,
            sets: Math.min(Math.max(e.sets, 1), 10),
            restSec: Math.min(Math.max(e.restSec, 0), 600),
          })),
      })),
    };
  }

  private summary(row: WorkoutPlan): WorkoutPlanSummaryDto {
    return {
      id: row.id,
      title: row.title,
      summary: row.plan.summary,
      daysCount: row.plan.days.length,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async hydrate(row: WorkoutPlan): Promise<WorkoutPlanDto> {
    const ids = row.plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    const byId = await this.exercises.findByIds([...new Set(ids)]);
    return {
      ...this.summary(row),
      params: row.params,
      tips: row.plan.tips,
      days: row.plan.days.map((day) => ({
        name: day.name,
        focus: day.focus,
        exercises: day.exercises.flatMap(({ exerciseId, ...rest }) => {
          const exercise = byId.get(exerciseId);
          return exercise ? [{ ...rest, exercise: this.exercises.toDto(exercise) }] : [];
        }),
      })),
    };
  }
}
