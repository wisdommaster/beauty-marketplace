# Backend Manifest — Правила сборки и разработки

## 0. Инфраструктура (проверено 2026-04-28)

### Что работает
| Сервис | Статус | Детали |
|---|---|---|
| Lethe (память) | ✅ | `localhost:18483`, Docker, авторестарт |
| Docker | ✅ | v29.4.0, контейнер `lethe` |
| Node.js | ✅ | v25.8.2 |
| Git | ✅ | v2.50.1 |
| Codex CLI | ✅ | v0.121.0, `/opt/homebrew/bin/codex` |
| Claude Code | ✅ | v2.1.119, `/opt/homebrew/bin/claude` |
| acpx | ✅ | v0.6.1, `/opt/homebrew/bin/acpx` |
| Perplexity API | ✅ | Ключ валиден, `sonar-pro` / `sonar-deep-research` работают |

### Что требует настройки оператором
| Сервис | Статус | Действие |
|---|---|---|
| GitHub CLI | ❌ Не авторизован | `gh auth login` |
| YClients API | ❌ Нет ключей | Получить от Devi, Top Face, Top Nails |
| YooKassa | ❌ Нет ключей | Зарегистрироваться после ИП |
| Яндекс.Карты API | ✅ Ключ есть | `d75addaf-efe6-40dc-b058-0d70ae014f53` |
| VPS | ❌ Нет | Нужен после готовности продукта |
| Домен | ❌ Нет | Нужен после готовности продукта |

### Порядок действий (исправленный)

```
1. Настроить GitHub (gh auth login)            ← СЕЙЧАС
2. Создать репозиторий + защищённые ветки       ← СЕЙЧАС
3. Настроить структуру проекта                  ← СЕЙЧАС
4. Написать код на mock-данных                  ← БЕЗ YCLIENTS
5. Протестировать всю механику локально          ← БЕЗ YCLIENTS
6. Интеграционное тестирование                  ← С РЕАЛЬНЫМИ КЛЮЧАМИ
7. Деплой на VPS                                ← ПОСЛЕ ГОТОВНОСТИ
```

**Правило:** продукт должен быть полностью готов и протестирован на моках ДО получения реальных YClients-ключей и регистрации ИП.

---

## 1. Структура проекта

```
beauty-marketplace/
├── apps/
│   ├── api/                    ← Backend (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── integrations/   ← YClients, Yandex Maps, YooKassa
│   │   │   │   ├── yclients/
│   │   │   │   │   ├── client.ts       ← API-клиент
│   │   │   │   │   ├── sync.ts         ← Синхронизация
│   │   │   │   │   └── README.md       ← Документация эндпоинтов
│   │   │   │   ├── yandex/
│   │   │   │   │   └── client.ts       ← Геокодер + маршруты
│   │   │   │   └── yookassa/
│   │   │   │       └── client.ts       ← Платежи (фаза 2)
│   │   │   ├── services/       ← Бизнес-логика
│   │   │   │   ├── feed.service.ts     ← Лента + scoring
│   │   │   │   ├── booking.service.ts  ← Бронирование
│   │   │   │   ├── discount.service.ts ← Формула скидки
│   │   │   │   └── auth.service.ts     ← JWT
│   │   │   ├── routes/         ← API-роуты
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── feed.routes.ts
│   │   │   │   ├── booking.routes.ts
│   │   │   │   ├── business.routes.ts
│   │   │   │   └── admin.routes.ts
│   │   │   └── types/          ← Общие типы
│   │   │       ├── slot.ts
│   │   │       ├── booking.ts
│   │   │       └── tariff.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    ← Frontend (фаза 2)
│       └── src/
│
├── packages/
│   └── shared/                 ← Общие типы, константы, валидация
│       └── src/
│           ├── types.ts        ← Типы для API-контрактов
│           ├── constants.ts    ← Категории, цвета пинов, роли
│           └── validation.ts   ← Zod-схемы
│
├── docs/                       ← Спецификация (НЕ ТРОГАТЬ БЕЗ ОПЕРАТОРА)
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── PLATFORM_SPEC.md
│   ├── CARDS_AND_TUNING.md
│   ├── DATA_PIPELINE.md
│   ├── DEEP_MECHANICS.md
│   ├── EXECUTION_PLAN.md
│   ├── AGENTS_ORCHESTRATION.md
│   ├── AGENTS_MAP.md
│   └── MODEL_ALLOCATION.md
│
├── infrastructure/             ← DevOps (фаза 3)
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── package.json                ← Монорепо root
├── tsconfig.json               ← Базовый конфиг TypeScript
├── .gitignore
├── .env.example                ← Шаблон переменных (без секретов)
└── .env.local                  ← Локальные ключи (в .gitignore)
```

---

## 2. Технологический стек

### Backend (apps/api)
| Слой | Технология | Почему |
|---|---|---|
| Runtime | Node.js 22+ (LTS) | Стабильность, экосистема |
| Язык | TypeScript 5.x (strict) | Типизация, контракты |
| HTTP-фреймворк | Hono | Лёгкий, быстрый, TypeScript-first |
| Валидация | Zod | Схемы, вывод типов |
| База данных | PostgreSQL 16 | Реляционная, транзакции, FOR UPDATE |
| ORM | Drizzle ORM | SQL-like, легковесный, миграции |
| Кэш / Pub-Sub | Redis | Сессии, WebSocket, блокировки |
| WebSocket | ws (Node.js native) | Простой pub-sub для статусов слотов |
| Аутентификация | JWT (access + refresh) | Stateless, стандарт |
| Тесты | Vitest | Быстрый, ESM-нативный |
| API-документация | OpenAPI (из Zod-схем) | Автогенерация контракта |

### Frontend (apps/web — фаза 2)
| Слой | Технология |
|---|---|
| Фреймворк | React 19 + TypeScript |
| Стили | Tailwind CSS |
| Стейт | TanStack Query + Zustand |
| Роутинг | TanStack Router |
| WebSocket | Встроенный WebSocket API |
| Сборка | Vite |

---

## 3. Система сборки

### Команды (root package.json)

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint apps/ packages/",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "ci": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

### Порядок CI
```
git push → GitHub Actions:
  1. pnpm install
  2. pnpm lint
  3. pnpm typecheck
  4. pnpm test
  5. pnpm build
  → успех ✅
```

---

## 4. Правила кода

### TypeScript
- `strict: true` всегда
- Явные типы для всех публичных функций
- `interface` для объектов, `type` для union/intersection
- Никаких `any` (если только интеграция с внешним API без типов — `unknown` + type guard)
- Имена файлов: kebab-case
- Имена переменных/функций: camelCase
- Имена типов/интерфейсов: PascalCase
- Имена констант: UPPER_SNAKE_CASE

### Тесты
- Покрытие: все сервисы, все интеграции, все edge cases
- Моки для внешних API (YClients, Yandex, YooKassa)
- In-memory SQLite для тестов БД
- Redis mock для тестов pub-sub
- Тестовые данные в `tests/fixtures/`

### Обработка ошибок
- Все внешние вызовы — try/catch
- YClients API: retry 3 раза с экспоненциальным backoff (1с, 2с, 4с)
- YooKassa webhook: idempotency key на каждую операцию
- Необработанные ошибки → 500 + логирование
- Пользовательские ошибки → 4xx + читаемое сообщение

### Логирование
- Structured JSON-логи
- Уровни: debug, info, warn, error
- Не логировать: пароли, API-ключи, персональные данные

---

## 5. Интеграции

### YClients API
- **Базовый URL:** `https://n{formId}.yclients.com/api/v1` (форма бронирования), `https://api.yclients.com/api/v1` (общие)
- **Аутентификация:** Bearer token + опционально User token для клиентских данных
- **Заголовок:** `Accept: application/vnd.yclients.v2+json`
- **Стратегия синхронизации:**
  - Full sync: раз в 15 минут, все слоты на +48ч
  - Incremental: раз в 60 секунд, статусы активных слотов
  - Graceful degradation: при недоступности YClients — кэш на 1 час
- **Важно:** YClients API НЕ возвращает capacity для групповых занятий. Требуется ручная установка бизнесом.

### Yandex Maps API
- **JavaScript API:** ключ `d75addaf-efe6-40dc-b058-0d70ae014f53` (только на фронте)
- **HTTP Геокодер:** тот же ключ (на бэке, до 25 000 запросов/день бесплатно)
- **Рейтинг организаций:** через геокодер с `kind=biz`
- **Маршруты:** deeplink `yandexmaps://` для мобильных, `https://yandex.ru/maps` для веба

### YooKassa API (фаза 2)
- **Режим:** тестовый контур до готовности продукта
- **Метод:** двухэтапный платёж (hold → capture) опционально
- **Webhook:** проверка подписи, идемпотентность
- **Деньги:** 100% бизнесу, платформа не удерживает комиссию

---

## 6. Модель данных (ключевые таблицы)

### studios
```
id, yclients_company_id, yclients_form_id, name, address, lat, lon,
phone, category, tariff, is_active, yandex_rating, yclients_api_key (AES-256),
created_at, updated_at
```

### services (обогащённые)
```
id, studio_id, yclients_service_id, title, base_price, duration_min,
platform_category, format (individual/group), level, description,
staff_id, staff_name, staff_role, staff_experience, what_to_bring,
is_active, created_at, updated_at
```

### slots (публикуемые)
```
id, studio_id, service_id, staff_id, yclients_staff_id, yclients_service_id,
date, time, datetime, capacity, booked_count, base_price, max_discount,
max_radius, status (available/reserved/paid/synced/cancelled),
yclients_sync_at, published_at, created_at, updated_at
```

### bookings
```
id, slot_id, user_id, status (held/paid/confirmed/completed/cancelled/late_cancel),
final_price, discount_amount, discount_percent, distance_km,
payment_id, payment_status, yclients_booking_id, idempotency_key,
held_at, paid_at, confirmed_at, cancelled_at, completed_at, created_at
```

### users
```
id, phone, email, first_name, last_name, tariff, refresh_tokens_count,
preferred_categories, search_radius, preferred_time, incidents_30d,
is_blocked, created_at
```

---

## 7. Механика скидки (вынос из ARCHITECTURE.md)

```
discount = бизнес_min + (distance / бизнес_radius) × (бизнес_max - бизнес_min)
```

- Пользовательский радиус — только фильтр видимости
- На одном расстоянии все тарифы получают одинаковую скидку
- Бизнес-радиус и бизнес-скидка задаются при публикации слота
- Haversine для расстояния (MVP), Yandex Routing API (будущее)

### Scoring ленты

```
score = (distance_factor × 0.35) + (discount_factor × 0.40) + (urgency_factor × 0.25)
× preferred_category (1.5) / adjacent (1.0) / discovery (0.8)
× tariff_priority (1.0 / 1.5 / 2.5)
```

---

## 8. Агенты и модели (вынос из MODEL_ALLOCATION.md)

### Какой агент для какой задачи

| Задача | Модель | Флаги |
|---|---|---|
| Архитектура, схемы БД, ревью | Claude Code | `--print --permission-mode bypassPermissions` |
| CRUD, роуты, middleware, тесты | DeepSeek / GPT-5 via Codex | `pty:true`, `--full-auto` |
| Интеграции (YClients, YooKassa) | Claude Code | `--print --permission-mode bypassPermissions` |

### Бюджет: $200/мес (распределение в MODEL_ALLOCATION.md)

---

## 9. Процесс разработки

### Git-ветки
```
main          ← защищённая, только через PR
├── feat/*    ← фичи
├── fix/*     ← багфиксы
└── chore/*   ← конфиги, зависимости
```

### Коммиты
```
feat: описание
fix: описание
chore: описание
docs: описание
test: описание
```

### Pull Request
- Название: что сделано
- Описание: что, зачем, как проверять
- Чеклист: lint, typecheck, tests
- Ревью: оператор или оркестратор

---

## 10. Переменные окружения

### .env.example (коммитится)
```
YCLIENTS_API_TOKEN=
YCLIENTS_COMPANY_ID=
YCLIENTS_FORM_ID=
YANDEX_MAPS_API_KEY=
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
DATABASE_URL=postgresql://localhost:5432/beauty_marketplace
REDIS_URL=redis://localhost:6379
JWT_SECRET=
```

### .env.local (НЕ коммитится, в .gitignore)
Содержит реальные ключи для локальной разработки.

---

## 11. Что НЕ делаем (явные запреты)

- ❌ Не пишем код до проверки инфраструктуры
- ❌ Не коммитим API-ключи (в .gitignore)
- ❌ Не меняем docs/ без оператора (спецификация заморожена)
- ❌ Не деплоим на VPS до полной готовности и тестов
- ❌ Не используем реальные YClients-ключи в CI
- ❌ Не добавляем новые фичи вне спецификации без согласования
- ❌ Не пишем код в ~/.openclaw/ или ~/Projects/openclaw/
