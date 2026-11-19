import type { AdminLogin, AdminSession } from '@fitpal/shared';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
const STORAGE_KEY = 'fitpal-admin-session';

export class UnauthorizedError extends Error {}

export function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    return new Date(session.expiresAt) > new Date() ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // приватный режим: сессия просто не переживёт перезагрузку
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = loadSession();
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    saveSession(null);
    throw new UnauthorizedError('Сессия истекла, войди заново');
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const body = JSON.parse(text) as {
        message?: string;
        errors?: { path: string[]; message: string }[];
      };
      message = body.errors?.length
        ? body.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        : (body.message ?? text);
    } catch {
      // не JSON
    }
    throw new Error(`${res.status}: ${message}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const login = (data: AdminLogin) =>
  api<AdminSession>('/login', { method: 'POST', body: JSON.stringify(data) });
