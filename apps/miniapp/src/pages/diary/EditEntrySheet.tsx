import { useState } from 'react';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  rescaleNutrients,
  scaleExtras,
  type DiaryEntryDto,
  type MealType,
  type UpdateDiaryEntry,
} from '@fitpal/shared';
import { FoodThumb } from '../../components/FoodThumb';
import { Icon } from '../../components/Icon';
import { getLanguage, L } from '../../i18n';
import { del, patch } from '../../lib/api';
import { NutrientsLine, PORTIONS } from './AddFoodSheet';

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props {
  entry: DiaryEntryDto;
  /** День дневника, в котором лежит запись (YYYY-MM-DD). */
  date: string;
  onClose: () => void;
  onChanged: () => void;
}

export function EditEntrySheet({ entry, date, onClose, onChanged }: Props) {
  const [grams, setGrams] = useState(String(entry.grams));
  const [meal, setMeal] = useState<MealType>(entry.meal);
  const [time, setTime] = useState(timeOf(entry.eatenAt));
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const g = Number(grams.replace(',', '.'));
  const valid = g > 0 && g <= 5000 && /^\d{2}:\d{2}$/.test(time);
  const per100 = (v: number | null | undefined) =>
    v == null || entry.grams <= 0 ? null : (v * 100) / entry.grams;
  const n =
    g > 0
      ? {
          ...rescaleNutrients(entry.nutrients, entry.grams, g),
          ...scaleExtras(
            { fiber: per100(entry.nutrients.fiber), sugar: per100(entry.nutrients.sugar) },
            g,
          ),
        }
      : null;

  const changes: UpdateDiaryEntry = {
    ...(g !== entry.grams ? { grams: g } : {}),
    ...(meal !== entry.meal ? { meal } : {}),
    // Время ставим в тот же день дневника, меняются только часы и минуты
    ...(time !== timeOf(entry.eatenAt)
      ? { eatenAt: new Date(`${date}T${time}:00`).toISOString() }
      : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const save = () => run(() => patch(`/diary/${entry.id}`, changes));
  const remove = () => {
    if (!confirmRemove) return setConfirmRemove(true);
    return run(() => del(`/diary/${entry.id}`));
  };

  const mealLabels = MEAL_LABELS[getLanguage()];

  return (
    <div className="sheet">
      <div className="sheet-head">
        <button className="icon-btn" onClick={onClose} aria-label={L.common.close}>
          <Icon name="close" />
        </button>
        <div className="sheet-title">
          <strong>{L.edit.title}</strong>
          <span className="muted small">{mealLabels[entry.meal]}</span>
        </div>
        <span />
      </div>
      {error && <pre className="error">{error}</pre>}
      <div className="sheet-body">
        <div className="portion-head">
          <FoodThumb imageUrl={entry.imageUrl} category={entry.category} size="large" />
          <div>
            <h2>{entry.name}</h2>
          </div>
        </div>
        {n && <NutrientsLine n={n} />}
        <section className="card form">
          <label>
            {L.edit.portion}
            <input
              className="input-big"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </label>
          <div className="chips chips-portion">
            {PORTIONS.map((p) => (
              <button
                key={p}
                className={g === p ? 'chip chip-on' : 'chip'}
                onClick={() => setGrams(String(p))}
              >
                {p} {L.common.g}
              </button>
            ))}
          </div>
          <div>
            <div className="label">{L.edit.meal}</div>
            <div className="chips">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  className={m === meal ? 'chip chip-on' : 'chip'}
                  onClick={() => setMeal(m)}
                >
                  {mealLabels[m]}
                </button>
              ))}
            </div>
          </div>
          <label>
            {L.edit.time}
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </section>
        <button className="primary" disabled={!valid || !dirty || busy} onClick={save}>
          {busy ? L.common.saving : L.common.save}
        </button>
        <button className="danger-link" disabled={busy} onClick={remove}>
          <Icon name="close" size={16} />
          {confirmRemove ? L.edit.confirmRemove : L.edit.remove}
        </button>
      </div>
    </div>
  );
}
