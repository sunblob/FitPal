import { Fragment, useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { L, setLanguage } from './i18n';
import { api, type Me } from './lib/api';
import { DiaryPage } from './pages/diary/DiaryPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { WeightPage } from './pages/weight/WeightPage';
import { WorkoutsPage } from './pages/workouts/WorkoutsPage';

const TABS = [
  { id: 'diary', icon: 'diary' },
  { id: 'weight', icon: 'scale' },
  { id: 'workouts', icon: 'dumbbell' },
  { id: 'profile', icon: 'user' },
] as const satisfies ReadonlyArray<{ id: string; icon: IconName }>;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('diary');

  // Язык ставим до setMe, чтобы первый же рендер с профилем шёл на нужном языке
  const applyMe = useCallback((m: Me) => {
    setLanguage(m.language);
    setMe(m);
  }, []);

  const reloadMe = useCallback(() => {
    api<Me>('/me').then(applyMe, (e: Error) => setError(e.message));
  }, [applyMe]);
  useEffect(reloadMe, [reloadMe]);

  if (error) {
    return (
      <main className="screen">
        <p className="muted">{L.app.loadFailed}</p>
        <pre className="error">{error}</pre>
      </main>
    );
  }
  if (!me) return <main className="screen loading muted">{L.app.loading}</main>;

  // Пока нет нормы калорий, сначала просим заполнить профиль
  if (me.targetKcal == null) {
    return (
      <ProfilePage
        key={me.language}
        me={me}
        onSaved={applyMe}
        onLanguageChanged={applyMe}
        onboarding
      />
    );
  }

  // key={me.language}: при смене языка дерево перемонтируется и читает новый словарь
  return (
    <Fragment key={me.language}>
      {tab === 'diary' && <DiaryPage me={me} />}
      {tab === 'weight' && <WeightPage me={me} onChanged={reloadMe} />}
      {tab === 'workouts' && <WorkoutsPage me={me} />}
      {tab === 'profile' && (
        <ProfilePage
          me={me}
          onSaved={(updated) => {
            applyMe(updated);
            setTab('diary');
          }}
          onLanguageChanged={applyMe}
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
            <span>{L.app.tabs[t.id]}</span>
          </button>
        ))}
      </nav>
    </Fragment>
  );
}
