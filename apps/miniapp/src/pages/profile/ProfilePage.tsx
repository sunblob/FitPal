import { useMemo, useState } from 'react';
import {
  ACTIVITY_LABELS_RU,
  GOAL_LABELS_RU,
  activityLevelSchema,
  dailyTarget,
  goalSchema,
  profileSchema,
  weightPlan,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '@fitpal/shared';
import { put, type Me } from '../../lib/api';
import { browserTimezone, formatDateRu, profileFromMe } from '../../lib/profile';

const RATES = [0.25, 0.5, 0.75, 1];

export function ProfilePage(props: { me: Me; onSaved: (me: Me) => void; onboarding?: boolean }) {
  const initial = profileFromMe(props.me);
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [birthYear, setBirthYear] = useState(String(initial?.birthYear ?? ''));
  const [heightCm, setHeightCm] = useState(String(initial?.heightCm ?? ''));
  const [weightKg, setWeightKg] = useState(String(initial?.weightKg ?? ''));
  const [activityLevel, setActivity] = useState<ActivityLevel>(initial?.activityLevel ?? 'light');
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? 'lose');
  const [targetWeightKg, setTargetWeight] = useState(String(initial?.targetWeightKg ?? ''));
  const [weeklyRateKg, setRate] = useState(initial?.weeklyRateKg ?? 0.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(
    () =>
      profileSchema.safeParse({
        sex,
        birthYear: Number(birthYear),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel,
        goal,
        targetWeightKg: goal !== 'maintain' && targetWeightKg ? Number(targetWeightKg) : undefined,
        weeklyRateKg: goal !== 'maintain' ? weeklyRateKg : undefined,
        timezone: browserTimezone(),
      }),
    [sex, birthYear, heightCm, weightKg, activityLevel, goal, targetWeightKg, weeklyRateKg],
  );

  const target = parsed.success ? dailyTarget(parsed.data) : null;
  const plan = parsed.success ? weightPlan(parsed.data) : null;
  const wrongDirection =
    parsed.success &&
    parsed.data.targetWeightKg != null &&
    ((goal === 'lose' && parsed.data.targetWeightKg >= parsed.data.weightKg) ||
      (goal === 'gain' && parsed.data.targetWeightKg <= parsed.data.weightKg));

  async function save() {
    if (!parsed.success || wrongDirection) return;
    setSaving(true);
    setError(null);
    try {
      props.onSaved(await put<Me>('/me/profile', parsed.data));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <h1>{props.onboarding ? 'Давай познакомимся' : 'Профиль и цель'}</h1>
      {props.onboarding && (
        <p className="muted">По этим данным я рассчитаю твою дневную норму калорий и план веса.</p>
      )}

      <div className="section-label">О тебе</div>
      <section className="card form">
        <div className="segmented">
          {(['male', 'female'] as const).map((s) => (
            <button key={s} className={sex === s ? 'on' : ''} onClick={() => setSex(s)}>
              {s === 'male' ? 'Мужчина' : 'Женщина'}
            </button>
          ))}
        </div>
        <div className="row3">
          <label>
            Год рождения
            <input
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="1995"
            />
          </label>
          <label>
            Рост, см
            <input
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="180"
            />
          </label>
          <label>
            Вес, кг
            <input
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="80"
            />
          </label>
        </div>
        <label>
          Активность
          <select
            value={activityLevel}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
          >
            {activityLevelSchema.options.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS_RU[a]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="section-label">Цель</div>
      <section className="card form">
        <div className="segmented">
          {goalSchema.options.map((g) => (
            <button key={g} className={goal === g ? 'on' : ''} onClick={() => setGoal(g)}>
              {GOAL_LABELS_RU[g]}
            </button>
          ))}
        </div>
        {goal !== 'maintain' && (
          <>
            <label>
              Целевой вес, кг
              <input
                inputMode="decimal"
                value={targetWeightKg}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={goal === 'lose' ? '72' : '85'}
              />
            </label>
            <div>
              <div className="label">Темп, кг в неделю</div>
              <div className="segmented">
                {RATES.map((r) => (
                  <button
                    key={r}
                    className={weeklyRateKg === r ? 'on' : ''}
                    onClick={() => setRate(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {wrongDirection && (
              <p className="error-text">
                {goal === 'lose'
                  ? 'Целевой вес должен быть меньше текущего.'
                  : 'Целевой вес должен быть больше текущего.'}
              </p>
            )}
          </>
        )}
      </section>

      {target && (
        <section className="card hero norm">
          <div className="muted small">Твоя норма в день</div>
          <div className="display">
            {target.kcal}
            <span className="unit"> ккал</span>
          </div>
          <div className="macro-pills">
            <span className="macro-pill macro-protein">Белки {target.protein} г</span>
            <span className="macro-pill macro-fat">Жиры {target.fat} г</span>
            <span className="macro-pill macro-carbs">Углеводы {target.carbs} г</span>
          </div>
          {plan && !wrongDirection && (
            <p className="plan-line muted">
              С {plan.startWeightKg} до {plan.targetWeightKg} кг примерно за {plan.weeks} нед., к{' '}
              {formatDateRu(plan.etaDate)}
            </p>
          )}
        </section>
      )}

      {error && <pre className="error">{error}</pre>}
      <button
        className="primary"
        disabled={!parsed.success || wrongDirection || saving}
        onClick={save}
      >
        {saving ? 'Сохраняю…' : 'Сохранить'}
      </button>
    </main>
  );
}
