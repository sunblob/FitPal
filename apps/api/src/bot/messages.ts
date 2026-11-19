import type { Language } from '@fitpal/shared';

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
  },
} satisfies Record<Language, unknown>;

export type BotText = (typeof BOT_TEXT)['ru'];
