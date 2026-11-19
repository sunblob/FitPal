import { useState } from 'react';
import {
  scaleNutrients,
  sumNutrients,
  type PhotoRecognition,
  type RecognizedFood,
} from '@fitpal/shared';
import { post } from '../lib/api';
import { prepareImage } from '../lib/image';

type State =
  | { kind: 'pick' }
  | { kind: 'loading'; preview: string }
  | { kind: 'result'; preview: string; items: RecognizedFood[]; note: string | null };

/** Фото тарелки → список блюд с граммовкой, которую можно поправить перед записью. */
export function PhotoRecognize(props: { onConfirm: (items: RecognizedFood[]) => Promise<void> }) {
  const [state, setState] = useState<State>({ kind: 'pick' });
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const preview = URL.createObjectURL(file);
    setState({ kind: 'loading', preview });
    try {
      const image = await prepareImage(file);
      const res = await post<PhotoRecognition>('/recognize', {
        ...image,
        hint: hint.trim() || undefined,
      });
      setState({ kind: 'result', preview, items: res.items, note: res.note });
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.startsWith('API 429')
          ? 'Слишком много фото за час, попробуй позже.'
          : 'Не получилось распознать фото. Попробуй ещё раз.',
      );
      setState({ kind: 'pick' });
    }
  }

  if (state.kind === 'pick') {
    return (
      <div className="sheet-body">
        <p className="muted">Сфотографируй тарелку целиком. Я определю блюда и примерный вес.</p>
        <label>
          Подсказка (необязательно)
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Например: овсянка на воде, 300 г"
          />
        </label>
        <label className="file-button">
          Сделать или выбрать фото
          <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className="sheet-body">
        <img className="photo-preview" src={state.preview} alt="" />
        <p className="muted">Распознаю еду… Обычно это занимает несколько секунд.</p>
      </div>
    );
  }

  const { items } = state;
  const update = (i: number, patch: Partial<RecognizedFood>) =>
    setState({ ...state, items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const remove = (i: number) => setState({ ...state, items: items.filter((_, j) => j !== i) });
  const valid = items.length > 0 && items.every((i) => i.grams > 0 && i.grams <= 5000);
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
    <div className="sheet-body">
      <img className="photo-preview" src={state.preview} alt="" />
      {items.length === 0 && (
        <p className="muted">{state.note ?? 'Не нашёл еды на фото. Попробуй снять поближе.'}</p>
      )}
      {items.map((item, i) => {
        const n = scaleNutrients(item.per100g, item.grams || 0);
        return (
          <div key={i} className="card recognized">
            <div className="entry">
              <input
                className="name-input"
                value={item.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <button className="icon" onClick={() => remove(i)} aria-label="Убрать">
                ×
              </button>
            </div>
            <div className="inline">
              <label>
                Граммы
                <input
                  inputMode="decimal"
                  value={item.grams || ''}
                  onChange={(e) => update(i, { grams: Number(e.target.value.replace(',', '.')) })}
                />
              </label>
              <div className="recognized-kcal">
                <div className="big">{n.kcal}</div>
                <div className="muted small">
                  Б {n.protein} · Ж {n.fat} · У {n.carbs}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {items.length > 0 && (
        <>
          {state.note && <p className="muted">{state.note}</p>}
          <div className="muted">Итого {total.kcal} ккал</div>
          <button className="primary" disabled={!valid || saving} onClick={confirm}>
            {saving ? 'Записываю…' : 'Добавить в дневник'}
          </button>
        </>
      )}
      <button className="ghost add" onClick={() => setState({ kind: 'pick' })}>
        Другое фото
      </button>
    </div>
  );
}
