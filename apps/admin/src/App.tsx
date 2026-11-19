import { useCallback, useEffect, useState } from 'react';
import type { AdminSession } from '@fitpal/shared';
import { loadSession, saveSession, UnauthorizedError } from './api';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import { ResourcePage } from './ResourcePage';
import { RESOURCES } from './resources';

const CONSOLE_USAGE_URL = 'https://platform.claude.com/usage';

/** Маршрут из hash: #/users, #/diary?userId=… */
function readRoute(): { tab: string; params: URLSearchParams } {
  const [path = '', query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { tab: path || 'dashboard', params: new URLSearchParams(query) };
}

export function navigate(tab: string, params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  window.location.hash = `/${tab}${query}`;
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(loadSession);
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onError = useCallback((e: unknown) => {
    if (e instanceof UnauthorizedError) setSession(null);
  }, []);

  if (!session) return <Login onLogin={setSession} />;

  const resource = RESOURCES.find((r) => r.key === route.tab);
  const tabs = [{ key: 'dashboard', title: 'Обзор' }, ...RESOURCES];

  return (
    <div className="layout">
      <header className="topbar">
        <strong className="brand">FitPal Admin</strong>
        <nav>
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`#/${t.key}`}
              className={route.tab === t.key ? 'active' : undefined}
            >
              {t.title}
            </a>
          ))}
          <a href={CONSOLE_USAGE_URL} target="_blank" rel="noreferrer">
            Лимиты Anthropic ↗
          </a>
        </nav>
        <span className="who">
          {session.name}
          <button
            className="link"
            onClick={() => {
              saveSession(null);
              setSession(null);
            }}
          >
            Выйти
          </button>
        </span>
      </header>
      <main>
        {resource ? (
          <ResourcePage
            key={`${resource.key}?${route.params.toString()}`}
            resource={resource}
            params={route.params}
            onError={onError}
          />
        ) : (
          <Dashboard onError={onError} consoleUrl={CONSOLE_USAGE_URL} />
        )}
      </main>
    </div>
  );
}
