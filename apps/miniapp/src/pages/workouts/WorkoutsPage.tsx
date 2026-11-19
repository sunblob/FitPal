import { useEffect, useState } from 'react';
import {
  MUSCLE_LABELS_RU,
  type ExerciseDto,
  type GenerateWorkoutPlan,
  type Muscle,
  type WorkoutPlanDto,
  type WorkoutPlanSummaryDto,
} from '@fitpal/shared';
import { api } from '../../lib/api';
import { ExerciseAnimation } from './ExerciseAnimation';
import { PlanForm } from './PlanForm';
import './workouts.css';

type View =
  | { kind: 'list' }
  | { kind: 'form' }
  | { kind: 'plan'; plan: WorkoutPlanDto }
  | { kind: 'exercise'; exercise: ExerciseDto; back: View };

const muscleLabel = (m: string) => MUSCLE_LABELS_RU[m as Muscle] ?? m;

export function WorkoutsPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [plans, setPlans] = useState<WorkoutPlanSummaryDto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view.kind === 'list')
      void run(async () => setPlans(await api<WorkoutPlanSummaryDto[]>('/workouts')));
  }, [view.kind]);

  const generate = (params: GenerateWorkoutPlan) =>
    run(async () => {
      const plan = await api<WorkoutPlanDto>('/workouts/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      setView({ kind: 'plan', plan });
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

  // Детали подгружаем отдельно: там русская инструкция, которую сервер переводит при первом открытии.
  const openExercise = (exercise: ExerciseDto, back: View) => {
    setView({ kind: 'exercise', exercise, back });
    void api<ExerciseDto>(`/exercises/${encodeURIComponent(exercise.id)}`).then(
      (full) =>
        setView((v) =>
          v.kind === 'exercise' && v.exercise.id === full.id ? { ...v, exercise: full } : v,
        ),
      () => undefined,
    );
  };

  const errorBox = error && <pre className="error">{error}</pre>;

  if (view.kind === 'form') {
    return (
      <>
        <button className="wk-back" onClick={() => setView({ kind: 'list' })}>
          ← Назад
        </button>
        <PlanForm busy={busy} onSubmit={generate} />
        {errorBox}
      </>
    );
  }

  if (view.kind === 'exercise') {
    const ex = view.exercise;
    return (
      <main className="screen">
        <button className="wk-back" onClick={() => setView(view.back)}>
          ← Назад
        </button>
        <h1>{ex.name}</h1>
        {ex.name !== ex.nameEn && <div className="muted">{ex.nameEn}</div>}
        <ExerciseAnimation images={ex.images} alt={ex.name} />
        <div className="muted">
          {ex.primaryMuscles.map(muscleLabel).join(', ')}
          {ex.secondaryMuscles.length > 0 &&
            ` · также ${ex.secondaryMuscles.map(muscleLabel).join(', ')}`}
        </div>
        <section className="card">
          <ol className="wk-steps">
            {ex.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
        <a className="wk-yt" href={ex.youtubeUrl} target="_blank" rel="noreferrer">
          ▶ Видео на YouTube
        </a>
      </main>
    );
  }

  if (view.kind === 'plan') {
    const { plan } = view;
    return (
      <main className="screen">
        <button className="wk-back" onClick={() => setView({ kind: 'list' })}>
          ← Мои планы
        </button>
        <h1>{plan.title}</h1>
        <p className="muted">{plan.summary}</p>
        {plan.days.map((day, di) => (
          <section className="card" key={di}>
            <h2 className="wk-day">{day.name}</h2>
            <div className="muted">{day.focus}</div>
            {day.exercises.map((item, ei) => (
              <button className="wk-ex" key={ei} onClick={() => openExercise(item.exercise, view)}>
                <ExerciseAnimation
                  images={item.exercise.images}
                  alt={item.exercise.name}
                  size="small"
                />
                <span className="wk-ex-text">
                  <b>{item.exercise.name}</b>
                  <span>
                    {item.sets} × {item.reps} · отдых {item.restSec} с
                  </span>
                  {item.notes && <span className="muted">{item.notes}</span>}
                </span>
              </button>
            ))}
          </section>
        ))}
        {plan.tips.length > 0 && (
          <section className="card">
            <div className="muted">Советы</div>
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
      <button onClick={() => setView({ kind: 'form' })}>Составить план с Claude</button>
      {plans?.length === 0 && (
        <p className="muted">Планов пока нет. Выбери цель и мышцы, остальное сделает Claude.</p>
      )}
      {plans?.map((p) => (
        <button className="card wk-plan" key={p.id} onClick={() => openPlan(p.id)} disabled={busy}>
          <b>{p.title}</b>
          <span className="muted">
            {p.daysCount} трен. в неделю · {new Date(p.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </button>
      ))}
      {errorBox}
    </main>
  );
}
