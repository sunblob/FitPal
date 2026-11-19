import { useCallback, useEffect, useState } from 'react';
import {
  MEAL_LABELS_RU,
  MEAL_TYPES,
  addDays,
  todayIn,
  type DiaryDayDto,
  type MealType,
} from '@fitpal/shared';
import { CalorieRing } from '../../components/CalorieRing';
import { Icon, type IconName } from '../../components/Icon';
import { MacroBar } from '../../components/MacroBar';
import { api, del, type Me } from '../../lib/api';
import { formatDateRu } from '../../lib/profile';
import { AddFoodSheet } from './AddFoodSheet';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🥣',
  lunch: '🍲',
  dinner: '🥗',
  snack: '🍏',
};

const weekday = (date: string) => {
  const name = new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

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

  const load = useCallback(() => {
    api<DiaryDayDto>(`/diary?date=${date}`).then(setDay, (e: Error) => setError(e.message));
  }, [date]);

  useEffect(load, [load]);

  async function remove(id: string) {
    await del(`/diary/${id}`);
    load();
  }

  const target = day?.target;
  const eaten = day?.totals.kcal ?? 0;

  return (
    <main className="screen">
      <header className="date-nav">
        <button
          className="icon-btn"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="Предыдущий день"
        >
          <Icon name="back" />
        </button>
        <div className="date-title">
          <h1>
            {date === today ? 'Сегодня' : date === addDays(today, -1) ? 'Вчера' : weekday(date)}
          </h1>
          <div className="muted small">{formatDateRu(date)}</div>
        </div>
        <button
          className="icon-btn"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Следующий день"
        >
          <Icon name="forward" />
        </button>
      </header>

      <section className="card hero">
        <div className="hero-top">
          <CalorieRing eaten={eaten} target={target?.kcal ?? null} />
          <div className="hero-stats">
            <Stat icon="target" label="Норма" value={target?.kcal} />
            <Stat icon="flame" label="Съедено" value={Math.round(eaten)} />
          </div>
        </div>
        <div className="macros">
          <MacroBar
            kind="protein"
            label="Белки"
            value={day?.totals.protein ?? 0}
            target={target?.protein}
          />
          <MacroBar kind="fat" label="Жиры" value={day?.totals.fat ?? 0} target={target?.fat} />
          <MacroBar
            kind="carbs"
            label="Углеводы"
            value={day?.totals.carbs ?? 0}
            target={target?.carbs}
          />
        </div>
      </section>

      {error && <pre className="error">{error}</pre>}

      {MEAL_TYPES.map((meal) => {
        const m = day?.meals[meal];
        const entries = m?.entries ?? [];
        return (
          <section key={meal} className="card meal">
            <div className="meal-head">
              <span className={`meal-icon meal-icon-${meal}`} aria-hidden="true">
                {MEAL_ICONS[meal]}
              </span>
              <div className="meal-title">
                <strong>{MEAL_LABELS_RU[meal]}</strong>
                <span className="muted small">
                  {entries.length > 0 ? `${Math.round(m?.totals.kcal ?? 0)} ккал` : 'Пока пусто'}
                </span>
              </div>
              <button
                className="add-btn"
                onClick={() => setAddingTo(meal)}
                aria-label={`Добавить в ${MEAL_LABELS_RU[meal].toLowerCase()}`}
              >
                <Icon name="plus" size={20} />
              </button>
            </div>
            {entries.length > 0 && (
              <ul className="entries">
                {entries.map((e) => (
                  <li key={e.id} className="entry">
                    <div className="entry-main">
                      <div className="entry-name">{e.name}</div>
                      <div className="muted small">
                        {e.grams} г · Б {Math.round(e.nutrients.protein)} · Ж{' '}
                        {Math.round(e.nutrients.fat)} · У {Math.round(e.nutrients.carbs)}
                      </div>
                    </div>
                    <span className="entry-kcal">{Math.round(e.nutrients.kcal)}</span>
                    <button
                      className="icon-btn small-btn"
                      onClick={() => remove(e.id)}
                      aria-label="Удалить"
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
