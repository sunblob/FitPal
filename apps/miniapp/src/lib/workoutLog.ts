import { useCallback, useEffect, useState } from 'react';
import type { ExerciseLogDto } from '@fitpal/shared';
import { api, put } from './api';

/** Отметки упражнений за день: загрузка и переключение «сделано». */
export function useWorkoutLog(date: string) {
  const [logs, setLogs] = useState<ExerciseLogDto[] | null>(null);

  const reload = useCallback(() => {
    api<ExerciseLogDto[]>(`/workout-log?from=${date}&to=${date}`).then(setLogs, () => setLogs([]));
  }, [date]);
  useEffect(reload, [reload]);

  const isDone = (exerciseId: string) => logs?.some((l) => l.exerciseId === exerciseId) ?? false;

  async function toggle(exerciseId: string, extra: { sets?: number; planId?: string } = {}) {
    if (isDone(exerciseId)) {
      setLogs((prev) => prev?.filter((l) => l.exerciseId !== exerciseId) ?? prev);
      const qs = new URLSearchParams({ exerciseId, date });
      await api<void>(`/workout-log?${qs}`, { method: 'DELETE' }).catch(reload);
    } else {
      const saved = await put<ExerciseLogDto>('/workout-log', { exerciseId, date, ...extra });
      setLogs((prev) => [...(prev ?? []).filter((l) => l.exerciseId !== exerciseId), saved]);
    }
  }

  return { logs, isDone, toggle, reload };
}
