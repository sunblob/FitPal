import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  addDays,
  mealBudgets,
  todayIn,
  type DiaryDayDto,
  type DiaryEntryDto,
  type MealType,
  type StreakDto,
} from '@fitpal/shared';
import { CalorieRing } from '../../components/CalorieRing';
import { FoodThumb } from '../../components/FoodThumb';
import { Icon, type IconName } from '../../components/Icon';
import { MacroBar } from '../../components/MacroBar';
import { StepsCard } from '../../components/StepsCard';
import { WorkoutToday } from '../../components/WorkoutToday';
import { getLanguage, L, locale } from '../../i18n';
import { useWorkoutLog } from '../../lib/workoutLog';
import { api, del, post, put, type Me } from '../../lib/api';
import { formatDate } from '../../lib/profile';
import { AddFoodSheet } from './AddFoodSheet';
import { EditEntrySheet } from './EditEntrySheet';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🥣',
  lunch: '🍲',
  dinner: '🥗',
  snack: '🍏',
};

const weekday = (date: string) => {
  const name = new Date(`${date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const weekdayShort = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'narrow' });

function Stat(props: { icon: IconName; label: string; value: number | undefined }) {
  return (
    <div className="stat">
      <span className="stat-icon">
        <Icon name={props.icon} size={18} />
      </span>
      <div>
        <div className="muted small">{props.label}</div>
        <div className="stat-value">{props.value ?? '—'}</div>
      </div>
    </div>
  );
}

export function DiaryPage({ me }: { me: Me }) {
  const today = todayIn(me.timezone);
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<DiaryDayDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<DiaryEntryDto | null>(null);
  /** Предыдущий день: из него предлагаем повторить приём пищи или весь день. */
  const [prevDay, setPrevDay] = useState<DiaryDayDto | null>(null);
  const [copying, setCopying] = useState(false);
  const workout = useWorkoutLog(date);
  const prevDate = addDays(date, -1);

  const [streak, setStreak] = useState<StreakDto | null>(null);

  const load = useCallback(() => {
    api<DiaryDayDto>(`/diary?date=${date}`).then(setDay, (e: Error) => setError(e.message));
    api<StreakDto>('/diary/streak').then(setStreak, () => setStreak(null));
  }, [date]);

  async function setClosed(closed: boolean) {
    try {
      await put('/diary/closed', { date, closed });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(load, [load]);

  useEffect(() => {
    setPrevDay(null);
    api<DiaryDayDto>(`/diary?date=${prevDate}`).then(setPrevDay, () => setPrevDay(null));
  }, [prevDate]);

  async function repeat(meal?: MealType) {
    setCopying(true);
    try {
      await post('/diary/copy', { fromDate: prevDate, toDate: date, meal });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  // Полоса «осталось N ккал» появляется, когда кольцо с нормой уехало за экран
  const heroRef = useRef<HTMLElement>(null);
  const [heroHidden, setHeroHidden] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroHidden(!e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  async function remove(id: string) {
    await del(`/diary/${id}`);
    load();
  }

  const mealLabels = MEAL_LABELS[getLanguage()];
  const target = day?.target;
  const eaten = day?.totals.kcal ?? 0;
  const left = target ? Math.round(target.kcal - eaten) : null;
  // Бюджет на пустые приёмы пищи показываем только для сегодняшнего дня
  const budgets =
    day && target && date === today
      ? mealBudgets(
          target.kcal,
          Object.fromEntries(MEAL_TYPES.map((m) => [m, day.meals[m].totals.kcal])) as Record<
            MealType,
            number
          >,
        )
      : null;
  const dayEmpty =
    day != null &&
    day.totals.kcal === 0 &&
    MEAL_TYPES.every((m) => day.meals[m].entries.length === 0);
  const prevCount = prevDay
    ? MEAL_TYPES.reduce((n, m) => n + prevDay.meals[m].entries.length, 0)
    : 0;
  const isYesterday = date === today;

  return (
    <main className="screen">
      {left != null && (
        <div className={heroHidden ? 'budget-bar shown' : 'budget-bar'} aria-hidden={!heroHidden}>
          <div className="budget-bar-row">
            <span className="muted small">
              {Math.round(eaten)} / {target!.kcal} {L.common.kcal}
            </span>
            <strong className={left < 0 ? 'over-text' : 'budget-left'}>
              {left < 0 ? L.diary.over(-left) : L.diary.left(left)}
            </strong>
          </div>
          <div className="budget-track">
            <div
              className={left < 0 ? 'budget-fill over' : 'budget-fill'}
              style={{ width: `${Math.min(100, (eaten / target!.kcal) * 100)}%` }}
            />
          </div>
        </div>
      )}
      <header className="date-nav">
        <button
          className="icon-btn"
          onClick={() => setDate(addDays(date, -1))}
          aria-label={L.diary.prevDay}
        >
          <Icon name="back" />
        </button>
        <div className="date-title">
          <h1>
            {date === today
              ? L.diary.today
              : date === addDays(today, -1)
                ? L.diary.yesterday
                : weekday(date)}
          </h1>
          <div className="muted small">{formatDate(date)}</div>
        </div>
        <button
          className="icon-btn"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
          aria-label={L.diary.nextDay}
        >
          <Icon name="forward" />
        </button>
      </header>

      <section className="card hero" ref={heroRef}>
        <div className="hero-top">
          <CalorieRing eaten={eaten} target={target?.kcal ?? null} />
          <div className="hero-stats">
            <Stat icon="target" label={L.diary.norm} value={target?.kcal} />
            <Stat icon="flame" label={L.diary.eaten} value={Math.round(eaten)} />
          </div>
        </div>
        <div className="macros">
          <MacroBar
            kind="protein"
            label={L.common.protein}
            value={day?.totals.protein ?? 0}
            target={target?.protein}
          />
          <MacroBar
            kind="fat"
            label={L.common.fat}
            value={day?.totals.fat ?? 0}
            target={target?.fat}
          />
          <MacroBar
            kind="carbs"
            label={L.common.carbs}
            value={day?.totals.carbs ?? 0}
            target={target?.carbs}
          />
        </div>
      </section>

      <StepsCard date={date} weightKg={me.weightKg} />

      {workout.logs && workout.logs.length > 0 && (
        <WorkoutToday logs={workout.logs} title={L.diary.workout} />
      )}

      {error && <pre className="error">{error}</pre>}

      {dayEmpty && prevCount > 0 && (
        <button className="card repeat-day" disabled={copying} onClick={() => void repeat()}>
          <span className="tile-icon tile-ai">
            <Icon name="repeat" />
          </span>
          <span className="repeat-day-text">
            <strong>{L.diary.repeatDay(isYesterday)}</strong>
            <span className="muted small">
              {L.diary.repeatDayHint(prevCount, Math.round(prevDay!.totals.kcal))}
            </span>
          </span>
        </button>
      )}

      {MEAL_TYPES.map((meal) => {
        const m = day?.meals[meal];
        const entries = m?.entries ?? [];
        const prevMeal = prevDay?.meals[meal];
        const canRepeat =
          !dayEmpty && day != null && entries.length === 0 && (prevMeal?.entries.length ?? 0) > 0;
        const budget = budgets?.[meal];
        return (
          <section key={meal} className="card meal">
            <div className="meal-head">
              <span className={`meal-icon meal-icon-${meal}`} aria-hidden="true">
                {MEAL_ICONS[meal]}
              </span>
              <div className="meal-title">
                <strong>{mealLabels[meal]}</strong>
                <span className="muted small">
                  {entries.length > 0
                    ? `${Math.round(m?.totals.kcal ?? 0)} ${L.common.kcal}`
                    : budget
                      ? L.diary.budget(budget)
                      : L.diary.empty}
                </span>
              </div>
              <button
                className="add-btn"
                onClick={() => setAddingTo(meal)}
                aria-label={L.diary.addTo(mealLabels[meal])}
              >
                <Icon name="plus" size={20} />
              </button>
            </div>
            {canRepeat && (
              <button className="repeat-meal" disabled={copying} onClick={() => void repeat(meal)}>
                <Icon name="repeat" size={16} />
                {L.diary.repeatMeal(isYesterday, Math.round(prevMeal!.totals.kcal))}
              </button>
            )}
            {entries.length > 0 && (
              <ul className="entries">
                {entries.map((e) => (
                  <li key={e.id} className="entry">
                    <button
                      className="entry-open"
                      onClick={() => setEditing(e)}
                      aria-label={L.diary.editEntry(e.name)}
                    >
                      <FoodThumb imageUrl={e.imageUrl} category={e.category} />
                      <div className="entry-main">
                        <div className="entry-name">{e.name}</div>
                        <div className="muted small">
                          {e.grams} {L.common.g} ·{' '}
                          {L.common.pfc(
                            Math.round(e.nutrients.protein),
                            Math.round(e.nutrients.fat),
                            Math.round(e.nutrients.carbs),
                          )}
                        </div>
                      </div>
                      <span className="entry-kcal">{Math.round(e.nutrients.kcal)}</span>
                    </button>
                    <button
                      className="icon-btn small-btn"
                      onClick={() => remove(e.id)}
                      aria-label={L.common.remove}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {day && (
        <section className="card day-done">
          {streak && (
            <div className="streak">
              <span className="streak-icon" aria-hidden="true">
                <Icon name="flame" size={20} />
              </span>
              <div className="streak-text">
                <strong>
                  {streak.current > 0 ? L.diary.streak(streak.current) : L.diary.streakStart}
                </strong>
                <div className="streak-week">
                  {streak.week.map((d) => (
                    <span
                      key={d.date}
                      className={d.logged ? 'streak-day on' : 'streak-day'}
                      title={formatDate(d.date)}
                    >
                      {weekdayShort(d.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {day.closed ? (
            <button className="ghost day-closed" onClick={() => void setClosed(false)}>
              <Icon name="check" size={18} />
              {L.diary.dayClosed}
              <span className="visually-hidden">{L.diary.reopenDay}</span>
            </button>
          ) : (
            <button className="primary" onClick={() => void setClosed(true)}>
              {L.diary.closeDay}
            </button>
          )}
        </section>
      )}

      {editing && (
        <EditEntrySheet
          entry={editing}
          date={date}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {addingTo && (
        <AddFoodSheet
          meal={addingTo}
          date={date}
          isToday={date === today}
          onClose={() => setAddingTo(null)}
          onAdded={() => {
            setAddingTo(null);
            load();
          }}
        />
      )}
    </main>
  );
}
