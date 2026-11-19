/**
 * Нормализация текста для поиска продуктов. Делается в JS, а не в SQL, чтобы не зависеть
 * от локали базы (lower() для кириллицы зависит от LC_CTYPE).
 */

/** Нижний регистр, ё → е, без диакритики латиницы (ryža → ryza), только буквы и цифры. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/([a-z])[̀-ͯ]+/g, '$1')
    .normalize('NFC')
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Текст, по которому ищется продукт: название, синонимы, английское название и бренд.
 * Название идёт первым.
 */
export function buildSearchText(food: {
  name: string;
  brand?: string | null;
  aliases?: string | null;
  nameEn?: string | null;
}): string {
  return normalize([food.name, food.aliases, food.nameEn, food.brand].filter(Boolean).join(' '));
}

const ENDING =
  /(ами|ями|ого|его|ому|ему|ой|ей|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|ов|ев|ам|ям|ах|ях|ом|ем|а|я|ы|и|о|е|у|ю|ь|й)$/;
const LATIN_ENDING = /(a|e|i|o|u|y)$/;

/**
 * Грубое отсечение окончания, чтобы «яблоки» находили «Яблоко», а «риса» — «Рис».
 * Короткие слова не трогаем: «рис», «сыр», «лук».
 */
export function stem(word: string): string {
  if (word.length < 4 || /^\d/.test(word)) return word;
  const cut = word.replace(/[а-я]$/.test(word) ? ENDING : LATIN_ENDING, '');
  return cut.length >= 3 ? cut : word;
}

/** Слова запроса в виде основ. Пустой массив, если в запросе нет букв и цифр. */
export function queryTerms(q: string): string[] {
  const words = normalize(q).split(' ').filter(Boolean);
  return [...new Set(words.map(stem))];
}
