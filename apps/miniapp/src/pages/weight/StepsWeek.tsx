import { useEffect, useState } from 'react';
import { DEFAULT_STEPS_GOAL, addDays, type StepLogDto } from '@fitpal/shared';
import { api } from '../../lib/api';

const DAYS = 14;

/** Шаги за последние две недели: столбики по дням и среднее. */
export function StepsWeek({ today }: { today: string }) {
  const [logs, setLogs] = useState<StepLogDto[] | null>(null);

  useEffect(() => {
    api<StepLogDto[]>(`/steps?from=${addDays(today, -(DAYS - 1))}&to=${today}`).then(setLogs, () =>
      setLogs([]),
    );
  }, [today]);

  const byDate = new Map((logs ?? []).map((l) => [l.date, l.steps]));
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(today, i - (DAYS - 1));
    return { date, steps: byDate.get(date) ?? 0 };
  });
  const logged = days.filter((d) => d.steps > 0);
  const avg = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.steps, 0) / logged.length)
    : 0;
  const max = Math.max(DEFAULT_STEPS_GOAL, ...days.map((d) => d.steps));

  return (
    <section className="card steps-week">
      <div className="steps-week-head">
        <div className="card-title">Шаги за 2 недели</div>
        {logged.length > 0 && (
          <span className="muted small">в среднем {avg.toLocaleString('ru-RU')}</span>
        )}
      </div>
      {logs && logged.length === 0 ? (
        <p className="muted small">Пока нет записей. Шаги вносятся на экране дневника.</p>
      ) : (
        <div className="steps-bars" role="img" aria-label="Шаги по дням">
          <div
            className="steps-goal-line"
            style={{ bottom: `${(DEFAULT_STEPS_GOAL / max) * 100}%` }}
          />
          {days.map((d) => (
            <div key={d.date} className="steps-col" title={`${d.date}: ${d.steps}`}>
              <div
                className={d.steps >= DEFAULT_STEPS_GOAL ? 'steps-bar done' : 'steps-bar'}
                style={{ height: `${(d.steps / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
      )}
      {logged.length > 0 && (
        <div className="steps-axis muted small">
          <span>
            {new Date(`${days[0]!.date}T12:00:00`).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          <span>сегодня</span>
        </div>
      )}
    </section>
  );
}
