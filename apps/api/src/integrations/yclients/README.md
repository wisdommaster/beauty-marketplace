# YClients API — Документация и эндпоинты

## Источник
Изучено на основе Python-обёртки `yclients-api` (PyPI), официальной документации Apiary (YClients API v2.0), и референс-реализаций с GitHub.

## Базовые параметры

- **API Token** (Bearer) — персональный токен из личного кабинета YClients
- **Company ID** — ID компании (студии)
- **Form ID** — ID формы онлайн-записи (обычно совпадает с Company ID)

## Заголовки

```
Accept: application/vnd.yclients.v2+json
Authorization: Bearer {token}
Accept-Language: ru-RU
Cache-Control: no-cache
```

## Эндпоинты

### 1. Авторизация
```
POST https://api.yclients.com/api/v1/auth
Body: { login, password }
→ { data: { user_token } }
```

### 2. Персонал (мастера)
```
GET https://n{form_id}.yclients.com/api/v1/book_staff/{company_id}
Params: service_ids[] (optional), datetime (optional)
→ { data: [{ id, name, bookable, specialization, position, avatar }] }

GET https://n{form_id}.yclients.com/api/v1/staff/{company_id}/{staff_id}
→ { data: { id, name, specialization, position, avatar } }
```

### 3. Услуги
```
GET https://n{form_id}.yclients.com/api/v1/book_services/{company_id}
Params: staff_id (optional), datetime (optional)
→ { data: [{ id, title, price, duration, category }] }

GET https://n{form_id}.yclients.com/api/v1/services/{company_id}/{service_id}
→ { data: { id, title, price, duration, category, description } }
```

### 4. Доступные дни и слоты
```
GET https://n{form_id}.yclients.com/api/v1/book_dates/{company_id}
Params: staff_id (optional), service_ids[] (optional)
→ { data: ["2026-04-28", "2026-04-29", ...] }

GET https://n{form_id}.yclients.com/api/v1/book_times/{company_id}/{staff_id}/{day}
Params: service_ids[] (optional)
→ { data: [{ time: "09:00", seance_length: 3600, datetime: "2026-04-28T09:00:00+03:00" }] }
```

### 5. Бронирование
```
POST https://n{form_id}.yclients.com/api/v1/book_record/{company_id}
Body: {
  phone, fullname, email,
  appointments: [{ id: 0, services: [service_id], staff_id, datetime }],
  comment (optional)
}
→ { success: true, data: { id: booking_id, ... } }
```

### 6. Клиенты
```
GET https://api.yclients.com/api/v1/clients/{company_id}
Params: page, count (≤200)
→ { data: [...], meta: { total_count } }
```

### 7. Информация о компании
```
GET https://api.yclients.com/api/v1/company/{company_id}
→ { data: { id, title, address, phone, ... } }
```

---

## Что нужно для маркетплейса

| Эндпоинт | Зачем | Частота |
|---|---|---|
| `book_staff` | Получить всех мастеров студии | При синхронизации |
| `book_services` | Получить услуги студии | При синхронизации |
| `staff/{id}` | Детали мастера (специализация) | При синхронизации |
| `services/{id}` | Детали услуги (длительность, категория) | При синхронизации |
| `book_dates` | Доступные дни | При синхронизации |
| `book_times/{staff}/{day}` | Доступные слоты | Каждые 60 сек (incremental) |
| `book_record` | Создать бронь | При каждом бронировании |
| `company/{id}` | Адрес студии | При синхронизации |

## Ключевая заметка

**YClients API не предоставляет capacity (вместимость групповых занятий).** Поле capacity нужно получать из другого источника или задавать бизнесу вручную. В некоторых версиях API поле `seance_length` указывает длительность сеанса, но не количество мест.
