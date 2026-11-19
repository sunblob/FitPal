import { lazy, Suspense, useEffect, useState } from 'react';
import {
  MEAL_LABELS,
  nutrientsSchema,
  scaleNutrients,
  type CreateDiaryEntry,
  type FoodDto,
  type MealType,
  type Nutrients,
  type NutritionLabel,
  type RecognizedFood,
} from '@fitpal/shared';
import { FoodThumb } from '../../components/FoodThumb';
import { Icon } from '../../components/Icon';
import { PhotoRecognize } from '../../components/PhotoRecognize';
import { aiErrorText } from '../../components/RecognizedItems';
import { TextRecognize } from '../../components/TextRecognize';
import { getLanguage, L } from '../../i18n';
import { api, post } from '../../lib/api';
import { prepareImage } from '../../lib/image';

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
  | { kind: 'manual'; barcode?: string }
  | { kind: 'photo' }
  | { kind: 'text'; initial: string };

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
          aria-label={mode.kind === 'search' ? L.common.close : L.common.back}
        >
          <Icon name={mode.kind === 'search' ? 'close' : 'back'} />
        </button>
        <div className="sheet-title">
          <strong>{MEAL_LABELS[getLanguage()][props.meal]}</strong>
          <span className="muted small">{L.add.subtitles[mode.kind]}</span>
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
              <p className="muted">{L.add.startingCamera}</p>
            </div>
          }
        >
          <BarcodeScanner onDetected={lookup} />
        </Suspense>
      )}
      {mode.kind === 'lookup' && (
        <div className="sheet-body">
          <p className="muted">{L.add.lookingUp(mode.code)}</p>
        </div>
      )}
      {mode.kind === 'notFound' && (
        <div className="sheet-body">
          <p>
            {L.add.notFoundBefore}
            <strong>{mode.code}</strong>
            {L.add.notFoundAfter}
          </p>
          <p className="muted small">{L.add.notFoundHint}</p>
          <button
            className="primary"
            onClick={() => setMode({ kind: 'manual', barcode: mode.code })}
          >
            {L.add.addProduct}
          </button>
          <button className="ghost add" onClick={() => setMode({ kind: 'scan' })}>
            {L.add.scanAgain}
          </button>
        </div>
      )}
      {mode.kind === 'manual' && <ManualFood barcode={mode.barcode} onAdd={addEntry} />}
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
          placeholder={L.add.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="quick-actions">
        <button className="tile" onClick={props.onPhoto}>
          <span className="tile-icon tile-photo">
            <Icon name="camera" />
          </span>
          {L.add.byPhoto}
        </button>
        <button className="tile" onClick={() => props.onDescribe('')}>
          <span className="tile-icon tile-ai">
            <Icon name="sparkles" />
          </span>
          {L.add.inWords}
        </button>
        <button className="tile" onClick={props.onScan}>
          <span className="tile-icon tile-barcode">
            <Icon name="barcode" />
          </span>
          {L.add.barcode}
        </button>
        <button className="tile" onClick={props.onManual}>
          <span className="tile-icon tile-manual">
            <Icon name="pencil" />
          </span>
          {L.add.manually}
        </button>
      </div>
      {q.trim().length >= 2 && (
        <button className="ai-suggest" onClick={() => props.onDescribe(q.trim())}>
          <Icon name="sparkles" size={18} />
          <span>
            {L.add.aiSuggest(q.trim())}
            <span className="muted small">{L.add.aiSuggestHint}</span>
          </span>
        </button>
      )}
      {loading && <div className="muted small">{L.add.searching}</div>}
      {!loading && items && items.length === 0 && (
        <p className="muted">{q ? L.add.nothingFound : L.add.frequentEmpty}</p>
      )}
      {!loading && items && items.length > 0 && (
        <div className="section-label">{q ? L.add.results : L.add.frequent}</div>
      )}
      {items && items.length > 0 && (
        <div className="list">
          {items.map((f) => (
            <button key={f.id} className="food-row" onClick={() => props.onPick(f)}>
              <FoodThumb imageUrl={f.imageUrl} category={f.category} />
              <span className="food-name">
                {f.name}
                {f.brand && <span className="muted small">{f.brand}</span>}
              </span>
              <span className="food-kcal">
                <b>{Math.round(f.per100g.kcal)}</b>
                <span className="muted small">{L.add.per100}</span>
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
      <div className="portion-head">
        <FoodThumb imageUrl={props.food.imageUrl} category={props.food.category} size="large" />
        <div>
          <h2>{props.food.name}</h2>
          <div className="muted small">
            {props.food.brand ? `${props.food.brand} · ` : ''}
            {L.add.kcalPer100(Math.round(props.food.per100g.kcal))}
          </div>
        </div>
      </div>
      <section className="card form">
        <label>
          {L.add.portionWeight}
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
              {p} {L.common.g}
            </button>
          ))}
        </div>
      </section>
      {n && <NutrientsLine n={n} />}
      <button className="primary" disabled={!valid} onClick={() => props.onAdd(g)}>
        {L.common.add}
      </button>
    </div>
  );
}

function ManualFood(props: {
  /** Штрихкод товара, который не нашёлся при скане: продукт сохранится с ним. */
  barcode?: string;
  onAdd: (e: Omit<CreateDiaryEntry, 'meal' | 'eatenAt'>) => Promise<void>;
}) {
  const { barcode } = props;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [label, setLabel] = useState<{ busy: boolean; note: string | null; error: string | null }>({
    busy: false,
    note: null,
    error: null,
  });
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
      if (saveFood || barcode) {
        const food = await post<FoodDto>('/foods', {
          name: name.trim(),
          brand: brand.trim() || undefined,
          barcode,
          per100g: per100g.data,
        });
        foodId = food.id;
      }
      await props.onAdd({ foodId, name: name.trim(), grams: g, per100g: per100g.data });
    } finally {
      setBusy(false);
    }
  }

  /** Фото таблицы пищевой ценности → поля формы. */
  async function readLabel(file: File | undefined) {
    if (!file) return;
    setLabel({ busy: true, note: null, error: null });
    try {
      const res = await post<NutritionLabel>('/recognize/label', await prepareImage(file));
      if (res.per100g) {
        const s = (n: number) => String(n);
        setPer({
          kcal: s(res.per100g.kcal),
          protein: s(res.per100g.protein),
          fat: s(res.per100g.fat),
          carbs: s(res.per100g.carbs),
        });
      }
      if (res.name && !name.trim()) setName(res.name);
      if (res.brand && !brand.trim()) setBrand(res.brand);
      setLabel({
        busy: false,
        note: res.per100g ? (res.note ?? L.add.labelFilled) : (res.note ?? L.add.labelUnreadable),
        error: null,
      });
    } catch (e) {
      setLabel({
        busy: false,
        note: null,
        error: aiErrorText(e, L.add.labelFailed),
      });
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
      {barcode && (
        <div className="barcode-note">
          <Icon name="barcode" size={18} />
          <span>
            {L.add.barcodeLabel} <b>{barcode}</b>
          </span>
        </div>
      )}
      {barcode && (
        <label className={label.busy ? 'file-button busy' : 'file-button'}>
          <Icon name="camera" />
          {label.busy ? L.add.readingLabel : L.add.fillFromLabel}
          <input
            type="file"
            accept="image/*"
            disabled={label.busy}
            onChange={(e) => void readLabel(e.target.files?.[0])}
          />
        </label>
      )}
      {label.note && <p className="muted small">{label.note}</p>}
      {label.error && <p className="error-text small">{label.error}</p>}
      <section className="card form">
        <label>
          {L.add.name}
          <input
            autoFocus={!barcode}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={barcode ? L.add.namePlaceholderBarcode : L.add.namePlaceholder}
          />
        </label>
        {barcode && (
          <label>
            {L.add.brand}
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
        )}
        <div>
          <div className="label">{L.add.per100g}</div>
          <div className="row4">
            {field('kcal', L.add.kcalShort)}
            {field('protein', L.common.protein)}
            {field('fat', L.common.fat)}
            {field('carbs', L.add.carbsShort)}
          </div>
        </div>
        <label>
          {L.add.portionWeight}
          <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
        </label>
      </section>
      {valid && per100g.success && <NutrientsLine n={scaleNutrients(per100g.data, g)} />}
      {barcode ? (
        <p className="muted small">{L.add.barcodeSaveHint}</p>
      ) : (
        <label className="check">
          <input
            type="checkbox"
            checked={saveFood}
            onChange={(e) => setSaveFood(e.target.checked)}
          />
          {L.add.saveToMine}
        </label>
      )}
      <button className="primary" disabled={!valid || busy} onClick={submit}>
        {L.common.add}
      </button>
    </div>
  );
}

function NutrientsLine({ n }: { n: Nutrients }) {
  return (
    <div className="nutrients">
      <div className="nutrient nutrient-kcal">
        <b>{Math.round(n.kcal)}</b>
        <span>{L.common.kcal}</span>
      </div>
      <div className="nutrient nutrient-protein">
        <b>{n.protein}</b>
        <span>{L.add.proteinG}</span>
      </div>
      <div className="nutrient nutrient-fat">
        <b>{n.fat}</b>
        <span>{L.add.fatG}</span>
      </div>
      <div className="nutrient nutrient-carbs">
        <b>{n.carbs}</b>
        <span>{L.add.carbsG}</span>
      </div>
    </div>
  );
}
