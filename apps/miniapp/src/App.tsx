import { useEffect, useState } from 'react';
import { api, type Me } from './lib/api';
import { DiaryPage } from './pages/DiaryPage';

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Me>('/me').then(setMe, (e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <main className="screen">
        <p className="muted">Не удалось загрузить профиль. Открой приложение из Telegram.</p>
        <pre className="error">{error}</pre>
      </main>
    );
  }
  if (!me) return <main className="screen muted">Загрузка…</main>;
  return <DiaryPage me={me} />;
}
