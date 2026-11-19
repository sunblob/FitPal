import type { Language, MacroShares } from '@fitpal/shared';

export interface WeeklySummary {
  loggedDays: number;
  avgKcal: number;
  targetKcal: number | null;
  daysOver: number;
  shares: MacroShares;
  /** Изменение веса за неделю, null — не с чем сравнить. */
  weightChange: number | null;
}

const ruDays = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня';
  return 'дней';
};

/** Тексты бота на каждом языке. */
export const BOT_TEXT = {
  ru: {
    greeting: (name: string | null) =>
      `Привет, ${name ?? 'друг'}! Я FitPal и помогу считать калории.\n\n` +
      'Записывай еду вручную, ищи в базе, сканируй штрихкод, пришли фото тарелки ' +
      'или просто напиши, что съел: «овсянка на молоке и банан».',
    openDiary: 'Открыть дневник',
    tooLong: 'Опиши еду короче, до 500 символов. Например: «гречка 200 г и котлета».',
    aiDisabled: 'Распознавание еды через ИИ пока не настроено.',
    lookingAtPhoto: 'Смотрю на фото…',
    counting: 'Считаю…',
    rateLimited: 'Слишком много запросов к ИИ за час, попробуй позже.',
    photoFailed: 'Не получилось распознать фото. Попробуй ещё раз или добавь еду в дневнике.',
    textFailed: 'Не получилось посчитать. Попробуй ещё раз или добавь еду в дневнике.',
    dontSave: 'Не записывать',
    expired: 'Это уже неактуально, пришли ещё раз.',
    saved: 'Записал',
    savedTo: (meal: string, kcal: number) => `Записал в ${meal.toLowerCase()}: ${kcal} ккал.`,
    noFoodPhoto: 'Не нашёл еды на фото. Попробуй снять поближе.',
    noFoodText: 'Не понял, что за еда. Опиши подробнее, например: «гречка 200 г и котлета».',
    seePhoto: 'Вот что я вижу:',
    seeText: 'Вот как я это посчитал:',
    item: (name: string, grams: number, kcal: number) => `• ${name}, ${grams} г: ${kcal} ккал`,
    total: (kcal: number, p: number, f: number, c: number) =>
      `Итого ${kcal} ккал · Б ${p} · Ж ${f} · У ${c}`,
    whereToSave: 'Куда записать?',
    chooseLanguage: 'Выбери язык:',
    languageSet: 'Готово, теперь я говорю по-русски.',
    commands: { start: 'Начать', language: 'Язык / Language' },
    weekly: (s: WeeklySummary) =>
      [
        '<b>Итоги недели</b>',
        '',
        `Записано дней: ${s.loggedDays} из 7`,
        `В среднем ${s.avgKcal} ккал в день` + (s.targetKcal ? ` (норма ${s.targetKcal})` : ''),
        ...(s.targetKcal ? [`Выше нормы: ${s.daysOver} ${ruDays(s.daysOver)}`] : []),
        `БЖУ: Б ${s.shares.protein}% · Ж ${s.shares.fat}% · У ${s.shares.carbs}%`,
        ...(s.weightChange != null
          ? [
              `Вес: ${s.weightChange > 0 ? '+' : s.weightChange < 0 ? '−' : ''}${Math.abs(s.weightChange)} кг за неделю`,
            ]
          : []),
      ].join('\n'),
    reminder: (streak: number) =>
      (streak > 1
        ? `Сегодня в дневнике пока пусто, а серия уже ${streak} ${ruDays(streak)} подряд. Запиши еду, чтобы её не прервать.`
        : 'Сегодня в дневнике пока пусто. Запиши, что ел: можно прислать фото тарелки или написать сюда словами.') +
      '\n\nВыключить или перенести напоминание можно в профиле.',
  },
  en: {
    greeting: (name: string | null) =>
      `Hi, ${name ?? 'there'}! I'm FitPal and I'll help you count calories.\n\n` +
      'Log food manually, search the database, scan a barcode, send a photo of your plate ' +
      'or just tell me what you ate: "oatmeal with milk and a banana".',
    openDiary: 'Open diary',
    tooLong:
      'Please describe the food in under 500 characters. For example: "200 g rice and a chicken breast".',
    aiDisabled: 'AI food recognition is not set up yet.',
    lookingAtPhoto: 'Looking at the photo…',
    counting: 'Counting…',
    rateLimited: 'Too many AI requests this hour, try again later.',
    photoFailed: "Couldn't recognize the photo. Try again or add the food in the diary.",
    textFailed: "Couldn't count that. Try again or add the food in the diary.",
    dontSave: "Don't save",
    expired: 'This is no longer valid, please send it again.',
    saved: 'Saved',
    savedTo: (meal: string, kcal: number) => `Saved to ${meal.toLowerCase()}: ${kcal} kcal.`,
    noFoodPhoto: "I couldn't find any food in the photo. Try taking it closer.",
    noFoodText:
      'I didn\'t get what food that is. Add details, for example: "200 g rice and a chicken breast".',
    seePhoto: "Here's what I see:",
    seeText: "Here's how I counted it:",
    item: (name: string, grams: number, kcal: number) => `• ${name}, ${grams} g: ${kcal} kcal`,
    total: (kcal: number, p: number, f: number, c: number) =>
      `Total ${kcal} kcal · P ${p} · F ${f} · C ${c}`,
    whereToSave: 'Which meal?',
    chooseLanguage: 'Choose a language:',
    languageSet: "Done, I'll speak English now.",
    commands: { start: 'Start', language: 'Language / Язык' },
    weekly: (s: WeeklySummary) =>
      [
        '<b>Your week</b>',
        '',
        `Days logged: ${s.loggedDays} of 7`,
        `${s.avgKcal} kcal a day on average` + (s.targetKcal ? ` (target ${s.targetKcal})` : ''),
        ...(s.targetKcal
          ? [`Over target: ${s.daysOver} ${s.daysOver === 1 ? 'day' : 'days'}`]
          : []),
        `Macros: P ${s.shares.protein}% · F ${s.shares.fat}% · C ${s.shares.carbs}%`,
        ...(s.weightChange != null
          ? [
              `Weight: ${s.weightChange > 0 ? '+' : s.weightChange < 0 ? '−' : ''}${Math.abs(s.weightChange)} kg this week`,
            ]
          : []),
      ].join('\n'),
    reminder: (streak: number) =>
      (streak > 1
        ? `Nothing logged today yet, and you're on a ${streak}-day streak. Log your food to keep it going.`
        : 'Nothing logged today yet. Tell me what you ate: send a photo of your plate or just type it here.') +
      '\n\nYou can turn this reminder off or change its time in your profile.',
  },
} satisfies Record<Language, unknown>;

export type BotText = (typeof BOT_TEXT)['ru'];
