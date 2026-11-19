import { useCallback, useEffect, useState } from 'react';
import {
  MEAL_LABELS_RU,
  MEAL_TYPES,
  addDays,
  todayIn,
  type DiaryDayDto,
  type MealType,
} from '@fitpal/shared';
import { MacroBar } from '../../components/MacroBar';
import { api, del, type Me } from '../../lib/api';
import { formatDateRu } from '../../lib/profile';
import { AddFoodSheet } from './AddFoodSheet';

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
  const left = target ? target.kcal - eaten : null;

  return (
    <main className="screen">
      <div className="date-nav">
        <button
          className="ghost"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="Предыдущий день"
        >
          ‹
        </button>
        <strong>{date === today ? 'Сегодня' : formatDateRu(date)}</strong>
        <button
          className="ghost"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Следующий день"
        >
          ›
        </button>
      </div>

      <section className="card">
        <div className="summary">
          <div>
            <div className="big">{Math.round(eaten)}</div>
            <div className="muted">съедено</div>
          </div>
          {left != null && (
            <div className="right">
              <div className={left < 0 ? 'big over-text' : 'big'}>{Math.abs(Math.round(left))}</div>
              <div className="muted">{left < 0 ? 'сверх нормы' : 'осталось'}</div>
            </div>
          )}
        </div>
        <MacroBar label="Калории" value={eaten} target={target?.kcal} unit="ккал" />
        <div className="macros">
          <MacroBar label="Белки" value={day?.totals.protein ?? 0} target={target?.protein} />
          <MacroBar label="Жиры" value={day?.totals.fat ?? 0} target={target?.fat} />
          <MacroBar label="Углеводы" value={day?.totals.carbs ?? 0} target={target?.carbs} />
        </div>
      </section>

      {error && <pre className="error">{error}</pre>}

      {MEAL_TYPES.map((meal) => {
        const m = day?.meals[meal];
        return (
          <section key={meal} className="card meal">
            <div className="meal-head">
              <strong>{MEAL_LABELS_RU[meal]}</strong>
              <span className="muted">{Math.round(m?.totals.kcal ?? 0)} ккал</span>
            </div>
            {m?.entries.map((e) => (
              <div key={e.id} className="entry">
                <div>
                  <div>{e.name}</div>
                  <div className="muted small">
                    {e.grams} г · Б {e.nutrients.protein} · Ж {e.nutrients.fat} · У{' '}
                    {e.nutrients.carbs}
                  </div>
                </div>
                <div className="entry-right">
                  <span>{Math.round(e.nutrients.kcal)}</span>
                  <button className="icon" onClick={() => remove(e.id)} aria-label="Удалить">
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button className="ghost add" onClick={() => setAddingTo(meal)}>
              + Добавить
            </button>
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
