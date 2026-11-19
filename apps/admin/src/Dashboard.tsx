import { useEffect, useState } from 'react';
import type { AdminDayStat, AdminStats } from '@fitpal/shared';
import { api } from './api';

const fmt = new Intl.NumberFormat('ru-RU');

const METRICS: { key: keyof Omit<AdminDayStat, 'date'>; title: string }[] = [
  { key: 'activeUsers', title: 'Активные пользователи' },
  { key: 'signups', title: 'Регистрации' },
  { key: 'diaryEntries', title: 'Записи в дневнике' },
  { key: 'aiRequests', title: 'AI-запросы' },
];

const AI_KIND_TITLES: Record<string, string> = {
  photo: 'Фото еды',
  label: 'Этикетка',
  text: 'Еда текстом',
  workout_plan: 'План тренировок',
  translation: 'Перевод упражнений',
};

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{fmt.format(value)}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

function DailyChart({ days }: { days: AdminDayStat[] }) {
  const [metric, setMetric] = useState(METRICS[0]!.key);
  const max = Math.max(1, ...days.map((d) => d[metric]));
  return (
    <section className="card">
      <div className="card-head">
        <h2>По дням, 30 дней (UTC)</h2>
        <div className="seg">
          {METRICS.map((m) => (
            <button
              key={m.key}
              className={m.key === metric ? 'on' : undefined}
              onClick={() => setMetric(m.key)}
            >
              {m.title}
            </button>
          ))}
        </div>
      </div>
      <div className="bars" role="img" aria-label={METRICS.find((m) => m.key === metric)?.title}>
        {days.map((d) => (
          <div key={d.date} className="bar-col" title={`${d.date}: ${d[metric]}`}>
            <span className="bar-num">{d[metric] || ''}</span>
            <div className="bar" style={{ height: `${(d[metric] / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="bars-axis">
        <span>{days[0]?.date}</span>
        <span>{days.at(-1)?.date}</span>
      </div>
    </section>
  );
}

export function Dashboard({
  onError,
  consoleUrl,
}: {
  onError: (e: unknown) => void;
  consoleUrl: string;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminStats>('/stats')
      .then(setStats)
      .catch((e: unknown) => {
        onError(e);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [onError]);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Загрузка…</p>;

  const { users, diary, ai, catalog } = stats;
  return (
    <div className="dashboard">
      <h2 className="section-title">Пользователи</h2>
      <div className="tiles">
        <Tile label="Всего" value={users.total} />
        <Tile label="Активны сегодня" value={users.activeToday} />
        <Tile label="Активны за 7 дней" value={users.active7d} />
        <Tile label="Новые за 7 дней" value={users.new7d} hint={`за 30 дней: ${users.new30d}`} />
      </div>

      <h2 className="section-title">Дневник и AI</h2>
      <div className="tiles">
        <Tile
          label="Записей сегодня"
          value={diary.today}
          hint={`за 7 дней: ${fmt.format(diary.last7d)}`}
        />
        <Tile label="Записей всего" value={diary.total} />
        <Tile
          label="AI-запросов сегодня"
          value={ai.today}
          hint={`за 7 дней: ${fmt.format(ai.last7d)}`}
        />
        <Tile
          label="AI-запросов за 30 дней"
          value={ai.last30d}
          hint={ai.failed7d ? `ошибок за 7 дней: ${ai.failed7d}` : undefined}
        />
      </div>

      <DailyChart days={stats.daily} />

      <div className="two-col">
        <section className="card">
          <h2>AI за 30 дней</h2>
          <table className="mini">
            <tbody>
              {ai.byKind30d.map((k) => (
                <tr key={k.kind}>
                  <td>{AI_KIND_TITLES[k.kind] ?? k.kind}</td>
                  <td className="num">{fmt.format(k.count)}</td>
                </tr>
              ))}
              <tr>
                <td>Входные токены</td>
                <td className="num">{fmt.format(ai.inputTokens30d)}</td>
              </tr>
              <tr>
                <td>Выходные токены</td>
                <td className="num">{fmt.format(ai.outputTokens30d)}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted small">
            Остаток лимитов и расходы по ключу смотри в{' '}
            <a href={consoleUrl} target="_blank" rel="noreferrer">
              Anthropic Console → Usage
            </a>
            . Журнал AI-запросов ведётся с момента выкатки админки.
          </p>
        </section>
        <section className="card">
          <h2>Каталог</h2>
          <table className="mini">
            <tbody>
              <tr>
                <td>Продукты</td>
                <td className="num">{fmt.format(catalog.foods)}</td>
              </tr>
              <tr>
                <td>Упражнения</td>
                <td className="num">{fmt.format(catalog.exercises)}</td>
              </tr>
              <tr>
                <td>Планы тренировок</td>
                <td className="num">{fmt.format(catalog.workoutPlans)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
