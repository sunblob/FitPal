import { useCallback, useEffect, useState } from 'react';
import { GOAL_LABELS, addDays, lowestWithin, todayIn, weightPlan } from '@fitpal/shared';
import { getLanguage, L, locale } from '../../i18n';
import { api, post, type Me, type WeightLogDto } from '../../lib/api';
import { formatDate, profileFromMe } from '../../lib/profile';
import { StepsWeek } from './StepsWeek';
import { WeekCard } from './WeekCard';
import { WeightChart } from './WeightChart';

const RANGES = [30, 90, 365];

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

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

  const goalLabels = GOAL_LABELS[getLanguage()];
  const profile = profileFromMe(me);
  const plan = profile ? weightPlan(profile) : null;
  const first = logs[0];
  const last = logs[logs.length - 1];
  const change = first && last ? Math.round((last.weightKg - first.weightKg) * 10) / 10 : 0;
  const loggedToday = last?.date === today;
  const low = lowestWithin(logs, today);

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
      <h1>{L.weight.title}</h1>

      <section className="card hero weight-hero">
        <div className="weight-now">
          <div className="muted small">{L.weight.current}</div>
          <div className="display">
            {current ?? '—'}
            <span className="unit"> {L.common.kg}</span>
          </div>
          {logs.length > 1 && first && (
            <span className={change <= 0 ? 'pill pill-good' : 'pill'}>
              {change > 0 ? '+' : change < 0 ? '−' : ''}
              {Math.abs(change)} {L.weight.since(shortDate(first.date))}
            </span>
          )}
        </div>
        {me.goal && (
          <div className="weight-goal">
            <div className="muted small">{L.weight.goal}</div>
            <div className="stat-value">
              {me.goal !== 'maintain' && me.targetWeightKg
                ? `${me.targetWeightKg} ${L.common.kg}`
                : goalLabels[me.goal]}
            </div>
            {toGo != null && <div className="muted small">{L.weight.toGo(toGo)}</div>}
          </div>
        )}
        {low && logs.length > 1 && (
          <div className="weight-low muted small">
            {L.weight.low10(low.weightKg, shortDate(low.date))}
          </div>
        )}
        {progress != null && me.goal !== 'maintain' && (
          <div className="goal-progress">
            <div className="bar bar-thick">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="goal-progress-labels muted small">
              <span>
                {first?.weightKg} {L.common.kg}
              </span>
              <span>{L.weight.progress(Math.round(progress))}</span>
              <span>
                {me.targetWeightKg} {L.common.kg}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="card form">
        <div className="card-title">{loggedToday ? L.weight.update : L.weight.log}</div>
        <div className="inline">
          <input
            inputMode="decimal"
            placeholder={loggedToday ? String(last.weightKg) : String(me.weightKg ?? L.common.kg)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={L.weight.ariaWeight}
          />
          <button className="primary btn-inline" disabled={!valid || busy} onClick={save}>
            {L.weight.logButton}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="segmented">
          {RANGES.map((days) => (
            <button
              key={days}
              className={range === days ? 'on' : ''}
              onClick={() => setRange(days)}
            >
              {L.weight.ranges[days]}
            </button>
          ))}
        </div>
        <WeightChart logs={logs} targetKg={me.goal !== 'maintain' ? me.targetWeightKg : null} />
      </section>

      <WeekCard today={today} />

      <StepsWeek today={today} />

      {plan && me.goal && (
        <section className="card plan-card">
          <div className="card-title">
            {L.weight.planTitle(goalLabels[me.goal], plan.targetWeightKg)}
          </div>
          <p className="muted">
            {L.weight.planLine(plan.weeklyRateKg, plan.weeks, formatDate(plan.etaDate))}
          </p>
        </section>
      )}
    </main>
  );
}
