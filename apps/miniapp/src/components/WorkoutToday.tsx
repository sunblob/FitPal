import type { ExerciseLogDto } from '@fitpal/shared';
import { L } from '../i18n';
import { Icon } from './Icon';

/** Сводка тренировки за день: сколько упражнений и подходов отмечено. */
export function WorkoutToday(props: {
  logs: ExerciseLogDto[];
  title: string;
  /** Список названий под итогом. */
  showList?: boolean;
  empty?: string;
}) {
  const { logs } = props;
  const sets = logs.reduce((s, l) => s + (l.sets ?? 0), 0);
  return (
    <section className="card wk-today">
      <div className="wk-today-head">
        <span
          className={logs.length > 0 ? 'stat-icon wk-today-icon done' : 'stat-icon wk-today-icon'}
        >
          <Icon name={logs.length > 0 ? 'check' : 'dumbbell'} size={18} />
        </span>
        <div className="wk-today-text">
          <strong>{props.title}</strong>
          <span className="muted small">
            {logs.length > 0
              ? L.workouts.exercises(logs.length) + (sets > 0 ? ` · ${L.workouts.sets(sets)}` : '')
              : (props.empty ?? L.workouts.nothingYet)}
          </span>
        </div>
      </div>
      {props.showList && logs.length > 0 && (
        <ul className="wk-today-list">
          {logs.map((l) => (
            <li key={l.exerciseId}>
              <span>{l.name}</span>
              {l.sets != null && (
                <span className="muted small nowrap">{L.workouts.setsShort(l.sets)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
