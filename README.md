# Хау мач

Сервис, который собирает электронные чеки с почты, раскладывает покупки по товарам и показывает, на что на самом деле уходят деньги и как дорожает ваша личная корзина.

Статус: этап 1 — каркас проекта. Дашборд работает на демо-данных. Техническое задание — [docs/TZ.md](docs/TZ.md), макеты — [docs/design](docs/design).

## Стек

React, TypeScript, MUI · Node.js, Fastify · PostgreSQL, Prisma · Redis, BullMQ · LLM через Ollama/GigaChat · оплата ЮKassa · pnpm workspaces, GitHub Actions.

## Запуск

Нужны Node.js 22+ и pnpm.

```bash
pnpm install
pnpm dev
```

Фронтенд откроется на http://localhost:5173, API — на http://localhost:3000/api/v1/health.

## Структура

```
apps/web         — React-приложение (MUI)
apps/api         — Fastify API
apps/worker      — фоновые задачи BullMQ
packages/shared  — общие типы, Zod-схемы, форматирование денег, тарифы
docs/            — ТЗ, макеты, логотип
```
