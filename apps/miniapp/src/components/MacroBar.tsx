export function MacroBar(props: { label: string; value: number; target?: number; unit?: string }) {
  const { label, value, target, unit = 'г' } = props;
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="macro">
      <div className="macro-head">
        <span>{label}</span>
        <span className="muted">
          {Math.round(value)}
          {target ? ` / ${target}` : ''} {unit}
        </span>
      </div>
      <div className="bar">
        <div
          className={value > (target ?? Infinity) ? 'bar-fill over' : 'bar-fill'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
