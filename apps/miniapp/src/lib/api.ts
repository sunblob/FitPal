import { getInitData } from './telegram';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(initData ? { Authorization: `tma ${initData}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export interface Me {
  id: string;
  firstName: string | null;
  targetKcal: number | null;
  targetProtein: number | null;
  targetFat: number | null;
  targetCarbs: number | null;
}
