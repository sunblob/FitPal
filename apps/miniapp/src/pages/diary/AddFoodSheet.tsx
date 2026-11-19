import { lazy, Suspense, useEffect, useState } from 'react';
import {
  MEAL_LABELS_RU,
  nutrientsSchema,
  scaleNutrients,
  type CreateDiaryEntry,
  type FoodDto,
  type MealType,
  type Nutrients,
  type RecognizedFood,
} from '@fitpal/shared';
import { Icon } from '../../components/Icon';
import { PhotoRecognize } from '../../components/PhotoRecognize';
import { TextRecognize } from '../../components/TextRecognize';
import { api, post } from '../../lib/api';

// Сканер тянет wasm на ~1 МБ, грузим его только когда он нужен
const BarcodeScanner = lazy(() =>
  import('../../components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
);

type Mode =
  | { kind: 'search' }
  | { kind: 'scan' }
  | { kind: 'lookup'; code: string }
  | { kind: 'notFound'; code: string }
  | { kind: 'portion'; food: FoodDto }
  | { kind: 'manual' }
  | { kind: 'photo' }
  | { kind: 'text'; initial: string };

const SHEET_SUBTITLES: Record<Mode['kind'], string> = {
  search: 'Добавить еду',
  scan: 'Сканер штрихкода',
  lookup: 'Сканер штрихкода',
  notFound: 'Сканер штрихкода',
  portion: 'Порция',
  manual: 'Свой продукт',
  photo: 'Распознать по фото',
  text: 'Описать словами',
};

const PORTIONS = [50, 100, 150, 200, 300];

interface Props {
  meal: MealType;
  date: string;
  isToday: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddFoodSheet(props: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'search' });
  const [error, setError] = useState<string | null>(null);

  async function addEntry(entry: Omit<CreateDiaryEntry, 'meal' | 'eatenAt'>) {
    setError(null);
    try {
      await post('/diary', {
        ...entry,
        meal: props.meal,
        // Для прошлых дней ставим полдень, чтобы запись точно попала в нужную дату
        eatenAt: props.isToday ? undefined : new Date(`${props.date}T12:00:00`).toISOString(),
      });
      props.onAdded();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addRecognized(items: RecognizedFood[]) {
    setError(null);
    try {
      for (const item of items) {
        await post('/diary', {
          name: item.name,
          grams: item.grams,
          per100g: item.per100g,
          meal: props.meal,
          eatenAt: props.isToday ? undefined : new Date(`${props.date}T12:00:00`).toISOString(),
        });
      }
      props.onAdded();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function lookup(code: string) {
    setMode({ kind: 'lookup', code });
    setError(null);
    try {
      const food = await api<FoodDto>(`/foods/barcode/${code}`);
      setMode({ kind: 'portion', food });
    } catch (e) {
      if ((e as Error).message.startsWith('API 404')) setMode({ kind: 'notFound', code });
      else {
        setError((e as Error).message);
        setMode({ kind: 'scan' });
      }
    }
  }

  return (
    <div className="sheet">
      <div className="sheet-head">
        <button
          className="icon-btn"
          onClick={mode.kind === 'search' ? props.onClose : () => setMode({ kind: 'search' })}
          aria-label={mode.kind === 'search' ? 'Закрыть' : 'Назад'}
        >
          <Icon name={mode.kind === 'search' ? 'close' : 'back'} />
        </button>
        <div className="sheet-title">
          <strong>{MEAL_LABELS_RU[props.meal]}</strong>
          <span className="muted small">{SHEET_SUBTITLES[mode.kind]}</span>
        </div>
        <span />
      </div>
      {error && <pre className="error">{error}</pre>}
      {mode.kind === 'search' && (
        <FoodSearch
          onPick={(food) => setMode({ kind: 'portion', food })}
          onManual={() => setMode({ kind: 'manual' })}
          onScan={() => setMode({ kind: 'scan' })}
          onPhoto={() => setMode({ kind: 'photo' })}
          onDescribe={(initial) => setMode({ kind: 'text', initial })}
        />
      )}
      {mode.kind === 'portion' && (
        <Portion
          food={mode.food}
          onAdd={(grams) =>
            addEntry({
              foodId: mode.food.id,
              name: mode.food.name,
              grams,
              per100g: mode.food.per100g,
            })
          }
        />
      )}
      {mode.kind === 'scan' && (
        <Suspense
          fallback={
            <div className="sheet-body">
              <p className="muted">Запускаю камеру…</p>
            </div>
          }
        >
          <BarcodeScanner onDetected={lookup} />
        </Suspense>
      )}
      {mode.kind === 'lookup' && (
        <div className="sheet-body">
          <p className="muted">Ищу продукт {mode.code}…</p>
        </div>
      )}
      {mode.kind === 'notFound' && (
        <div className="sheet-body">
          <p>
            Продукта со штрихкодом <strong>{mode.code}</strong> нет в базе.
          </p>
          <button className="primary" onClick={() => setMode({ kind: 'manual' })}>
            Ввести КБЖУ вручную
          </button>
          <button className="ghost add" onClick={() => setMode({ kind: 'scan' })}>
            Сканировать ещё раз
          </button>
        </div>
      )}
      {mode.kind === 'manual' && <ManualFood onAdd={addEntry} />}
      {mode.kind === 'photo' && <PhotoRecognize onConfirm={addRecognized} />}
      {mode.kind === 'text' && (
        <TextRecognize initialText={mode.initial} onConfirm={addRecognized} />
      )}
    </div>
  );
}

function FoodSearch(props: {
  onPick: (f: FoodDto) => void;
  onManual: () => void;
  onScan: () => void;
  onPhoto: () => void;
  onDescribe: (text: string) => void;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<FoodDto[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      api<FoodDto[]>(`/foods?q=${encodeURIComponent(q.trim())}`)
        .then(
          (res) => !cancelled && setItems(res),
          () => !cancelled && setItems([]),
        )
        .finally(() => !cancelled && setLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="sheet-body">
      <div className="search">
        <Icon name="search" size={18} />
        <input
          autoFocus
          type="search"
          placeholder="Поиск продукта"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="quick-actions">
        <button className="tile" onClick={props.onPhoto}>
          <span className="tile-icon tile-photo">
            <Icon name="camera" />
          </span>
          По фото
        </button>
        <button className="tile" onClick={() => props.onDescribe('')}>
          <span className="tile-icon tile-ai">
            <Icon name="sparkles" />
          </span>
          Словами
        </button>
        <button className="tile" onClick={props.onScan}>
          <span className="tile-icon tile-barcode">
            <Icon name="barcode" />
          </span>
          Штрихкод
        </button>
        <button className="tile" onClick={props.onManual}>
          <span className="tile-icon tile-manual">
            <Icon name="pencil" />
          </span>
          Вручную
        </button>
      </div>
      {q.trim().length >= 2 && (
        <button className="ai-suggest" onClick={() => props.onDescribe(q.trim())}>
          <Icon name="sparkles" size={18} />
          <span>
            Посчитать «{q.trim()}» через ИИ
            <span className="muted small">Если продукта нет в базе или это целое блюдо</span>
          </span>
        </button>
      )}
      {loading && <div className="muted small">Ищу в базе продуктов…</div>}
      {!loading && items && items.length === 0 && (
        <p className="muted">
          {q
            ? 'В базе ничего не нашлось. Посчитай через ИИ или добавь продукт вручную.'
            : 'Здесь появятся продукты, которые ты добавляешь чаще всего.'}
        </p>
      )}
      {!loading && items && items.length > 0 && (
        <div className="section-label">{q ? 'Результаты' : 'Часто добавляешь'}</div>
      )}
      {items && items.length > 0 && (
        <div className="list">
          {items.map((f) => (
            <button key={f.id} className="food-row" onClick={() => props.onPick(f)}>
              <span className="food-name">
                <span className="food-title">{f.name}</span>
                {f.brand && <span className="food-brand muted small">{f.brand}</span>}
              </span>
              <span className="food-kcal">
                <b>{Math.round(f.per100g.kcal)}</b>
                <span className="muted small">ккал / 100 г</span>
              </span>
              <span className="food-add" aria-hidden="true">
                <Icon name="plus" size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Portion(props: { food: FoodDto; onAdd: (grams: number) => void }) {
  const [grams, setGrams] = useState('100');
  const g = Number(grams);
  const valid = g > 0 && g <= 5000;
  const n = valid ? scaleNutrients(props.food.per100g, g) : null;

  return (
    <div className="sheet-body">
      <div>
        <h2>{props.food.name}</h2>
        <div className="muted small">
          {props.food.brand ? `${props.food.brand} · ` : ''}
          {Math.round(props.food.per100g.kcal)} ккал на 100 г
        </div>
      </div>
      <section className="card form">
        <label>
          Вес порции, г
          <input
            className="input-big"
            autoFocus
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
              {p} г
            </button>
          ))}
        </div>
      </section>
      {n && <NutrientsLine n={n} />}
      <button className="primary" disabled={!valid} onClick={() => props.onAdd(g)}>
        Добавить
      </button>
    </div>
  );
}

function ManualFood(props: {
  onAdd: (e: Omit<CreateDiaryEntry, 'meal' | 'eatenAt'>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('100');
  const [per, setPer] = useState({ kcal: '', protein: '', fat: '', carbs: '' });
  const [saveFood, setSaveFood] = useState(true);
  const [busy, setBusy] = useState(false);

  const per100g = nutrientsSchema.safeParse({
    kcal: Number(per.kcal),
    protein: Number(per.protein || 0),
    fat: Number(per.fat || 0),
    carbs: Number(per.carbs || 0),
  });
  const g = Number(grams);
  const valid = name.trim() !== '' && per.kcal !== '' && per100g.success && g > 0 && g <= 5000;

  async function submit() {
    if (!valid || !per100g.success) return;
    setBusy(true);
    try {
      let foodId: string | undefined;
      if (saveFood) {
        foodId = (await post<FoodDto>('/foods', { name: name.trim(), per100g: per100g.data })).id;
      }
      await props.onAdd({ foodId, name: name.trim(), grams: g, per100g: per100g.data });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof per, label: string) => (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={per[key]}
        onChange={(e) => setPer({ ...per, [key]: e.target.value.replace(',', '.') })}
      />
    </label>
  );

  return (
    <div className="sheet-body">
      <section className="card form">
        <label>
          Название
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, сырники"
          />
        </label>
        <div>
          <div className="label">На 100 г</div>
          <div className="row4">
            {field('kcal', 'Ккал')}
            {field('protein', 'Белки')}
            {field('fat', 'Жиры')}
            {field('carbs', 'Углев.')}
          </div>
        </div>
        <label>
          Вес порции, г
          <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
        </label>
      </section>
      {valid && per100g.success && <NutrientsLine n={scaleNutrients(per100g.data, g)} />}
      <label className="check">
        <input type="checkbox" checked={saveFood} onChange={(e) => setSaveFood(e.target.checked)} />
        Сохранить в мои продукты
      </label>
      <button className="primary" disabled={!valid || busy} onClick={submit}>
        Добавить
      </button>
    </div>
  );
}

function NutrientsLine({ n }: { n: Nutrients }) {
  return (
    <div className="nutrients">
      <div className="nutrient nutrient-kcal">
        <b>{Math.round(n.kcal)}</b>
        <span>ккал</span>
      </div>
      <div className="nutrient nutrient-protein">
        <b>{n.protein}</b>
        <span>белки, г</span>
      </div>
      <div className="nutrient nutrient-fat">
        <b>{n.fat}</b>
        <span>жиры, г</span>
      </div>
      <div className="nutrient nutrient-carbs">
        <b>{n.carbs}</b>
        <span>углев., г</span>
      </div>
    </div>
  );
}
