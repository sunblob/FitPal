import { useMemo, useState } from 'react';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  LANGUAGE_NAMES,
  LANGUAGES,
  activityLevelSchema,
  dailyTarget,
  goalSchema,
  profileSchema,
  weightPlan,
  type ActivityLevel,
  type Goal,
  type Language,
  type Sex,
} from '@fitpal/shared';
import { getLanguage, L } from '../../i18n';
import { put, type Me } from '../../lib/api';
import { browserTimezone, formatDate, profileFromMe } from '../../lib/profile';

const RATES = [0.25, 0.5, 0.75, 1];
const REMINDER_HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

export function ProfilePage(props: {
  me: Me;
  onSaved: (me: Me) => void;
  onMeChanged: (me: Me) => void;
  onboarding?: boolean;
}) {
  const lang = getLanguage();
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

  async function changeLanguage(language: Language) {
    if (language === props.me.language) return;
    try {
      props.onMeChanged(await put<Me>('/me/language', { language }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function changeReminder(value: string) {
    try {
      props.onMeChanged(
        await put<Me>('/me/reminders', { reminderHour: value === '' ? null : Number(value) }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function changeStepsKcal(addStepsKcal: boolean) {
    try {
      props.onMeChanged(await put<Me>('/me/steps-kcal', { addStepsKcal }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

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
      <h1>{props.onboarding ? L.profile.titleOnboarding : L.profile.title}</h1>
      {props.onboarding && <p className="muted">{L.profile.onboardingHint}</p>}

      <div className="section-label">{L.profile.language}</div>
      <section className="card form">
        <div className="segmented">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              className={props.me.language === l ? 'on' : ''}
              onClick={() => void changeLanguage(l)}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </section>

      {!props.onboarding && (
        <>
          <div className="section-label">{L.profile.reminders}</div>
          <section className="card form">
            <select
              aria-label={L.profile.reminders}
              value={props.me.reminderHour ?? ''}
              onChange={(e) => void changeReminder(e.target.value)}
            >
              <option value="">{L.profile.remindersOff}</option>
              {REMINDER_HOURS.map((h) => (
                <option key={h} value={h}>
                  {L.profile.at(h)}
                </option>
              ))}
            </select>
            <p className="muted small">{L.profile.remindersHint}</p>
          </section>

          <section className="card form">
            <label className="check">
              <input
                type="checkbox"
                checked={props.me.addStepsKcal}
                onChange={(e) => void changeStepsKcal(e.target.checked)}
              />
              {L.profile.stepsKcal}
            </label>
            <p className="muted small">{L.profile.stepsKcalHint}</p>
          </section>
        </>
      )}

      <div className="section-label">{L.profile.aboutYou}</div>
      <section className="card form">
        <div className="segmented">
          {(['male', 'female'] as const).map((s) => (
            <button key={s} className={sex === s ? 'on' : ''} onClick={() => setSex(s)}>
              {s === 'male' ? L.profile.male : L.profile.female}
            </button>
          ))}
        </div>
        <div className="row3">
          <label>
            {L.profile.birthYear}
            <input
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="1995"
            />
          </label>
          <label>
            {L.profile.height}
            <input
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="180"
            />
          </label>
          <label>
            {L.profile.weight}
            <input
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="80"
            />
          </label>
        </div>
        <label>
          {L.profile.activity}
          <select
            value={activityLevel}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
          >
            {activityLevelSchema.options.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[lang][a]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="section-label">{L.profile.goal}</div>
      <section className="card form">
        <div className="segmented">
          {goalSchema.options.map((g) => (
            <button key={g} className={goal === g ? 'on' : ''} onClick={() => setGoal(g)}>
              {GOAL_LABELS[lang][g]}
            </button>
          ))}
        </div>
        {goal !== 'maintain' && (
          <>
            <label>
              {L.profile.targetWeight}
              <input
                inputMode="decimal"
                value={targetWeightKg}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={goal === 'lose' ? '72' : '85'}
              />
            </label>
            <div>
              <div className="label">{L.profile.rate}</div>
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
                {goal === 'lose' ? L.profile.targetBelow : L.profile.targetAbove}
              </p>
            )}
          </>
        )}
      </section>

      {target && (
        <section className="card hero norm">
          <div className="muted small">{L.profile.dailyNorm}</div>
          <div className="display">
            {target.kcal}
            <span className="unit"> {L.common.kcal}</span>
          </div>
          <div className="macro-pills">
            <span className="macro-pill macro-protein">{L.profile.proteinG(target.protein)}</span>
            <span className="macro-pill macro-fat">{L.profile.fatG(target.fat)}</span>
            <span className="macro-pill macro-carbs">{L.profile.carbsG(target.carbs)}</span>
          </div>
          {plan && !wrongDirection && (
            <p className="plan-line muted">
              {L.profile.planLine(
                plan.startWeightKg,
                plan.targetWeightKg,
                plan.weeks,
                formatDate(plan.etaDate),
              )}
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
        {saving ? L.common.saving : L.common.save}
      </button>
    </main>
  );
}
