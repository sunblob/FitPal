import { useState } from 'react';
import type { PhotoRecognition, RecognizedFood } from '@fitpal/shared';
import { post } from '../lib/api';
import { prepareImage } from '../lib/image';
import { Icon } from './Icon';
import { RecognizedItems, aiErrorText } from './RecognizedItems';

type State =
  | { kind: 'pick' }
  | { kind: 'loading'; preview: string }
  | { kind: 'result'; preview: string; items: RecognizedFood[]; note: string | null };

/** Фото тарелки → список блюд с граммовкой, которую можно поправить перед записью. */
export function PhotoRecognize(props: { onConfirm: (items: RecognizedFood[]) => Promise<void> }) {
  const [state, setState] = useState<State>({ kind: 'pick' });
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      setError(aiErrorText(e, 'Не получилось распознать фото. Попробуй ещё раз.'));
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
          <Icon name="camera" />
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

  return (
    <div className="sheet-body">
      <img className="photo-preview" src={state.preview} alt="" />
      {state.items.length === 0 && (
        <p className="muted">{state.note ?? 'Не нашёл еды на фото. Попробуй снять поближе.'}</p>
      )}
      <RecognizedItems
        items={state.items}
        note={state.note}
        onChange={(items) => setState({ ...state, items })}
        onConfirm={props.onConfirm}
      />
      <button className="ghost add" onClick={() => setState({ kind: 'pick' })}>
        Другое фото
      </button>
    </div>
  );
}
