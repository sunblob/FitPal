import { useEffect, useState } from 'react';
import { GLASS_ML, waterGoalMl, type WaterLogDto } from '@fitpal/shared';
import { L, locale } from '../i18n';
import { api, put } from '../lib/api';
import { Icon } from './Icon';

const litres = (ml: number) => (ml / 1000).toLocaleString(locale(), { maximumFractionDigits: 2 });

/** Вода за выбранный день: стаканы по 250 мл, нажатие на стакан заполняет до него. */
export function WaterCard(props: { date: string; weightKg: number | null }) {
  const { date } = props;
  const [ml, setMl] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const goal = waterGoalMl(props.weightKg);
  const goalGlasses = goal / GLASS_ML;

  useEffect(() => {
    setMl(null);
    api<WaterLogDto>(`/water?date=${date}`).then(
      (w) => setMl(w.ml),
      () => setMl(0),
    );
  }, [date]);

  async function set(next: number) {
    const prev = ml;
    setMl(next); // сразу показываем, сохраняем в фоне
    setError(false);
    try {
      await put<WaterLogDto>('/water', { ml: next, date });
    } catch {
      setMl(prev);
      setError(true);
    }
  }

  const current = ml ?? 0;
  const full = Math.floor(current / GLASS_ML);
  const extra = Math.max(0, full - goalGlasses);

  return (
    <section className="card steps-card">
      <div className="steps-head water-head">
        <span className="stat-icon water-icon">
          <Icon name="drop" size={18} />
        </span>
        <div className="steps-title">
          <strong>{L.water.title}</strong>
          <span className="muted small">{L.water.amount(litres(current), litres(goal))}</span>
        </div>
        <button
          className="icon-btn small-btn"
          disabled={ml == null || current === 0}
          onClick={() => void set(Math.max(0, current - GLASS_ML))}
          aria-label={L.water.less}
        >
          <Icon name="minus" size={16} />
        </button>
        <button
          className="icon-btn small-btn"
          disabled={ml == null}
          onClick={() => void set(current + GLASS_ML)}
          aria-label={L.water.more}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="water-glasses">
        {Array.from({ length: goalGlasses }, (_, i) => (
          <button
            key={i}
            className={i < full ? 'glass full' : 'glass'}
            disabled={ml == null}
            // Нажатие на последний полный стакан убирает его, на пустой — заполняет до него
            onClick={() => void set((i + 1 === full ? i : i + 1) * GLASS_ML)}
            aria-label={L.water.glass(i + 1)}
            aria-pressed={i < full}
          />
        ))}
        {extra > 0 && <span className="water-extra">+{extra}</span>}
      </div>
      {error && <p className="error-text small">{L.common.somethingWrong}</p>}
    </section>
  );
}
