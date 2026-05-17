# 📡 СнабЛаб API Documentation

> **Проект Бестии** | Версия: 0.1.0
> Base URL: `http://localhost:8000`

## Аутентификация

Все запросы (кроме `/health`, `/api/v1/users/register`, `/api/v1/users/login`) требуют JWT токен в заголовке:

```
Authorization: Bearer <access_token>
```

### POST `/api/v1/users/register`
Регистрация пользователя.

**Body:**
```json
{
  "username": "lab_tech_1",
  "password": "your_password",
  "email": "tech@lab.local",
  "full_name": "Техников Техн Техович",
  "role": "lab_tech"
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "lab_tech_1",
  "email": "tech@lab.local",
  "full_name": "Техников Техн Техович",
  "role": "lab_tech",
  "is_active": true,
  "created_at": "2026-05-15T10:00:00"
}
```

### POST `/api/v1/users/login`
Вход, получение JWT токена.

**Body:**
```json
{
  "username": "admin",
  "password": "your_admin_password"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { ... }
}
```

---

## Номенклатура

### GET `/api/v1/nomenclature/`
Список номенклатуры с пагинацией и фильтрами.

**Query параметры:**
| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| skip | int | 0 | Пропустить N записей |
| limit | int | 100 | Максимум записей (1-500) |
| search | string | — | Поиск по названию и каталожному номеру |
| manufacturer | string | — | Фильтр по производителю |
| is_active | bool | — | Фильтр по активности |

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Набор реагентов для общего анализа крови Sysmex",
      "catalog_number": "XN-1000-O",
      "manufacturer": "Sysmex",
      "unit": "набор",
      "shelf_life_months": 6,
      "storage_conditions": "+2..+8°C",
      "okpd2_code": "32.50.13.190",
      "ktru_code": "32.50.13.190-00001",
      "nkmi_code": null,
      "is_active": true,
      "created_at": "2026-05-15T10:00:00"
    }
  ],
  "total": 1
}
```

### GET `/api/v1/nomenclature/{item_id}`
Получить номенклатуру по ID.

### POST `/api/v1/nomenclature/`
Создать номенклатуру.

### PATCH `/api/v1/nomenclature/{item_id}`
Обновить номенклатуру.

### DELETE `/api/v1/nomenclature/{item_id}`
Деактивировать номенклатуру (soft delete).

---

## Поставщики

### GET `/api/v1/suppliers/`
Список поставщиков.

**Query:** `skip`, `limit`, `search` (по названию и ИНН)

### GET `/api/v1/suppliers/{supplier_id}`
Получить поставщика по ID.

### POST `/api/v1/suppliers/`
Создать поставщика.

**Body:**
```json
{
  "name": "ООО «КардиоМед»",
  "inn": "7707843210",
  "kpp": "770701001",
  "address": "123060, г. Москва, ул. Маршала Василевского, д. 15",
  "contact_email": "info@cardiomed.ru",
  "contact_phone": "+7(495)123-45-67",
  "manager_name": "Иванов А.С.",
  "rating": 4.5
}
```

### PATCH `/api/v1/suppliers/{supplier_id}`
Обновить поставщика.

---

## Коммерческие предложения

### GET `/api/v1/offers/`
Список КП.

**Query:** `skip`, `limit`, `supplier_id`, `parsed_status` (pending/parsed/error)

### GET `/api/v1/offers/{offer_id}`
Получить КП с позициями.

### POST `/api/v1/offers/`
Создать КП.

**Body:**
```json
{
  "supplier_id": 1,
  "offer_number": "ЦБ-1234",
  "offer_date": "2026-04-07",
  "file_path": "uploads/kp/cardiomed_1234.pdf",
  "total_amount": 190000.00
}
```

### PATCH `/api/v1/offers/{offer_id}`
Обновить КП (включая parsed_status).

---

## Склад

### GET `/api/v1/inventory/`
Список остатков.

**Query:** `skip`, `limit`, `nomenclature_id`, `status` (in_stock/depleted/expired)

### POST `/api/v1/inventory/`
Создать запись склада (партия).

**Body:**
```json
{
  "nomenclature_id": 1,
  "batch_number": "BN-2026-001",
  "quantity": 50,
  "unit": "набор",
  "expiry_date": "2026-11-15",
  "received_date": "2026-05-15",
  "offer_id": 1
}
```

### POST `/api/v1/inventory/transactions`
Создать движение (приход/расход/списание).

**Body:**
```json
{
  "inventory_id": 1,
  "transaction_type": "consumption",
  "quantity": 5,
  "reason": "Расход на анализы 01.05.2026"
}
```

**Автоматически обновляет остаток.** При `quantity <= 0` статус меняется на `depleted`.

### GET `/api/v1/inventory/low-stock`
Позиции с низким остатком или истекающим сроком.

**Query:** `threshold_days` (по умолчанию 30)

---

## Закупки

### GET `/api/v1/purchases/`
Список заявок.

**Query:** `skip`, `limit`, `status` (draft/pending/approved/ordered), `nomenclature_id`

### POST `/api/v1/purchases/`
Создать заявку на закупку.

**Body:**
```json
{
  "request_number": "ЗН-2026-001",
  "request_date": "2026-05-15",
  "nomenclature_id": 1,
  "quantity": 10,
  "unit": "набор",
  "estimated_price": 150000.00,
  "supplier_id": 1
}
```

### PATCH `/api/v1/purchases/{purchase_id}`
Обновить заявку (включая статус согласования).

---

## Парсер КП

### POST `/api/v1/parser/parse`
Загрузить PDF/DOCX КП и получить структурированные данные.

**Content-Type:** `multipart/form-data`
**Параметр:** `file` (PDF или DOCX)

**Response (200):**
```json
{
  "status": "ok",
  "data": {
    "supplier_name": "ООО «КардиоМед»",
    "supplier_inn": "7707843210",
    "supplier_address": "123060, г. Москва, ул. Маршала Василевского, д. 15",
    "kp_number": "ЦБ-1234",
    "kp_date": "07.04.2026",
    "kp_recipient": "ФБУЗ «ЛРЦ Минэкономразвития России»",
    "items": [
      {
        "number": 1,
        "name": "Набор реагентов для общего анализа крови",
        "catalog_number": "XN-1000-O",
        "manufacturer": "Sysmex",
        "unit": "шт",
        "quantity": "10",
        "price_per_unit": "15 000,00",
        "total_price": "150 000,00",
        "nds_rate": "20%"
      }
    ],
    "total_sum": "190 000,00",
    "total_nds": "38 000,00",
    "delivery_period": "14 рабочих дней",
    "price_valid_until": "30.04.2026"
  }
}
```

### POST `/api/v1/parser/generate-sz`
Загрузить PDF/DOCX КП и получить DOCX служебной записки.

**Content-Type:** `multipart/form-data`
**Параметр:** `file` (PDF или DOCX)

**Response:** Файл `.docx` (служебная записка)

---

## Health Check

### GET `/health`
```json
{
  "status": "ok",
  "service": "snablab",
  "version": "0.1.0"
}
```
