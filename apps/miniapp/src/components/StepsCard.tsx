import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_STEPS_GOAL, stepsKcal, type StepLogDto } from '@fitpal/shared';
import { fmtNumber as fmt, L } from '../i18n';
import { api, put } from '../lib/api';
import { Icon } from './Icon';

/** Шаги за выбранный день с ручным вводом. */
export function StepsCard(props: { date: string; weightKg: number | null; onSaved?: () => void }) {
  const { date } = props;
  const [steps, setSteps] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setSteps(null);
    setEditing(false);
    api<StepLogDto[]>(`/steps?from=${date}&to=${date}`).then(
      (logs) => setSteps(logs[0]?.steps ?? 0),
      () => setSteps(0),
    );
  }, [date]);
  useEffect(load, [load]);

  const parsed = Number(value.replace(/\s/g, ''));
  const valid = value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100_000;

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      const saved = await put<StepLogDto>('/steps', { steps: parsed, date });
      setSteps(saved.steps);
      setEditing(false);
      props.onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  const current = steps ?? 0;
  const progress = Math.min(100, (current / DEFAULT_STEPS_GOAL) * 100);
  const done = current >= DEFAULT_STEPS_GOAL;

  return (
    <section className="card steps-card">
      <div className="steps-head">
        <span className="stat-icon steps-icon">
          <Icon name="steps" size={18} />
        </span>
        <div className="steps-title">
          <strong>{L.steps.title}</strong>
          <span className="muted small">
            {current > 0
              ? L.steps.walkingKcal(stepsKcal(current, props.weightKg))
              : L.steps.goalPerDay(fmt(DEFAULT_STEPS_GOAL))}
          </span>
        </div>
        {!editing && (
          <button
            className="steps-value"
            onClick={() => {
              setValue(current > 0 ? String(current) : '');
              setEditing(true);
            }}
            aria-label={L.steps.edit}
          >
            {steps == null ? '—' : fmt(current)}
            <Icon name="pencil" size={14} />
          </button>
        )}
      </div>
      <div className="bar">
        <div
          className={done ? 'bar-fill steps-fill done' : 'bar-fill steps-fill'}
          style={{ width: `${progress}%` }}
        />
      </div>
      {editing && (
        <div className="inline">
          <input
            inputMode="numeric"
            autoFocus
            placeholder={L.steps.howMany}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            aria-label={L.steps.title}
          />
          <button className="primary btn-inline" disabled={!valid || busy} onClick={save}>
            {L.common.save}
          </button>
        </div>
      )}
    </section>
  );
}
