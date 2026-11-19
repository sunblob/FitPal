import { useState } from 'react';
import {
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MUSCLE_LABELS,
  WORKOUT_GOAL_LABELS,
  equipmentSchema,
  exerciseLevelSchema,
  muscleSchema,
  workoutGoalSchema,
  type Equipment,
  type ExerciseLevel,
  type GenerateWorkoutPlan,
  type Muscle,
  type WorkoutGoal,
} from '@fitpal/shared';
import { getLanguage, L } from '../../i18n';

const GYM: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'e-z curl bar', 'other'];
const HOME: Equipment[] = ['dumbbell', 'bands', 'other'];

function Chips<T extends string>(props: {
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="wk-chips">
      {props.options.map((o) => (
        <button
          type="button"
          key={o}
          className={props.selected.includes(o) ? 'wk-chip wk-chip-on' : 'wk-chip'}
          onClick={() => props.onToggle(o)}
        >
          {props.labels[o]}
        </button>
      ))}
    </div>
  );
}

export function PlanForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (p: GenerateWorkoutPlan) => void;
}) {
  const [goal, setGoal] = useState<WorkoutGoal>('hypertrophy');
  const [level, setLevel] = useState<ExerciseLevel>('beginner');
  const [daysPerWeek, setDays] = useState(3);
  const [sessionMinutes, setMinutes] = useState(60);
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>(GYM);
  const [notes, setNotes] = useState('');
  const lang = getLanguage();
  const t = L.workouts.form;

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <form
      className="screen"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          goal,
          level,
          daysPerWeek,
          sessionMinutes,
          muscles,
          equipment,
          notes: notes.trim() || undefined,
        });
      }}
    >
      <div>
        <h1>{t.title}</h1>
        <p className="muted">{t.intro}</p>
      </div>

      <section className="card wk-field">
        <div className="card-title">{t.goal}</div>
        <Chips
          options={workoutGoalSchema.options}
          labels={WORKOUT_GOAL_LABELS[lang]}
          selected={[goal]}
          onToggle={setGoal}
        />
      </section>

      <section className="card wk-field">
        <div className="card-title">{t.level}</div>
        <Chips
          options={exerciseLevelSchema.options}
          labels={LEVEL_LABELS[lang]}
          selected={[level]}
          onToggle={setLevel}
        />
      </section>

      <section className="card wk-field">
        <label className="wk-row">
          <span>{t.perWeek}</span>
          <b>{daysPerWeek}</b>
        </label>
        <input
          type="range"
          min={1}
          max={6}
          value={daysPerWeek}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <label className="wk-row">
          <span>{t.duration}</span>
          <b>{t.minutes(sessionMinutes)}</b>
        </label>
        <input
          type="range"
          min={20}
          max={120}
          step={5}
          value={sessionMinutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </section>

      <section className="card wk-field">
        <div className="card-title">{t.muscles}</div>
        <Chips
          options={muscleSchema.options}
          labels={MUSCLE_LABELS[lang]}
          selected={muscles}
          onToggle={(m) => setMuscles((l) => toggle(l, m))}
        />
      </section>

      <section className="card wk-field">
        <div className="wk-row">
          <span className="card-title">{t.equipment}</span>
          <span className="wk-presets">
            <button type="button" className="wk-link" onClick={() => setEquipment(GYM)}>
              {t.gym}
            </button>
            <button type="button" className="wk-link" onClick={() => setEquipment(HOME)}>
              {t.home}
            </button>
            <button type="button" className="wk-link" onClick={() => setEquipment([])}>
              {t.none}
            </button>
          </span>
        </div>
        <Chips
          options={equipmentSchema.options}
          labels={EQUIPMENT_LABELS[lang]}
          selected={equipment}
          onToggle={(eq) => setEquipment((l) => toggle(l, eq))}
        />
      </section>

      <section className="card wk-field">
        <div className="card-title">{t.notes}</div>
        <textarea
          className="wk-textarea"
          rows={3}
          maxLength={500}
          placeholder={t.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <div className="wk-submit">
        <button type="submit" className="primary" disabled={busy || muscles.length === 0}>
          {muscles.length === 0 ? t.pickMuscle : L.workouts.makePlan}
        </button>
      </div>
    </form>
  );
}
