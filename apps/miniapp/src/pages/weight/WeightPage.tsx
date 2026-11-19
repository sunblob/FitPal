import { useCallback, useEffect, useState } from 'react';
import { GOAL_LABELS_RU, addDays, todayIn, weightPlan } from '@fitpal/shared';
import { api, post, type Me, type WeightLogDto } from '../../lib/api';
import { formatDateRu, profileFromMe } from '../../lib/profile';
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

  return (
    <main className="screen">
      <h1>Вес</h1>

      <section className="card form">
        <div className="muted">
          {loggedToday
            ? `Сегодня: ${last.weightKg} кг. Можно обновить.`
            : 'Взвесься и запиши вес за сегодня'}
        </div>
        <div className="inline">
          <input
            inputMode="decimal"
            placeholder={String(me.weightKg ?? 'кг')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="primary" disabled={!valid || busy} onClick={save}>
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
        {logs.length > 1 && (
          <div className="muted">
            За период: {change > 0 ? '+' : ''}
            {change} кг
          </div>
        )}
      </section>

      {me.goal && (
        <section className="card">
          <div className="muted">Цель</div>
          <div className="big">
            {GOAL_LABELS_RU[me.goal]}
            {me.goal !== 'maintain' && me.targetWeightKg ? ` до ${me.targetWeightKg} кг` : ''}
          </div>
          {plan && (
            <p className="plan-line">
              Темп {plan.weeklyRateKg} кг/нед. Осталось{' '}
              {Math.abs(Math.round((plan.startWeightKg - plan.targetWeightKg) * 10) / 10)} кг,
              примерно {plan.weeks} нед., к {formatDateRu(plan.etaDate)}
            </p>
          )}
          {progress != null && me.goal !== 'maintain' && (
            <div className="bar">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
