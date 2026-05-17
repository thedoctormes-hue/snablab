# 📸 СнабЛаб — Snapshot сессии

> **Проект Бестии** | Дата: 2026-05-15
> Этот файл создан для передачи контекста в новую сессию.

## Состояние проекта: v0.1.0-alpha

### Статистика
- **Python файлов:** 48 (без venv)
- **Строк кода:** 2353
- **Тестов:** 6/6 пройдено
- **FastAPI:** запускается ✅
- **Docker Compose:** настроен ✅

### Структура БД (8 сущностей)
1. **User** — пользователи (admin, lab_head, lab_tech, economist)
2. **Nomenclature** — номенклатура реагентов/расходников
3. **Equipment** — лабораторное оборудование
4. **NomenclatureEquipment** — связь номенклатуры с оборудованием (consumption_per_test)
5. **Supplier** — поставщики
6. **CommercialOffer + OfferItem** — коммерческие предложения
7. **Inventory + InventoryTransaction** — складской учёт
8. **PurchaseRequest** — заявки на закупку

### API Endpoints (7 модулей)
| Модуль | Prefix | CRUD |
|--------|--------|------|
| Nomenclature | `/api/v1/nomenclature` | ✅ Полный |
| Suppliers | `/api/v1/suppliers` | ✅ Полный |
| Offers | `/api/v1/offers` | ✅ Полный |
| Inventory | `/api/v1/inventory` | ✅ Полный + transactions + low-stock |
| Purchases | `/api/v1/purchases` | ✅ Полный |
| Users | `/api/v1/users` | ✅ Register + Login |
| Parser | `/api/v1/parser` | ✅ Parse + Generate SZ |

### Что НЕ готово (критические пробелы)
1. ❌ **Frontend** — пустая папка `frontend/src/`
2. ❌ **Авторизация в API** — JWT есть, но Depends не подключён к endpoints
3. ❌ **MinIO интеграция** — конфиг есть, клиент не написан
4. ❌ **Автосопоставление позиций КП** — парсер возвращает данные, но не связывает с номенклатурой
5. ❌ **Тестовое покрытие** — только 6 базовых тестов, нет тестов endpoints

### Известные проблемы
- Парсер КП: захватывает количество из цены (известная особенность layout)
- Парсер: не поддерживает сканированные PDF (нет OCR)
- Alembic: нет начальной миграции (autogenerate не настроен)

### Креды по умолчанию
- Admin: `admin` / `changeme`
- PostgreSQL: `snablab` / `snablab` @ localhost:5432
- Redis: localhost:6379
- MinIO: minioadmin / minioadmin @ localhost:9000

### Команды
```bash
# Запуск backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Тесты
cd backend && source .venv/bin/activate && pytest -v

# Docker
docker compose up -d

# Seed данных
cd backend && source .venv/bin/activate && python ../scripts/seed_reference_data.py

# Миграции
cd backend && source .venv/bin/activate && alembic upgrade head
```

### Файлы для ознакомления
- `README.md` — обзор проекта
- `docs/API.md` — документация API
- `docs/ROADMAP.md` — план развития
- `docs/architecture/` — ADR документы
- `backend/app/main.py` — точка входа FastAPI
- `backend/app/api/v1/__init__.py` — маршрутизация API
- `backend/app/db/models/` — модели БД
- `backend/app/services/` — бизнес-логика
- `backend/app/parsers/` — парсер КП и генератор СЗ
- `backend/tests/` — тесты

### Следующие задачи (из roadmap)
1. 🔴 Подключить JWT Depends ко всем endpoints
2. 🔴 Написать React frontend (Vite + TS)
3. 🟡 Интегрировать MinIO для хранения файлов
4. 🟡 Автосопоставление позиций КП с номенклатурой
5. 🟡 Расширить тесты (coverage > 80%)
