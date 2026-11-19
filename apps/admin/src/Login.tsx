import { useEffect, useRef, useState } from 'react';
import { adminLoginSchema, type AdminSession } from '@fitpal/shared';
import { login, saveSession } from './api';

const BOT_USERNAME = import.meta.env.VITE_ADMIN_BOT_USERNAME as string | undefined;

declare global {
  interface Window {
    onTelegramAuth?: (user: unknown) => void;
  }
}

export function Login({ onLogin }: { onLogin: (s: AdminSession) => void }) {
  const widget = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [devJson, setDevJson] = useState('');

  const submit = async (raw: unknown) => {
    setError(null);
    const parsed = adminLoginSchema.safeParse(raw);
    if (!parsed.success) return setError('Некорректные данные входа');
    try {
      const session = await login(parsed.data);
      saveSession(session);
      onLogin(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    if (!BOT_USERNAME || !widget.current) return;
    window.onTelegramAuth = (user) => void submit(user);
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.dataset.telegramLogin = BOT_USERNAME;
    script.dataset.size = 'large';
    script.dataset.radius = '10';
    script.dataset.onauth = 'onTelegramAuth(user)';
    widget.current.replaceChildren(script);
    return () => {
      delete window.onTelegramAuth;
    };
    // submit не меняется по смыслу, виджет ставим один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="login">
      <div className="login-card">
        <h1>FitPal Admin</h1>
        <p className="muted">Вход через Telegram. Доступ только для администраторов.</p>
        {BOT_USERNAME ? (
          <div ref={widget} className="login-widget" />
        ) : (
          <p className="error">Не задан VITE_ADMIN_BOT_USERNAME</p>
        )}
        {import.meta.env.DEV && (
          <details className="dev-login">
            <summary>Dev: вставить данные входа (JSON)</summary>
            <textarea value={devJson} onChange={(e) => setDevJson(e.target.value)} rows={4} />
            <button
              onClick={() => {
                try {
                  void submit(JSON.parse(devJson));
                } catch {
                  setError('Невалидный JSON');
                }
              }}
            >
              Войти
            </button>
          </details>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
