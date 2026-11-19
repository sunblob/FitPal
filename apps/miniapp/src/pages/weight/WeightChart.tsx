import type { WeightLogDto } from '../../lib/api';

const W = 340;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 22, left: 34 };

/** Простой линейный график веса с линией цели. */
export function WeightChart(props: { logs: WeightLogDto[]; targetKg?: number | null }) {
  const { logs, targetKg } = props;
  if (logs.length === 0) return <p className="muted">Пока нет взвешиваний.</p>;

  const values = logs.map((l) => l.weightKg).concat(targetKg ? [targetKg] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const t0 = new Date(logs[0]!.date).getTime();
  const t1 = new Date(logs[logs.length - 1]!.date).getTime();
  const span = Math.max(t1 - t0, 1);

  const x = (date: string) =>
    logs.length === 1
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((new Date(date).getTime() - t0) / span) * (W - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((max - kg) / (max - min)) * (H - PAD.top - PAD.bottom);

  const path = logs
    .map((l, i) => `${i ? 'L' : 'M'}${x(l.date).toFixed(1)},${y(l.weightKg).toFixed(1)}`)
    .join(' ');
  const ticks = [min, (min + max) / 2, max];
  const label = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="График веса">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="axis">
            {Math.round(t)}
          </text>
        </g>
      ))}
      {targetKg && (
        <g>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(targetKg)}
            y2={y(targetKg)}
            className="target"
          />
          <text x={W - PAD.right} y={y(targetKg) - 4} textAnchor="end" className="axis">
            цель {targetKg}
          </text>
        </g>
      )}
      <path d={path} className="line" />
      {logs.map((l) => (
        <circle key={l.id} cx={x(l.date)} cy={y(l.weightKg)} r={3} className="dot" />
      ))}
      <text x={PAD.left} y={H - 6} className="axis">
        {label(logs[0]!.date)}
      </text>
      {logs.length > 1 && (
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="axis">
          {label(logs[logs.length - 1]!.date)}
        </text>
      )}
    </svg>
  );
}
