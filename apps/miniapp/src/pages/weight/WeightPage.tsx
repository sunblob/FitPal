import { useCallback, useEffect, useState } from 'react';
import { GOAL_LABELS_RU, addDays, todayIn, weightPlan } from '@fitpal/shared';
import { api, post, type Me, type WeightLogDto } from '../../lib/api';
import { formatDateRu, profileFromMe } from '../../lib/profile';
import { StepsWeek } from './StepsWeek';
import { WeightChart } from './WeightChart';

const RANGES = [
  { days: 30, label: 'Месяц' },
  { days: 90, label: '3 месяца' },
  { days: 365, label: 'Год' },
];

export function WeightPage(props: { me: Me; onChanged: () => void }) {
  const { me } = props;
  const today = todayIn(me.timezone);
  const [range, setRange] = useState(90);
  const [logs, setLogs] = useState<WeightLogDto[]>([]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<WeightLogDto[]>(`/weight?from=${addDays(today, -range)}`).then(setLogs, () => setLogs([]));
  }, [range, today]);
  useEffect(load, [load]);

  const kg = Number(value.replace(',', '.'));
  const valid = kg >= 30 && kg <= 300;

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      await post('/weight', { weightKg: kg });
      setValue('');
      load();
      props.onChanged();
    } finally {
      setBusy(false);
    }
  }

  const profile = profileFromMe(me);
  const plan = profile ? weightPlan(profile) : null;
  const first = logs[0];
  const last = logs[logs.length - 1];
  const change = first && last ? Math.round((last.weightKg - first.weightKg) * 10) / 10 : 0;
  const loggedToday = last?.date === today;

  // Прогресс к цели от первого взвешивания в выбранном периоде
  const progress =
    me.targetWeightKg && first && last && first.weightKg !== me.targetWeightKg
      ? Math.max(
          0,
          Math.min(
            100,
            ((first.weightKg - last.weightKg) / (first.weightKg - me.targetWeightKg)) * 100,
          ),
        )
      : null;

  const current = last?.weightKg ?? me.weightKg;
  const toGo =
    me.goal !== 'maintain' && me.targetWeightKg && current
      ? Math.round(Math.abs(current - me.targetWeightKg) * 10) / 10
      : null;

  return (
    <main className="screen">
      <h1>Вес</h1>

      <section className="card hero weight-hero">
        <div className="weight-now">
          <div className="muted small">Текущий вес</div>
          <div className="display">
            {current ?? '—'}
            <span className="unit"> кг</span>
          </div>
          {logs.length > 1 && (
            <span className={change <= 0 ? 'pill pill-good' : 'pill'}>
              {change > 0 ? '+' : change < 0 ? '−' : ''}
              {Math.abs(change)} кг за период
            </span>
          )}
        </div>
        {me.goal && (
          <div className="weight-goal">
            <div className="muted small">Цель</div>
            <div className="stat-value">
              {me.goal !== 'maintain' && me.targetWeightKg
                ? `${me.targetWeightKg} кг`
                : GOAL_LABELS_RU[me.goal]}
            </div>
            {toGo != null && <div className="muted small">ещё {toGo} кг</div>}
          </div>
        )}
        {progress != null && me.goal !== 'maintain' && (
          <div className="goal-progress">
            <div className="bar bar-thick">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="goal-progress-labels muted small">
              <span>{first?.weightKg} кг</span>
              <span>{Math.round(progress)}% пути</span>
              <span>{me.targetWeightKg} кг</span>
            </div>
          </div>
        )}
      </section>

      <section className="card form">
        <div className="card-title">
          {loggedToday ? 'Обновить вес за сегодня' : 'Записать вес за сегодня'}
        </div>
        <div className="inline">
          <input
            inputMode="decimal"
            placeholder={loggedToday ? String(last.weightKg) : String(me.weightKg ?? 'кг')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Вес, кг"
          />
          <button className="primary btn-inline" disabled={!valid || busy} onClick={save}>
            Записать
          </button>
        </div>
      </section>

      <section className="card">
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.days}
              className={range === r.days ? 'on' : ''}
              onClick={() => setRange(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <WeightChart logs={logs} targetKg={me.goal !== 'maintain' ? me.targetWeightKg : null} />
      </section>

      <StepsWeek today={today} />

      {plan && me.goal && (
        <section className="card plan-card">
          <div className="card-title">
            {GOAL_LABELS_RU[me.goal]} до {plan.targetWeightKg} кг
          </div>
          <p className="muted">
            Темп {plan.weeklyRateKg} кг в неделю, примерно {plan.weeks} нед. Цель к{' '}
            {formatDateRu(plan.etaDate)}
          </p>
        </section>
      )}
    </main>
  );
}
