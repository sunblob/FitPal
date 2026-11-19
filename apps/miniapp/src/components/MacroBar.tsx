export type MacroKind = 'protein' | 'fat' | 'carbs';

/** Полоска прогресса по одному макронутриенту, цвет задаётся через kind. */
export function MacroBar(props: {
  kind: MacroKind;
  label: string;
  value: number;
  target?: number;
}) {
  const { kind, label, value, target } = props;
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target != null && value > target;
  return (
    <div className={`macro macro-${kind}`}>
      <div className="macro-label">{label}</div>
      <div className="bar">
        <div className={over ? 'bar-fill over' : 'bar-fill'} style={{ width: `${pct}%` }} />
      </div>
      <div className="macro-value">
        <b>{Math.round(value)}</b>
        <span className="muted">{target ? ` / ${target} г` : ' г'}</span>
      </div>
    </div>
  );
}
