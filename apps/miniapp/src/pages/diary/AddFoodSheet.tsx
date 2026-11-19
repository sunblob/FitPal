import { lazy, Suspense, useEffect, useState } from 'react';
import {
  MEAL_LABELS_RU,
  nutrientsSchema,
  scaleNutrients,
  type CreateDiaryEntry,
  type FoodDto,
  type MealType,
  type Nutrients,
} from '@fitpal/shared';
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
  | { kind: 'manual' };

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
          className="ghost"
          onClick={mode.kind === 'search' ? props.onClose : () => setMode({ kind: 'search' })}
        >
          {mode.kind === 'search' ? 'Закрыть' : '‹ Назад'}
        </button>
        <strong>{MEAL_LABELS_RU[props.meal]}</strong>
        <span />
      </div>
      {error && <pre className="error">{error}</pre>}
      {mode.kind === 'search' && (
        <FoodSearch
          onPick={(food) => setMode({ kind: 'portion', food })}
          onManual={() => setMode({ kind: 'manual' })}
          onScan={() => setMode({ kind: 'scan' })}
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
        <Suspense fallback={<p className="muted">Запускаю камеру…</p>}>
          <BarcodeScanner onDetected={lookup} />
        </Suspense>
      )}
      {mode.kind === 'lookup' && <p className="muted">Ищу продукт {mode.code}…</p>}
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
    </div>
  );
}

function FoodSearch(props: {
  onPick: (f: FoodDto) => void;
  onManual: () => void;
  onScan: () => void;
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
      <input
        autoFocus
        placeholder="Поиск продукта"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="quick-actions">
        <button className="ghost add" onClick={props.onScan}>
          Сканировать штрихкод
        </button>
        <button className="ghost add" onClick={props.onManual}>
          + Ввести вручную
        </button>
      </div>
      {loading && <div className="muted small">Ищу в базе продуктов…</div>}
      {!loading && items && items.length === 0 && (
        <p className="muted">
          {q
            ? 'Ничего не нашлось. Добавь продукт вручную.'
            : 'Здесь появятся продукты, которые ты добавляешь чаще всего.'}
        </p>
      )}
      {!q && items && items.length > 0 && <div className="muted small">Часто добавляешь</div>}
      {items?.map((f) => (
        <button key={f.id} className="food-row" onClick={() => props.onPick(f)}>
          <span>
            {f.name}
            {f.brand && <span className="muted"> · {f.brand}</span>}
          </span>
          <span className="muted nowrap">{Math.round(f.per100g.kcal)} ккал/100 г</span>
        </button>
      ))}
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
      <h2>{props.food.name}</h2>
      {props.food.brand && <div className="muted">{props.food.brand}</div>}
      <label>
        Вес порции, г
        <input
          autoFocus
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
        />
      </label>
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
      <label>
        Название
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, сырники"
        />
      </label>
      <div className="label">На 100 г</div>
      <div className="row4">
        {field('kcal', 'Ккал')}
        {field('protein', 'Белки')}
        {field('fat', 'Жиры')}
        {field('carbs', 'Углев.')}
      </div>
      <label>
        Вес порции, г
        <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
      </label>
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
    <div className="card">
      <div className="big">{n.kcal} ккал</div>
      <div className="muted">
        Б {n.protein} г · Ж {n.fat} г · У {n.carbs} г
      </div>
    </div>
  );
}
