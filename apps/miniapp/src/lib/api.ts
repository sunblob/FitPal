import type { ActivityLevel, Goal, Language, Sex } from '@fitpal/shared';
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
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path: string) => api<void>(path, { method: 'DELETE' });

export interface Me {
  id: string;
  firstName: string | null;
  language: Language;
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  targetWeightKg: number | null;
  weeklyRateKg: number | null;
  timezone: string;
  /** Час напоминания в боте, null — выключено. */
  reminderHour: number | null;
  targetKcal: number | null;
  targetProtein: number | null;
  targetFat: number | null;
  targetCarbs: number | null;
}

export interface WeightLogDto {
  id: string;
  date: string;
  weightKg: number;
}
