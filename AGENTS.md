# AGENTS.md

Правила для ИИ-агентов и людей, которые работают с этим репозиторием.

## Проект

FitPal: Telegram-бот и Telegram Mini App для подсчёта калорий и контроля веса.
Способы добавить еду: вручную, из базы продуктов, по штрихкоду, по фото (ИИ).

## Стек

- Монорепо: pnpm workspaces + Turborepo. Node 22+, pnpm 10+.
- Язык: TypeScript везде, `strict` включён. Всё ESM (`"type": "module"`).
- `apps/api`: NestJS 12, Drizzle ORM + PostgreSQL, бот на grammY живёт модулем внутри API.
- `apps/miniapp`: React 19 + Vite + `@telegram-apps/sdk-react`.
- `packages/shared`: zod-схемы, общие типы и чистые функции расчётов (КБЖУ, план веса).
- Фото еды: Anthropic API (Claude). Штрихкоды и база продуктов: Open Food Facts.

## Структура и где что лежит

- Схемы данных, которые нужны и API, и Mini App, описываются zod-схемой в `packages/shared` и импортируются оттуда. Не дублируй типы.
- Расчёты (норма калорий, порции, план веса) пишутся чистыми функциями в `packages/shared` и покрываются тестами.
- В API один модуль Nest на предметную область: `users`, `weight`, `diary`, `foods`, `bot` и т.д. Контроллер тонкий, логика в сервисе, БД только через Drizzle в сервисах.
- Схема БД: `apps/api/src/db/schema.ts`. После изменения схемы запускай `pnpm db:generate` и коммить миграцию из `apps/api/drizzle/`. Уже применённые миграции не редактируй.
- Конфиг только через `Env` (`apps/api/src/config/env.ts`), новые переменные добавляй в zod-схему и в `.env.example`.

## Код

- Относительные импорты в API и shared пишутся с расширением `.js` (NodeNext).
- Без `any`. Если без него никак, используй `unknown` и сужай тип.
- Валидация входящих данных только через `nestjs-zod` (глобальный `ZodValidationPipe`). Без `class-validator`.
- Каждый DTO в отдельном файле в папке `dto/` своего модуля: `users/dto/update-profile.dto.ts` с классом `UpdateProfileDto extends createZodDto(schema)`. Если схема нужна и Mini App, она лежит в `packages/shared`, а DTO только оборачивает её.
- Для body, query и params всегда используй DTO-класс, а не inline-типы.
- Все эндпоинты Mini App защищены `TelegramAuthGuard` (`Authorization: tma <initData>`), текущий пользователь берётся через `@CurrentUser()`.
- КБЖУ продуктов храним на 100 г. В записи дневника значения копируются на момент записи.
- Тексты для пользователя на русском. Комментарии в коде на русском или английском, коротко и только там, где неочевидно «почему».
- Форматирование: Prettier (`pnpm format`), одинарные кавычки, ширина строки 100.

## Проверки перед коммитом

```bash
pnpm build
pnpm test
pnpm typecheck
```

Тесты на `node:test`, файлы `*.test.ts` рядом с кодом.

## Git

- Формат сообщения коммита: `type(scope): описание` на английском, в повелительном наклонении.
  Типы: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`. Примеры:
  - `feat(diary): add meal type filter`
  - `fix(bot): handle missing username on /start`
- **Не добавляй строки `Co-Authored-By` и любые другие упоминания ИИ (Claude, Codex, Copilot и т.д.) в коммиты, описания PR и код.**
- Новая работа идёт в отдельной ветке и через PR в `main`. Историю `main` не переписывай.
- Не коммить `.env` и секреты.
