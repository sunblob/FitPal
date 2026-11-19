import type { ReactNode } from 'react';
import { foodSourceSchema, MEAL_TYPES } from '@fitpal/shared';

const FOOD_SOURCES = foodSourceSchema.options;

export type Row = Record<string, unknown> & { id: string };

export type FieldType = 'text' | 'number' | 'int' | 'select' | 'datetime' | 'lines';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  /** Пустое значение отправляется как null. */
  nullable?: boolean;
  required?: boolean;
}

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  num?: boolean;
}

export interface Resource {
  key: string;
  title: string;
  path: string;
  searchPlaceholder: string;
  columns: Column[];
  fields: Field[];
  canCreate?: boolean;
  canDelete?: boolean;
  /** Фильтр-селект в шапке таблицы (query-параметр). */
  filter?: { key: string; label: string; options: readonly string[] };
  /** Как назвать строку в подтверждении удаления. */
  label: (row: Row) => string;
  actions?: (row: Row) => { title: string; href: string }[];
}

const str = (v: unknown) => (v == null ? '' : String(v));
const dateTime = (v: unknown) => (v ? new Date(String(v)).toLocaleString('ru-RU') : '—');
const round = (v: unknown) => (typeof v === 'number' ? Math.round(v * 10) / 10 : '—');

const userName = (u: Record<string, unknown>) =>
  [u.firstName, u.username ? `@${str(u.username)}` : null].filter(Boolean).join(' ') ||
  str(u.telegramId);

const macroFields: Field[] = [
  { key: 'kcal', label: 'Ккал', type: 'number', required: true },
  { key: 'protein', label: 'Белки', type: 'number', required: true },
  { key: 'fat', label: 'Жиры', type: 'number', required: true },
  { key: 'carbs', label: 'Углеводы', type: 'number', required: true },
];

export const RESOURCES: Resource[] = [
  {
    key: 'users',
    title: 'Пользователи',
    path: '/users',
    searchPlaceholder: 'Имя, @username или Telegram ID',
    label: (r) => userName(r),
    columns: [
      { key: 'telegramId', label: 'Telegram ID' },
      { key: 'user', label: 'Пользователь', render: (r) => userName(r) },
      { key: 'language', label: 'Язык' },
      { key: 'goal', label: 'Цель' },
      { key: 'targetKcal', label: 'Норма ккал', num: true },
      { key: 'diaryCount', label: 'Записей', num: true },
      { key: 'aiCount', label: 'AI', num: true },
      { key: 'lastSeenAt', label: 'Был', render: (r) => dateTime(r.lastSeenAt) },
      { key: 'createdAt', label: 'Регистрация', render: (r) => dateTime(r.createdAt) },
    ],
    fields: [
      { key: 'firstName', label: 'Имя', type: 'text', nullable: true },
      { key: 'username', label: 'Username', type: 'text', nullable: true },
      { key: 'language', label: 'Язык', type: 'select', options: ['en', 'ru'] },
      { key: 'timezone', label: 'Часовой пояс', type: 'text' },
      { key: 'sex', label: 'Пол', type: 'select', options: ['male', 'female'], nullable: true },
      { key: 'birthYear', label: 'Год рождения', type: 'int', nullable: true },
      { key: 'heightCm', label: 'Рост, см', type: 'number', nullable: true },
      { key: 'weightKg', label: 'Вес, кг', type: 'number', nullable: true },
      {
        key: 'activityLevel',
        label: 'Активность',
        type: 'select',
        options: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
        nullable: true,
      },
      {
        key: 'goal',
        label: 'Цель',
        type: 'select',
        options: ['lose', 'maintain', 'gain'],
        nullable: true,
      },
      { key: 'targetWeightKg', label: 'Целевой вес', type: 'number', nullable: true },
      { key: 'weeklyRateKg', label: 'Темп, кг/нед', type: 'number', nullable: true },
      { key: 'targetKcal', label: 'Норма ккал', type: 'int', nullable: true },
      { key: 'targetProtein', label: 'Норма белка', type: 'int', nullable: true },
      { key: 'targetFat', label: 'Норма жиров', type: 'int', nullable: true },
      { key: 'targetCarbs', label: 'Норма углеводов', type: 'int', nullable: true },
    ],
    canDelete: true,
    actions: (r) => [{ title: 'Дневник', href: `#/diary?userId=${r.id}` }],
  },
  {
    key: 'foods',
    title: 'Продукты',
    path: '/foods',
    searchPlaceholder: 'Название, бренд или штрихкод',
    label: (r) => str(r.name),
    filter: { key: 'source', label: 'Источник', options: FOOD_SOURCES },
    columns: [
      { key: 'name', label: 'Название' },
      { key: 'brand', label: 'Бренд' },
      { key: 'barcode', label: 'Штрихкод' },
      { key: 'source', label: 'Источник' },
      { key: 'kcal', label: 'Ккал', num: true, render: (r) => round(r.kcal) },
      { key: 'protein', label: 'Б', num: true, render: (r) => round(r.protein) },
      { key: 'fat', label: 'Ж', num: true, render: (r) => round(r.fat) },
      { key: 'carbs', label: 'У', num: true, render: (r) => round(r.carbs) },
      { key: 'updatedAt', label: 'Изменён', render: (r) => dateTime(r.updatedAt) },
    ],
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'nameEn', label: 'Название (en)', type: 'text', nullable: true },
      { key: 'brand', label: 'Бренд', type: 'text', nullable: true },
      { key: 'barcode', label: 'Штрихкод', type: 'text', nullable: true },
      { key: 'aliases', label: 'Синонимы через запятую', type: 'text', nullable: true },
      { key: 'category', label: 'Категория', type: 'text', nullable: true },
      { key: 'imageUrl', label: 'Картинка (URL)', type: 'text', nullable: true },
      { key: 'source', label: 'Источник', type: 'select', options: FOOD_SOURCES },
      ...macroFields,
    ],
    canCreate: true,
    canDelete: true,
  },
  {
    key: 'exercises',
    title: 'Упражнения',
    path: '/exercises',
    searchPlaceholder: 'Название (en/ru) или id',
    label: (r) => str(r.nameEn),
    columns: [
      { key: 'nameEn', label: 'Название (en)' },
      { key: 'nameRu', label: 'Название (ru)' },
      { key: 'category', label: 'Категория' },
      { key: 'level', label: 'Уровень' },
      { key: 'equipment', label: 'Инвентарь' },
      {
        key: 'primaryMuscles',
        label: 'Мышцы',
        render: (r) => (Array.isArray(r.primaryMuscles) ? r.primaryMuscles.join(', ') : ''),
      },
    ],
    fields: [
      { key: 'nameEn', label: 'Название (en)', type: 'text', required: true },
      { key: 'nameRu', label: 'Название (ru)', type: 'text', nullable: true },
      { key: 'category', label: 'Категория', type: 'text', nullable: true },
      { key: 'level', label: 'Уровень', type: 'text', nullable: true },
      { key: 'equipment', label: 'Инвентарь', type: 'text', nullable: true },
      { key: 'force', label: 'Усилие', type: 'text', nullable: true },
      { key: 'mechanic', label: 'Механика', type: 'text', nullable: true },
      { key: 'instructionsEn', label: 'Техника (en), шаг на строку', type: 'lines' },
      {
        key: 'instructionsRu',
        label: 'Техника (ru), шаг на строку',
        type: 'lines',
        nullable: true,
      },
    ],
  },
  {
    key: 'diary',
    title: 'Дневник',
    path: '/diary',
    searchPlaceholder: 'Название блюда',
    label: (r) => str(r.name),
    columns: [
      { key: 'eatenAt', label: 'Когда', render: (r) => dateTime(r.eatenAt) },
      {
        key: 'user',
        label: 'Пользователь',
        render: (r) => (
          <a href={`#/diary?userId=${str(r.userId)}`}>
            {userName((r.user ?? {}) as Record<string, unknown>)}
          </a>
        ),
      },
      { key: 'meal', label: 'Приём' },
      { key: 'name', label: 'Блюдо' },
      { key: 'grams', label: 'Граммы', num: true, render: (r) => round(r.grams) },
      { key: 'kcal', label: 'Ккал', num: true, render: (r) => round(r.kcal) },
      { key: 'protein', label: 'Б', num: true, render: (r) => round(r.protein) },
      { key: 'fat', label: 'Ж', num: true, render: (r) => round(r.fat) },
      { key: 'carbs', label: 'У', num: true, render: (r) => round(r.carbs) },
    ],
    fields: [
      { key: 'name', label: 'Блюдо', type: 'text', required: true },
      { key: 'meal', label: 'Приём пищи', type: 'select', options: MEAL_TYPES },
      { key: 'grams', label: 'Граммы', type: 'number', required: true },
      ...macroFields,
      { key: 'eatenAt', label: 'Когда', type: 'datetime' },
    ],
    canDelete: true,
  },
];
