import type { ExerciseLogDto } from '@fitpal/shared';
import { Icon } from './Icon';

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const exercisesWord = (n: number) => plural(n, 'упражнение', 'упражнения', 'упражнений');
export const setsWord = (n: number) => plural(n, 'подход', 'подхода', 'подходов');

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
              ? `${logs.length} ${exercisesWord(logs.length)}` +
                (sets > 0 ? ` · ${sets} ${setsWord(sets)}` : '')
              : (props.empty ?? 'Пока ничего не отмечено')}
          </span>
        </div>
      </div>
      {props.showList && logs.length > 0 && (
        <ul className="wk-today-list">
          {logs.map((l) => (
            <li key={l.exerciseId}>
              <span>{l.name}</span>
              {l.sets != null && <span className="muted small nowrap">{l.sets} подх.</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
