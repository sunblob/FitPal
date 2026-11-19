import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_STEPS_GOAL, stepsKcal, type StepLogDto } from '@fitpal/shared';
import { api, put } from '../lib/api';
import { Icon } from './Icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

/** Шаги за выбранный день с ручным вводом. */
export function StepsCard(props: { date: string; weightKg: number | null }) {
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
          <strong>Шаги</strong>
          <span className="muted small">
            {current > 0
              ? `≈ ${stepsKcal(current, props.weightKg)} ккал на ходьбу`
              : `Цель ${fmt(DEFAULT_STEPS_GOAL)} в день`}
          </span>
        </div>
        {!editing && (
          <button
            className="steps-value"
            onClick={() => {
              setValue(current > 0 ? String(current) : '');
              setEditing(true);
            }}
            aria-label="Изменить шаги"
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
            placeholder="Сколько шагов"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            aria-label="Шаги"
          />
          <button className="primary btn-inline" disabled={!valid || busy} onClick={save}>
            Сохранить
          </button>
        </div>
      )}
    </section>
  );
}
