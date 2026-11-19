import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { api, type Me } from './lib/api';
import { DiaryPage } from './pages/diary/DiaryPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { WeightPage } from './pages/weight/WeightPage';
import { WorkoutsPage } from './pages/workouts/WorkoutsPage';

const TABS = [
  { id: 'diary', label: 'Дневник', icon: 'diary' },
  { id: 'weight', label: 'Вес', icon: 'scale' },
  { id: 'workouts', label: 'Тренировки', icon: 'dumbbell' },
  { id: 'profile', label: 'Профиль', icon: 'user' },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: IconName }>;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('diary');

  const reloadMe = useCallback(() => {
    api<Me>('/me').then(setMe, (e: Error) => setError(e.message));
  }, []);
  useEffect(reloadMe, [reloadMe]);

  if (error) {
    return (
      <main className="screen">
        <p className="muted">Не удалось загрузить профиль. Открой приложение из Telegram.</p>
        <pre className="error">{error}</pre>
      </main>
    );
  }
  if (!me) return <main className="screen loading muted">Загрузка…</main>;

  // Пока нет нормы калорий, сначала просим заполнить профиль
  if (me.targetKcal == null) {
    return <ProfilePage me={me} onSaved={setMe} onboarding />;
  }

  return (
    <>
      {tab === 'diary' && <DiaryPage me={me} />}
      {tab === 'weight' && <WeightPage me={me} onChanged={reloadMe} />}
      {tab === 'workouts' && <WorkoutsPage me={me} />}
      {tab === 'profile' && (
        <ProfilePage
          me={me}
          onSaved={(updated) => {
            setMe(updated);
            setTab('diary');
          }}
        />
      )}
      <nav className="tabbar" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab tab-on' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              window.scrollTo(0, 0);
            }}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
