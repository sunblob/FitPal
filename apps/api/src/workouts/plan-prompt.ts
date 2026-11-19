import {
  EQUIPMENT_LABELS_RU,
  LEVEL_LABELS_RU,
  MUSCLE_LABELS_RU,
  WORKOUT_GOAL_LABELS_RU,
  type GenerateWorkoutPlan,
} from '@fitpal/shared';
import type { Exercise, User } from '../db/schema.js';

export const PLAN_SYSTEM = `Ты опытный персональный тренер. Составляешь недельный план силовых тренировок на русском языке.

Правила:
- Используй только упражнения из переданного каталога и указывай их id ровно как в каталоге. Не придумывай упражнения.
- Ровно столько тренировочных дней, сколько просит пользователь. Каждая тренировка укладывается в заданное время с учётом отдыха между подходами.
- Выбранные мышцы получают основной объём, но план должен быть сбалансированным: не ставь одну и ту же группу в соседние дни без необходимости.
- Начинай тренировку с базовых многосуставных упражнений, заканчивай изолирующими.
- Подходы, повторения и отдых подбирай под цель и уровень. Для статических упражнений пиши время в поле reps, например «30–45 сек».
- notes у упражнения: короткая подсказка по технике или прогрессии, одна фраза. Можно пустую строку.
- Учитывай травмы и пожелания пользователя. Если пожелание небезопасно, мягко скорректируй и скажи об этом в tips.
- title: короткое название плана. summary: два-три предложения о логике плана. tips: 2–5 практичных советов.`;

/** Компактная строка каталога, чтобы уложить сотни упражнений в промпт. */
function catalogLine(e: Exercise): string {
  return [
    e.id,
    e.nameRu ?? e.nameEn,
    e.primaryMuscles.join(','),
    e.secondaryMuscles.join(',') || '-',
    e.equipment ?? '-',
    e.level ?? '-',
    e.mechanic ?? '-',
    e.category ?? '-',
  ].join(' | ');
}

function profileLines(user: User): string[] {
  const lines: string[] = [];
  if (user.sex) lines.push(`Пол: ${user.sex === 'male' ? 'мужской' : 'женский'}`);
  if (user.birthYear) lines.push(`Возраст: ${new Date().getFullYear() - user.birthYear}`);
  if (user.heightCm) lines.push(`Рост: ${user.heightCm} см`);
  if (user.weightKg) lines.push(`Вес: ${user.weightKg} кг`);
  if (user.goal) {
    const goal = { lose: 'похудение', maintain: 'поддержание', gain: 'набор массы' }[user.goal];
    lines.push(`Цель по питанию: ${goal}`);
  }
  return lines;
}

export function buildPlanPrompt(
  params: GenerateWorkoutPlan,
  user: User,
  catalog: Exercise[],
): string {
  const equipment = ['body only' as const, ...params.equipment].map((e) => EQUIPMENT_LABELS_RU[e]);
  return [
    '<request>',
    `Цель: ${WORKOUT_GOAL_LABELS_RU[params.goal]}`,
    `Уровень: ${LEVEL_LABELS_RU[params.level]}`,
    `Тренировок в неделю: ${params.daysPerWeek}`,
    `Длительность тренировки: ${params.sessionMinutes} мин`,
    `Приоритетные мышцы: ${params.muscles.map((m) => MUSCLE_LABELS_RU[m]).join(', ')}`,
    `Доступный инвентарь: ${equipment.join(', ')}`,
    ...profileLines(user),
    params.notes ? `Пожелания пользователя: ${params.notes}` : '',
    '</request>',
    '',
    '<catalog>',
    'id | название | основные мышцы | вспомогательные | инвентарь | уровень | тип | категория',
    ...catalog.map(catalogLine),
    '</catalog>',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
