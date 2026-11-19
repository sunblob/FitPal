# FitPal

Telegram-бот и Telegram Mini App для подсчёта калорий и контроля веса.

## Структура

```
apps/
  api/       NestJS: REST API для Mini App + Telegram-бот (grammY) как модуль
  miniapp/   React + Vite + @telegram-apps/sdk-react
packages/
  shared/    общие zod-схемы и расчёты (норма КБЖУ, план веса)
```

Монорепо на pnpm workspaces, задачи запускает Turborepo.

## Быстрый старт

Нужны Node 22+, pnpm 10+ и Docker.

```bash
pnpm install
cp .env.example .env        # впиши TELEGRAM_BOT_TOKEN от @BotFather
pnpm db:up                  # Postgres в Docker
pnpm db:migrate             # применить миграции
pnpm dev                    # API на :3000, Mini App на :5173
```

Mini App открывается в Telegram только по HTTPS. Для разработки подними туннель на Vite
(например, `cloudflared tunnel --url http://localhost:5173`), пропиши полученный адрес в
`MINIAPP_URL` и в настройках бота у @BotFather. Если API тоже смотрит наружу через туннель,
обнови `VITE_API_URL`.

## Команды

| Команда            | Что делает                                   |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | запускает всё в режиме разработки            |
| `pnpm build`       | собирает все пакеты                          |
| `pnpm test`        | тесты (`node:test`)                          |
| `pnpm typecheck`   | проверка типов                               |
| `pnpm db:generate` | создать миграцию после изменения `schema.ts` |
| `pnpm db:migrate`  | применить миграции                           |

## API

Все запросы Mini App идут с заголовком `Authorization: tma <initData>`, подпись проверяется на сервере.

| Метод | Путь                    | Описание                                        |
| ----- | ----------------------- | ----------------------------------------------- |
| GET   | `/api/health`           | проверка живости                                |
| GET   | `/api/me`               | текущий пользователь и его дневная норма        |
| PUT   | `/api/me/profile`       | профиль и цель, пересчёт нормы, вес за сегодня  |
| POST  | `/api/weight`           | записать вес (одна запись на день)              |
| GET   | `/api/weight?from=&to=` | история веса для графика                        |
| POST  | `/api/telegram/webhook` | вебхук бота (режим `TELEGRAM_BOT_MODE=webhook`) |

## Модель данных

- `users`: профиль, цель (похудение, поддержание, набор), целевой вес и темп, дневная норма КБЖУ.
- `foods`: продукты на 100 г: свои, из Open Food Facts, встроенный справочник, распознанные ИИ.
- `diary_entries`: записи дневника по приёмам пищи (завтрак, обед, ужин, перекус).
- `weight_logs`: взвешивания, одна запись в день.

## План MVP

1. ✅ Каркас, БД, авторизация Mini App, профиль, норма КБЖУ, трекинг веса (API).
2. Бот: онбординг, ежедневное напоминание взвеситься.
3. Mini App: профиль и цель, дневник по приёмам пищи, ручной ввод, поиск по базе, график веса.
4. Сканер штрихкода (Open Food Facts).
5. Распознавание еды по фото (Claude).
