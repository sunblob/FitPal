import { useState } from 'react';
import { scaleNutrients, sumNutrients, type RecognizedFood } from '@fitpal/shared';
import { L } from '../i18n';
import { Icon } from './Icon';

/** Редактируемый список блюд от ИИ (по фото или по описанию): название, граммы, итого. */
export function RecognizedItems(props: {
  items: RecognizedFood[];
  note: string | null;
  onChange: (items: RecognizedFood[]) => void;
  onConfirm: (items: RecognizedFood[]) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { items } = props;
  const update = (i: number, patch: Partial<RecognizedFood>) =>
    props.onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => props.onChange(items.filter((_, j) => j !== i));
  const valid =
    items.length > 0 && items.every((i) => i.name.trim() && i.grams > 0 && i.grams <= 5000);
  const total = sumNutrients(items.map((i) => scaleNutrients(i.per100g, i.grams || 0)));

  async function confirm() {
    setSaving(true);
    try {
      await props.onConfirm(items);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {items.map((item, i) => {
        const n = scaleNutrients(item.per100g, item.grams || 0);
        return (
          <div key={i} className="card recognized">
            <div className="recognized-head">
              <input
                className="name-input"
                value={item.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <button
                className="icon-btn small-btn"
                onClick={() => remove(i)}
                aria-label={L.ai.removeItem}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="inline">
              <label>
                {L.ai.grams}
                <input
                  inputMode="decimal"
                  value={item.grams || ''}
                  onChange={(e) => update(i, { grams: Number(e.target.value.replace(',', '.')) })}
                />
              </label>
              <div className="recognized-kcal">
                <div className="big">{n.kcal}</div>
                <div className="muted small">{L.common.pfc(n.protein, n.fat, n.carbs)}</div>
              </div>
            </div>
          </div>
        );
      })}
      {items.length > 0 && (
        <>
          {props.note && <p className="muted">{props.note}</p>}
          <div className="recognized-total">
            <span className="muted">{L.ai.total}</span>
            <b>
              {total.kcal} {L.common.kcal}
            </b>
          </div>
          <button className="primary" disabled={!valid || saving} onClick={confirm}>
            {saving ? L.ai.saving : L.ai.addToDiary}
          </button>
        </>
      )}
    </>
  );
}

/** Текст ошибки запроса к ИИ для пользователя. */
export function aiErrorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message.startsWith('API 429') ? L.common.aiRateLimited : fallback;
}
