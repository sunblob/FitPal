import { useEffect, useState } from 'react';
import { averageOfLogged, macroShares, type WeekSummaryDto } from '@fitpal/shared';
import { L, locale } from '../../i18n';
import { api } from '../../lib/api';

const weekday = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'narrow' });

/** Калории по дням за последние 7 дней и средняя раскладка БЖУ. */
export function WeekCard({ today }: { today: string }) {
  const [week, setWeek] = useState<WeekSummaryDto | null>(null);

  useEffect(() => {
    api<WeekSummaryDto>(`/diary/week?date=${today}`).then(setWeek, () => setWeek(null));
  }, [today]);

  if (!week) return null;
  const avg = averageOfLogged(week.days);
  const target = week.target;
  const logged = week.days.filter((d) => d.nutrients.kcal > 0);
  const over = target ? logged.filter((d) => d.nutrients.kcal > target.kcal).length : 0;
  const max = Math.max(
    target ? target.kcal * 1.25 : 0,
    ...week.days.map((d) => d.nutrients.kcal),
    1,
  );
  const shares = avg ? macroShares(avg) : null;
  const targetShares = target ? macroShares(target) : null;

  return (
    <section className="card steps-week">
      <div className="steps-week-head">
        <div className="card-title">{L.week.title}</div>
        {avg && <span className="muted small">{L.week.average(avg.kcal)}</span>}
      </div>
      {!avg ? (
        <p className="muted small">{L.week.noData}</p>
      ) : (
        <>
          <div className="week-bars" role="img" aria-label={L.week.barsAria}>
            {target && (
              <div
                className="steps-goal-line"
                style={{ bottom: `${(target.kcal / max) * 100}%` }}
              />
            )}
            {week.days.map((d) => {
              const isOver = target != null && d.nutrients.kcal > target.kcal;
              return (
                <div key={d.date} className="steps-col" title={`${d.date}: ${d.nutrients.kcal}`}>
                  <div
                    className={isOver ? 'steps-bar week-bar over' : 'steps-bar week-bar'}
                    style={{ height: `${(d.nutrients.kcal / max) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="week-axis muted small">
            {week.days.map((d) => (
              <span key={d.date} className={d.date === today ? 'week-today' : undefined}>
                {weekday(d.date)}
              </span>
            ))}
          </div>
          {target && over > 0 && (
            <p className="muted small">{L.week.daysOver(over, logged.length)}</p>
          )}
          {shares && (
            <div className="week-macros">
              <div className="week-macros-head">
                <span className="small">{L.week.macros}</span>
                {targetShares && (
                  <span className="muted small">
                    {L.week.targetShares(
                      targetShares.protein,
                      targetShares.fat,
                      targetShares.carbs,
                    )}
                  </span>
                )}
              </div>
              <div className="macro-split" aria-hidden="true">
                <span className="split-protein" style={{ flexGrow: shares.protein }} />
                <span className="split-fat" style={{ flexGrow: shares.fat }} />
                <span className="split-carbs" style={{ flexGrow: shares.carbs }} />
              </div>
              <div className="macro-legend small">
                <span className="legend-protein">
                  {L.common.protein} {shares.protein}%
                </span>
                <span className="legend-fat">
                  {L.common.fat} {shares.fat}%
                </span>
                <span className="legend-carbs">
                  {L.common.carbs} {shares.carbs}%
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
