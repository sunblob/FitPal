const SIZE = 148;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const LEN = 2 * Math.PI * R;

/** Кольцо дневной нормы: сколько съедено из нормы и сколько осталось в центре. */
export function CalorieRing(props: { eaten: number; target: number | null }) {
  const { eaten, target } = props;
  const left = target != null ? Math.round(target - eaten) : null;
  const over = left != null && left < 0;
  const pct = target ? Math.min(1, eaten / target) : 0;

  return (
    <div className={over ? 'ring over' : 'ring'}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="ring-track" cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE} />
        <circle
          className="ring-fill"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          strokeWidth={STROKE}
          strokeDasharray={LEN}
          strokeDashoffset={LEN * (1 - pct)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-value">{left != null ? Math.abs(left) : Math.round(eaten)}</div>
        <div className="ring-caption">
          {left == null ? 'ккал съедено' : over ? 'ккал сверх нормы' : 'ккал осталось'}
        </div>
      </div>
    </div>
  );
}
