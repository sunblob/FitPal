import { useState } from 'react';
import type { PhotoRecognition, RecognizedFood } from '@fitpal/shared';
import { L } from '../i18n';
import { post } from '../lib/api';
import { Icon } from './Icon';
import { RecognizedItems, aiErrorText } from './RecognizedItems';

type State =
  | { kind: 'input' }
  | { kind: 'loading' }
  | { kind: 'result'; items: RecognizedFood[]; note: string | null };

/** Описание еды словами → позиции с граммами и КБЖУ, которые можно поправить перед записью. */
export function TextRecognize(props: {
  initialText?: string;
  onConfirm: (items: RecognizedFood[]) => Promise<void>;
}) {
  const [text, setText] = useState(props.initialText ?? '');
  const [state, setState] = useState<State>({ kind: 'input' });
  const [error, setError] = useState<string | null>(null);
  const valid = text.trim().length >= 2 && text.trim().length <= 500;

  async function submit() {
    if (!valid) return;
    setError(null);
    setState({ kind: 'loading' });
    try {
      const res = await post<PhotoRecognition>('/recognize/text', { text: text.trim() });
      setState({ kind: 'result', items: res.items, note: res.note });
    } catch (e) {
      setError(aiErrorText(e, L.ai.textFailed));
      setState({ kind: 'input' });
    }
  }

  if (state.kind === 'result') {
    return (
      <div className="sheet-body">
        <div className="ai-query">
          <span className="muted small">{L.ai.youWrote}</span>
          <span>{text.trim()}</span>
        </div>
        {state.items.length === 0 && <p className="muted">{state.note ?? L.ai.noFoodText}</p>}
        <RecognizedItems
          items={state.items}
          note={state.note}
          onChange={(items) => setState({ ...state, items })}
          onConfirm={props.onConfirm}
        />
        <button className="ghost add" onClick={() => setState({ kind: 'input' })}>
          {L.ai.editText}
        </button>
      </div>
    );
  }

  const loading = state.kind === 'loading';
  return (
    <div className="sheet-body">
      <p className="muted">{L.ai.textIntro}</p>
      <textarea
        autoFocus
        rows={4}
        maxLength={500}
        value={text}
        disabled={loading}
        onChange={(e) => setText(e.target.value)}
        placeholder={L.ai.textPlaceholder}
      />
      <button className="primary ai-button" disabled={!valid || loading} onClick={submit}>
        <Icon name="sparkles" size={18} />
        {loading ? L.ai.counting : L.ai.count}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
