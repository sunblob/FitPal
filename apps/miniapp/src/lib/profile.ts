import type { Profile } from '@fitpal/shared';
import type { Me } from './api';

/** Профиль из ответа /me, если он заполнен. */
export function profileFromMe(me: Me): Profile | null {
  if (!me.sex || !me.birthYear || !me.heightCm || !me.weightKg || !me.activityLevel || !me.goal) {
    return null;
  }
  return {
    sex: me.sex,
    birthYear: me.birthYear,
    heightCm: me.heightCm,
    weightKg: me.weightKg,
    activityLevel: me.activityLevel,
    goal: me.goal,
    targetWeightKg: me.targetWeightKg ?? undefined,
    weeklyRateKg: me.weeklyRateKg ?? undefined,
  };
}

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatDateRu(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
}
