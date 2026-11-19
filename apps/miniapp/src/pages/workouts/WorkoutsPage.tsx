import { useEffect, useState } from 'react';
import {
  LEVEL_LABELS_RU,
  MUSCLE_LABELS_RU,
  WORKOUT_GOAL_LABELS_RU,
  type ExerciseDto,
  type GenerateWorkoutPlan,
  type Muscle,
  type WorkoutPlanDto,
  type WorkoutPlanSummaryDto,
  todayIn,
} from '@fitpal/shared';
import { Icon } from '../../components/Icon';
import { WorkoutToday } from '../../components/WorkoutToday';
import { api, type Me } from '../../lib/api';
import { useWorkoutLog } from '../../lib/workoutLog';
import { ExerciseAnimation } from './ExerciseAnimation';
import { PlanForm } from './PlanForm';
import './workouts.css';

type View =
  | { kind: 'list' }
  | { kind: 'form' }
  | { kind: 'generating' }
  | { kind: 'plan'; plan: WorkoutPlanDto }
  | {
      kind: 'exercise';
      exercise: ExerciseDto;
      /** Подходы, повторы и отдых из плана, если карточку открыли из плана. */
      dose?: ExerciseDose;
      /** Ждём русскую инструкцию с сервера. */
      translating: boolean;
      back: View;
    };

type PlanItem = WorkoutPlanDto['days'][number]['exercises'][number];
type ExerciseDose = Omit<PlanItem, 'exercise'>;

const muscleLabel = (m: string) => MUSCLE_LABELS_RU[m as Muscle] ?? m;

/** Понятный текст ошибки вместо «API 503: {json}». */
function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const json = raw.replace(/^API \d+: /, '');
  try {
    const body: unknown = JSON.parse(json);
    if (body && typeof body === 'object' && 'message' in body) {
      const msg = (body as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
  } catch {
    // не JSON, показываем как есть
  }
  return raw.startsWith('API ') ? 'Что-то пошло не так. Попробуй ещё раз.' : raw;
}

export function WorkoutsPage({ me }: { me: Me }) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const log = useWorkoutLog(todayIn(me.timezone));
  const { reload: reloadLog } = log;
  const [plans, setPlans] = useState<WorkoutPlanSummaryDto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view.kind === 'list')
      void run(async () => setPlans(await api<WorkoutPlanSummaryDto[]>('/workouts')));
  }, [view.kind]);

  useEffect(() => {
    if (view.kind === 'list') reloadLog();
  }, [view.kind, reloadLog]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const toggleDone = (exerciseId: string, sets?: number, planId?: string) =>
    run(() => log.toggle(exerciseId, { sets, planId }));

  const generate = (params: GenerateWorkoutPlan) =>
    run(async () => {
      setView({ kind: 'generating' });
      try {
        const plan = await api<WorkoutPlanDto>('/workouts/generate', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        setView({ kind: 'plan', plan });
      } catch (e) {
        setView({ kind: 'form' });
        throw e;
      }
    });

  const openPlan = (id: string) =>
    run(async () => setView({ kind: 'plan', plan: await api<WorkoutPlanDto>(`/workouts/${id}`) }));

  const removePlan = (id: string) =>
    run(async () => {
      await api<void>(`/workouts/${id}`, { method: 'DELETE' }).catch((e: Error) => {
        // 204 без тела: api() падает на res.json(), это не ошибка.
        if (!(e instanceof SyntaxError)) throw e;
      });
      setView({ kind: 'list' });
    });

  // Если инструкции ещё нет на русском, сервер переводит её по запросу. Пока ждём,
  // показываем заглушку, а не английский текст, который через секунду сменится русским.
  const openExercise = ({ exercise, ...dose }: PlanItem, back: View) => {
    const translating = exercise.instructionsLang === 'en';
    setView({ kind: 'exercise', exercise, dose, translating, back });
    if (!translating) return;
    const done = (full?: ExerciseDto) =>
      setView((v) =>
        v.kind === 'exercise' && v.exercise.id === exercise.id
          ? { ...v, exercise: full ?? v.exercise, translating: false }
          : v,
      );
    void api<ExerciseDto>(`/exercises/${encodeURIComponent(exercise.id)}`).then(done, () => done());
  };

  const errorBox = error && <p className="error">{error}</p>;

  if (view.kind === 'generating') return <Generating />;

  if (view.kind === 'form') {
    return (
      <>
        <div className="wk-topbar">
          <button className="icon-btn" onClick={() => setView({ kind: 'list' })} aria-label="Назад">
            <Icon name="back" />
          </button>
        </div>
        {error && <div className="wk-form-error">{errorBox}</div>}
        <PlanForm busy={busy} onSubmit={generate} />
      </>
    );
  }

  if (view.kind === 'exercise') {
    const ex = view.exercise;
    return (
      <main className="screen">
        <button className="icon-btn" onClick={() => setView(view.back)} aria-label="Назад">
          <Icon name="back" />
        </button>
        <div>
          <h1 className="wk-title">{ex.name}</h1>
          {ex.name !== ex.nameEn && <div className="muted small">{ex.nameEn}</div>}
        </div>
        <ExerciseAnimation images={ex.images} alt={ex.name} />
        {view.dose && (
          <section className="wk-dose">
            <div className="wk-facts">
              <Fact value={String(view.dose.sets)} label="подходов" />
              <Fact value={view.dose.reps} label="повторений" />
              <Fact value={`${view.dose.restSec} с`} label="отдых" />
            </div>
            {view.dose.notes && <p className="wk-dose-notes">{view.dose.notes}</p>}
          </section>
        )}
        {view.dose && (
          <button
            className={log.isDone(ex.id) ? 'wk-done-btn on' : 'wk-done-btn'}
            disabled={busy || log.logs == null}
            onClick={() =>
              toggleDone(
                ex.id,
                view.dose?.sets,
                view.back.kind === 'plan' ? view.back.plan.id : undefined,
              )
            }
          >
            <Icon name="check" size={20} />
            {log.isDone(ex.id) ? 'Сделано сегодня' : 'Отметить выполненным'}
          </button>
        )}
        {errorBox}
        <div className="chips">
          {ex.primaryMuscles.map((m) => (
            <span key={m} className="tag tag-accent">
              {muscleLabel(m)}
            </span>
          ))}
          {ex.secondaryMuscles.map((m) => (
            <span key={m} className="tag">
              {muscleLabel(m)}
            </span>
          ))}
        </div>
        {view.translating ? (
          <section className="card" aria-busy="true">
            <div className="card-title">Как выполнять</div>
            <div className="wk-steps-skeleton" aria-label="Загружаем технику">
              <span />
              <span />
              <span />
            </div>
          </section>
        ) : (
          ex.instructions.length > 0 && (
            <section className="card">
              <div className="card-title">Как выполнять</div>
              <ol className="wk-steps">
                {ex.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
          )
        )}
        <a className="wk-yt" href={ex.youtubeUrl} target="_blank" rel="noreferrer">
          ▶ Видео с техникой
        </a>
      </main>
    );
  }

  if (view.kind === 'plan') {
    const { plan } = view;
    return (
      <main className="screen">
        <button
          className="icon-btn"
          onClick={() => setView({ kind: 'list' })}
          aria-label="К списку планов"
        >
          <Icon name="back" />
        </button>

        <section className="wk-plan-hero">
          <div className="wk-plan-hero-icon">
            <Icon name="dumbbell" size={26} />
          </div>
          <h1 className="wk-title">{plan.title}</h1>
          {plan.summary && <p className="wk-plan-summary">{plan.summary}</p>}
          <div className="wk-facts">
            <Fact value={String(plan.params.daysPerWeek)} label="трен. в неделю" />
            <Fact value={String(plan.params.sessionMinutes)} label="минут" />
            <Fact value={WORKOUT_GOAL_LABELS_RU[plan.params.goal]} label="цель" />
            <Fact value={LEVEL_LABELS_RU[plan.params.level]} label="уровень" />
          </div>
        </section>

        {plan.days.map((day, di) => (
          <section className="card wk-day-card" key={di}>
            <div className="wk-day-head">
              <span className="wk-day-num">{di + 1}</span>
              <div className="wk-day-text">
                <h2 className="wk-day">{day.name}</h2>
                {day.focus && <div className="muted small">{day.focus}</div>}
              </div>
              <span className="muted small nowrap">
                {day.exercises.some((i) => log.isDone(i.exercise.id))
                  ? `${day.exercises.filter((i) => log.isDone(i.exercise.id)).length} из ${day.exercises.length}`
                  : `${day.exercises.length} упр.`}
              </span>
            </div>
            <div className="wk-ex-list">
              {day.exercises.map((item, ei) => (
                <div className="wk-ex-row" key={ei}>
                  <button className="wk-ex" onClick={() => openExercise(item, view)}>
                    <ExerciseAnimation
                      images={item.exercise.images}
                      alt={item.exercise.name}
                      size="small"
                    />
                    <span className="wk-ex-text">
                      <b>{item.exercise.name}</b>
                      <span className="wk-ex-meta">
                        <span className="tag tag-accent">
                          {item.sets} × {item.reps}
                        </span>
                        <span className="tag">отдых {item.restSec} с</span>
                      </span>
                      {item.notes && <span className="muted small">{item.notes}</span>}
                    </span>
                  </button>
                  <button
                    className={log.isDone(item.exercise.id) ? 'wk-check on' : 'wk-check'}
                    disabled={busy || log.logs == null}
                    aria-pressed={log.isDone(item.exercise.id)}
                    aria-label={`Сделано: ${item.exercise.name}`}
                    onClick={() => toggleDone(item.exercise.id, item.sets, plan.id)}
                  >
                    <Icon name="check" size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        {plan.tips.length > 0 && (
          <section className="card wk-tips">
            <div className="card-title">Советы</div>
            <ul className="wk-steps">
              {plan.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}
        <button className="wk-danger" disabled={busy} onClick={() => removePlan(plan.id)}>
          Удалить план
        </button>
        {errorBox}
      </main>
    );
  }

  return (
    <main className="screen">
      <h1>Тренировки</h1>
      {log.logs && (
        <WorkoutToday
          logs={log.logs}
          title="Сегодня"
          showList
          empty="Открой план и отмечай упражнения, которые сделал"
        />
      )}
      <section className="card wk-cta">
        <div className="wk-cta-icon">
          <Icon name="dumbbell" size={28} />
        </div>
        <div className="card-title">Персональный план</div>
        <p className="muted">
          Выбери цель, мышцы и инвентарь. План с подходами, отдыхом и техникой будет готов за
          минуту.
        </p>
        <button className="primary" onClick={() => setView({ kind: 'form' })}>
          Составить план
        </button>
      </section>

      {plans && plans.length > 0 && (
        <>
          <div className="section-label">Мои планы</div>
          <div className="list">
            {plans.map((p) => (
              <button
                className="food-row wk-plan"
                key={p.id}
                onClick={() => openPlan(p.id)}
                disabled={busy}
              >
                <span className="wk-plan-icon">
                  <Icon name="dumbbell" size={20} />
                </span>
                <span className="food-name">
                  {p.title}
                  <span className="muted small">
                    {p.daysCount} трен. в неделю ·{' '}
                    {new Date(p.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </span>
                <span className="wk-chevron" aria-hidden="true">
                  <Icon name="forward" size={18} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {errorBox}
    </main>
  );
}

function Fact(props: { value: string; label: string }) {
  return (
    <div className="wk-fact">
      <b>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}

const STEPS = [
  'Изучаем цель и уровень подготовки',
  'Подбираем упражнения под твой инвентарь',
  'Распределяем нагрузку по дням',
  'Считаем подходы, повторы и отдых',
  'Проверяем, чтобы всё сходилось',
];

/** Экран ожидания, пока сервер составляет план (обычно 20–60 секунд). */
function Generating() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="screen wk-generating">
      <div className="wk-orb" aria-hidden="true">
        <Icon name="dumbbell" size={40} />
      </div>
      <h2>Составляем твой план</h2>
      <p className="muted">Обычно это занимает до минуты. Не закрывай приложение.</p>
      <ul className="wk-gen-steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={i < step ? 'wk-gen-done' : i === step ? 'wk-gen-active' : undefined}
          >
            <span className="wk-gen-mark" aria-hidden="true" />
            {s}
          </li>
        ))}
      </ul>
    </main>
  );
}
