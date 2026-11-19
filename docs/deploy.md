# Деплой на Dokploy

В проекте Dokploy `FitPal` четыре ресурса:

| Ресурс           | Тип         | Сборка                                             | Порт                          |
| ---------------- | ----------- | -------------------------------------------------- | ----------------------------- |
| `fitpal-db`      | Postgres 17 | —                                                  | 5432 (только внутренняя сеть) |
| `fitpal-api`     | Application | Dockerfile `apps/api/Dockerfile`, контекст `.`     | 3000                          |
| `fitpal-miniapp` | Application | Dockerfile `apps/miniapp/Dockerfile`, контекст `.` | 80                            |
| `fitpal-admin`   | Application | Dockerfile `apps/admin/Dockerfile`, контекст `.`   | 80                            |

Все приложения собираются из ветки `main` репозитория и пересобираются автоматически на push.

## fitpal-api

Перед стартом контейнер применяет миграции из `apps/api/drizzle` (`dist/db/migrate.js`), затем запускает API.
Healthcheck: `GET /api/health`.

Переменные окружения:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<Internal Connection URL из fitpal-db>
TELEGRAM_BOT_TOKEN=<токен от @BotFather>
TELEGRAM_BOT_MODE=webhook
PUBLIC_API_URL=https://<домен API>
TELEGRAM_WEBHOOK_SECRET=<случайная строка>
MINIAPP_URL=https://<домен Mini App>
ANTHROPIC_API_KEY=<ключ Anthropic>
ADMIN_TELEGRAM_IDS=<Telegram ID администраторов через запятую>
# необязательно: ANTHROPIC_MODEL, EXERCISE_MEDIA_BASE_URL
```

В режиме `webhook` бот сам регистрирует вебхук `PUBLIC_API_URL/api/telegram/webhook` при старте.
Один и тот же токен нельзя одновременно использовать в проде (webhook) и локально (polling): локальный polling снимает вебхук. Для локальной разработки лучше завести отдельного бота.

### Каталог упражнений

Каталог импортируется один раз (и при желании обновляется) вручную, из терминала контейнера `fitpal-api` в Dokploy:

```bash
node dist/exercises/import.cli.js
```

Команда переводит через Claude названия и технику всех упражнений (~870 шт., несколько минут). Уже переведённое не трогает, так что после сбоя её можно просто запустить ещё раз.

## fitpal-miniapp

Vite вшивает адрес API в бандл при сборке, поэтому он задаётся как build arg, а не как переменная окружения:

```
VITE_API_URL=https://<домен API>
```

После смены домена API нужно пересобрать Mini App.

## fitpal-admin

Админка: статистика, просмотр и правка пользователей, продуктов, упражнений и записей дневника.
Build args:

```
VITE_API_URL=https://<домен API>
VITE_ADMIN_BOT_USERNAME=<username бота без @>
```

Вход через Telegram Login Widget. Чтобы виджет работал, в @BotFather у бота нужно выполнить
`/setdomain` и указать домен админки. API пускает только Telegram ID из `ADMIN_TELEGRAM_IDS`
(переменная `fitpal-api`); если она пустая, админка выключена. Сессия живёт 12 часов и
подписана ключом, выведенным из токена бота.

Остаток лимитов по ключу Anthropic смотри в Console: https://platform.claude.com/usage.

## Домены и HTTPS

Telegram открывает Mini App только по HTTPS. Для каждого приложения в Dokploy добавлен домен с сертификатом Let's Encrypt; A-записи доменов должны указывать на IP сервера Dokploy.

## Локальная проверка образов

```bash
docker build -f apps/api/Dockerfile -t fitpal-api .
docker build -f apps/miniapp/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 -t fitpal-miniapp .
```
