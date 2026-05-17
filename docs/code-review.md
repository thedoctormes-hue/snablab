# Code Review: СнабЛаб v0.2.0

**Дата:** 2026-05-16
**Проверяющий:** OWL (Senior Code Reviewer)
**Объём:** ~2000 строк (backend + frontend + infra)
**Вердикт:** ⚠️ REQUEST CHANGES — 3 critical, 8 major, 12 minor

---

## Обзор

СнабЛаб — система управления закупками лабораторных расходников. FastAPI + React + PostgreSQL + MinIO. Архитектура в целом грамотная: слоистая структура (endpoints → services → models), JWT-авторизация, soft-delete, структурированное логирование. Код читаемый, именование консистентное.

**Главные проблемы:** отсутствие валидации статусов/ролей (critical), SQL-инъекция через невалидированные строковые параметры (critical), утечка секретов в docker-compose (critical), отсутствие индексов на часто используемых полях (major), race condition в get-or-create паттерне (major), дублирование кода в сервисах и эндпоинтах (major).

---

## 🔴 Critical Issues (3)

### C-1: SQL-инъекция через невалидированные строковые фильтры в equipment_service.py

**Файл:** `backend/app/services/equipment_service.py:21-39`
**Severity:** 🔴 Critical

**Проблема:** Параметры `status` и `department` передаются напрямую в SQLAlchemy `where()` без валидации. Хотя SQLAlchemy использует параметризованные запросы (что защищает от классической SQL-инъекции), отсутствие валидации приводит к:
- Возможности передать произвольную строку, которая не соответствует бизнес-логике
- Путанице в данных (статус `"foo"` не вызовет ошибку, но и не найдёт ничего)
- Потенциальной уязвимости при будущих изменениях (если кто-то перейдёт на raw SQL)

**Рекомендация:**
```python
from enum import Enum

class EquipmentStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    DECOMMISSIONED = "decommissioned"

VALID_STATUSES = {s.value for s in EquipmentStatus}

async def get_equipment_list(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    status: str | None = None,
    department: str | None = None,
) -> tuple[list[Equipment], int]:
    if status is not None and status not in VALID_STATUSES:
        raise ValueError(f"Invalid status: {status}. Must be one of {VALID_STATUSES}")
    # ... rest of the function
```

**Примечание:** Та же проблема есть в `nomenclature_service.py:21` (параметр `is_active` проверяется как `is not None`, но без валидации типа), `offer_service.py:24` (параметр `parsed_status`), `inventory_service.py` и `purchase_service.py`.

---

### C-2: Утечка секретов в docker-compose.yml

**Файл:** `docker-compose.yml:11-13, 46-47`
**Severity:** 🔴 Critical

**Проблема:**
```yaml
environment:
  POSTGRES_USER: snablab
  POSTGRES_PASSWORD: snablab
  POSTGRES_DB: snablab
```
```yaml
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: minioadmin
```

Пароли захардкожены в репозитории. Файл `.env.example` содержит те же значения. Если репозиторий публичный или даже приватный с несколькими участниками — это прямая утечка credentials.

**Рекомендация:**
```yaml
# docker-compose.yml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB}
```
```yaml
# .env (НЕ коммитить!)
POSTGRES_USER=snablab
POSTGRES_PASSWORD=<generate-random>
POSTGRES_DB=snablab
```
```yaml
# .env.example
POSTGRES_USER=snablab
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=snablab
```

Добавить `.env` в `.gitignore` (проверить, что он там есть). Для MinIO — аналогично.

---

### C-3: Отсутствие валидации статуса в EquipmentUpdate и EquipmentCreate

**Файл:** `backend/app/schemas/equipment.py:13, :22`
**Severity:** 🔴 Critical

**Проблема:**
```python
class EquipmentBase(BaseModel):
    status: str = Field("active", max_length=20, description="Статус: active / maintenance / decommissioned")

class EquipmentUpdate(BaseModel):
    status: str | None = Field(None, max_length=20)
```

Поле `status` принимает **любую строку** длиной до 20 символов. Можно отправить `PATCH /equipment/1` с `{"status": "foobar"}` — и оно сохранится в БД. Это ломает бизнес-логику:
- `delete_equipment` устанавливает `status = "decommissioned"` (equipment_service.py:56), но ничто не мешает установить этот статус через update
- Frontend `statusConfig` в EquipmentPage.tsx содержит 4 статуса, но backend не ограничивает их
- Статус `"decommissioned"` отсутствует в `EquipmentBase.description` (указано только "active / maintenance / decommissioned", но пропущен "repair")

**Рекомендация:**
```python
from enum import Enum

class EquipmentStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    DECOMMISSIONED = "decommissioned"

class EquipmentBase(BaseModel):
    status: EquipmentStatus = EquipmentStatus.ACTIVE

class EquipmentUpdate(BaseModel):
    status: EquipmentStatus | None = None
```

---

## 🟠 Major Issues (8)

### M-1: Отсутствие индексов на часто используемых полях

**Файл:** `backend/app/db/models/equipment.py:1-23`
**Severity:** 🟠 Major

**Проблема:** Поля, по которым идёт фильтрация и поиск, не имеют индексов:
- `status` — фильтрация в `get_equipment_list` и на фронте (EquipmentPage stats cards)
- `department` — фильтрация в `get_equipment_list`
- `name` — поиск через `ilike` + сортировка `order_by(Equipment.name)`
- `serial_number` — поиск через `ilike`

Без индексов при росте таблицы до 10k+ записей запросы будут выполняться с full table scan.

**Рекомендация:**
```python
from sqlalchemy import Index

class Equipment(Base):
    __tablename__ = "equipment"
    # ... columns ...
    
    __table_args__ = (
        Index("ix_equipment_status", "status"),
        Index("ix_equipment_department", "department"),
        Index("ix_equipment_name", "name"),
        Index("ix_equipment_status_department", "status", "department"),
    )
```

Аналогично для `Nomenclature` (`is_active`, `manufacturer`), `CommercialOffer` (`supplier_id`, `parsed_status`), `Inventory` (`nomenclature_id`, `status`), `PurchaseRequest` (`status`, `nomenclature_id`).

---

### M-2: Race condition в паттерне get-or-create (register_user)

**Файл:** `backend/app/api/v1/endpoints/users.py:18-24`
**Severity:** 🟠 Major

**Проблема:**
```python
@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(...):
    existing = await get_user_by_username(db, data.username)
    if existing:
        raise HTTPException(status_code=409, detail="Пользователь уже существует")
    return await create_user(db, data)
```

Между проверкой `existing` и вызовом `create_user` другой запрос может создать пользователя с тем же username. При наличии `unique=True` в модели User это приведёт к `IntegrityError` вместо понятного 409.

**Рекомендация:**
```python
from sqlalchemy.exc import IntegrityError

@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(...):
    existing = await get_user_by_username(db, data.username)
    if existing:
        raise HTTPException(status_code=409, detail="Пользователь уже существует")
    try:
        return await create_user(db, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Пользователь уже существует")
```

---

### M-3: Неконсистентность типов Equipment между фронтом и бэком

**Файл:** `frontend/src/types/index.ts:149-172` vs `backend/app/schemas/equipment.py:1-40`
**Severity:** 🟠 Major

**Проблема:** Типы на фронте и бэке расходятся:

| Поле | Frontend types | Backend schema | DB model |
|------|---------------|----------------|----------|
| `inventory_number` | ✅ есть | ❌ нет | ❌ нет |
| `last_maintenance` | ✅ есть | ❌ нет | ❌ нет |
| `next_maintenance` | ✅ есть | ❌ нет | ❌ нет |
| `updated_at` | ✅ есть | ❌ нет | ❌ нет |
| `location` | ✅ есть | ❌ нет | ❌ нет |
| `warranty_until` | ❌ нет | ✅ есть | ✅ есть |
| `notes` | ✅ есть | ❌ нет | ❌ нет |

Frontend отправляет `PATCH` с полями `location`, `next_maintenance`, `notes`, `inventory_number`, которых нет в `EquipmentUpdate` — они будут проигнорированы (Pydantic отбросит неизвестные поля по умолчанию). Обратно — фронт не получит `warranty_until`.

**Рекомендация:** Привести типы к единому виду. Добавить недостающие поля в DB-модель, схему и миграцию, либо убрать лишнее из фронта.

---

### M-4: Дублирование кода в сервисах (CRUD-паттерн)

**Файл:** `backend/app/services/equipment_service.py`, `nomenclature_service.py`, `supplier_service.py` и др.
**Severity:** 🟠 Major

**Проблема:** Все сервисы содержат практически идентичный CRUD-код:
- `get_*` — `db.get(Model, id)`
- `get_*_list` — построитель запросов с фильтрами
- `create_*` — `Model(**data.model_dump())`
- `update_*` — `setattr` в цикле
- `delete_*` — soft-delete

Это 6 файлов с ~80% дублирования. Любое изменение логики (например, добавление аудита) потребует правок во всех 6 файлах.

**Рекомендация:** Вынести базовый CRUD-сервис:
```python
class BaseService[Model, CreateSchema, UpdateSchema]:
    def __init__(self, model: type[Model]):
        self.model = model
    
    async def get(self, db: AsyncSession, id: int) -> Model | None:
        return await db.get(self.model, id)
    
    async def create(self, db: AsyncSession, data: CreateSchema) -> Model:
        item = self.model(**data.model_dump())
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return item
    
    # ... update, delete, list
```

---

### M-5: Дублирование кода в эндпоинтах

**Файл:** `backend/app/api/v1/endpoints/equipment.py`, `nomenclature.py`, `suppliers.py` и др.
**Severity:** 🟠 Major

**Проблема:** Все эндпоинты содержат идентичную структуру:
```python
@router.get("/", response_model=dict)
async def list_items(..., db = Depends(get_db), user = Depends(require_auth)):
    items, total = await get_list(db, ...)
    return {"items": [Response.model_validate(i) for i in items], "total": total}

@router.get("/{id}", response_model=Response)
async def get_item(id: int, ...):
    item = await get(db, id)
    if not item:
        raise HTTPException(404, "Не найдено")
    return item
```

8 эндпоинтов × 5 методов = ~40 функций с одинаковой структурой.

**Рекомендация:** Создать фабрику эндпоинтов или использовать generic router:
```python
def create_crud_router(service, schema, path: str, tags: list[str]):
    router = APIRouter()
    # Автоматически генерирует GET /, GET /{id}, POST, PATCH, DELETE
    return router
```

---

### M-6: Отсутствие обработки ошибок в парсере (parser.py)

**Файл:** `backend/app/api/v1/endpoints/parser.py:33-47, :55-69`
**Severity:** 🟠 Major

**Проблема:**
```python
try:
    data = parse_kp_file(tmp_path)
    return {"status": "ok", "data": data}
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Ошибка парсинга: {str(e)}")
```

Ловится **любое** исключение, включая `KeyboardInterrupt`, `SystemExit`, `MemoryError`. Сообщение об ошибке содержит `str(e)` — может раскрыть внутреннюю структуру файловой системы или детали реализации.

**Рекомендация:**
```python
from app.parsers.exceptions import ParseError  # кастомное исключение

try:
    data = parse_kp_file(tmp_path)
except ParseError as e:
    raise HTTPException(status_code=422, detail=str(e))
except Exception:
    logger.exception("parser.unexpected_error", filename=file.filename)
    raise HTTPException(status_code=500, detail="Внутренняя ошибка парсинга")
```

---

### M-7: Небезопасная обработка файлов в parser.py

**Файл:** `backend/app/api/v1/endpoints/parser.py:33-47`
**Severity:** 🟠 Major

**Проблема:**
```python
with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
    content = await file.read()  # Может быть 50MB+
    tmp.write(content)
    tmp_path = tmp.name
```

1. `file.read()` читает файл целиком в память — при загрузке 50MB PDF это 50MB RAM
2. `delete=False` + `os.unlink(tmp_path)` в `finally` — если процесс упадёт между созданием и `finally`, файл останется на диске
3. Нет проверки размера файла до чтения
4. Временный файл создаётся в `/tmp` с предсказуемым именем — потенциальная атака через symlink

**Рекомендация:**
```python
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

content = await file.read()
if len(content) > MAX_FILE_SIZE:
    raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 25MB)")

with tempfile.NamedTemporaryFile(suffix=ext, delete=True) as tmp:
    tmp.write(content)
    tmp.flush()
    data = parse_kp_file(tmp.name)
    # файл удалится автоматически
```

---

### M-8: Отсутствие commit в get_db() при read-only операциях

**Файл:** `backend/app/db/base.py:18-25`
**Severity:** 🟠 Major

**Проблема:**
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()  # commit даже для GET-запросов!
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

`session.commit()` вызывается для **всех** запросов, включая GET. Для read-only операций это:
- Ненужная нагрузка на БД
- Потенциальная проблема с MVCC в PostgreSQL (ненужные WAL-записи)
- Может маскировать проблемы с неявными транзакциями

**Рекомендация:**
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            if session.is_active:
                await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

Или разделить на read-only и read-write зависимости.

---

## 🟡 Minor Issues (12)

### m-1: Неполная валидация роли пользователя при регистрации

**Файл:** `backend/app/schemas/user.py:8`
```python
role: str = Field("lab_tech", max_length=20, description="Роль: admin / lab_head / lab_tech / economist")
```
Любая строка длиной до 20. Пользователь может зарегистрироваться с ролью `"admin"`.

**Рекомендация:** Использовать `Enum` для ролей + запретить самостоятельную регистрацию с ролью `admin`.

---

### m-2: Нет ограничения на создание admin-пользователей

**Файл:** `backend/app/api/v1/endpoints/users.py:18-24`
```python
@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(...):
```
Любой может зарегистрироваться как `admin`. Нет проверки, что регистрирующий имеет право создавать пользователей с определённой ролью.

**Рекомендация:** Добавить `require_admin` для указания роли, отличной от `lab_tech`.

---

### m-3: Неконсистентное именование параметров в эндпоинтах

**Файл:** `backend/app/api/v1/endpoints/equipment.py:37`
```python
async def get_equipment_item(equipment_id: int, ...):
```
**Файл:** `backend/app/api/v1/endpoints/nomenclature.py:28`
```python
async def get_nomenclature_item(item_id: int, ...):
```

В одном месте `equipment_id`, в другом `item_id`. Для номенклатуры — `item_id`, для оборудования — `equipment_id`. Непоследовательно.

**Рекомендация:** Унифицировать: либо `{entity}_id` везде, либо `id` везде.

---

### m-4: Отсутствие пагинации на фронте

**Файл:** `frontend/src/pages/EquipmentPage.tsx:47-53`
```typescript
const loadData = useCallback(async () => {
  const data = await equipmentApi.list({
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  })
  setItems(data.items)
  setTotal(data.total)
}, [statusFilter, searchQuery])
```

Параметры `skip` и `limit` не передаются — загружаются все записи (до 100 по умолчанию). При росте данных это приведёт к деградации.

**Рекомендация:** Добавить компонент пагинации или infinite scroll.

---

### m-5: Нет debounce для поиска

**Файл:** `frontend/src/pages/EquipmentPage.tsx:119-124`
```typescript
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

Каждое нажатие клавиши вызывает `loadData()` через `useEffect`. При быстром наборе текста это 6-8 запросов к API.

**Рекомендация:** Добавить `useDebounce(searchQuery, 300)` хук.

---

### m-6: Использование `confirm()` для удаления

**Файл:** `frontend/src/pages/EquipmentPage.tsx:82`
```typescript
const handleDelete = async (id: number) => {
  if (!confirm('Списать оборудование?')) return
```

Нативный `confirm()` блокирует UI и выглядит непрофессионально.

**Рекомендация:** Использовать кастомный Modal для подтверждения.

---

### m-7: Нет обработки ошибок API в equipmentApi

**Файл:** `frontend/src/api/equipment.ts:7-12`
```typescript
list: async (params?: {...}): Promise<PaginatedResponse<Equipment>> => {
  const { data } = await client.get('/equipment/', { params })
  return data
},
```

Если API вернёт неожиданный формат (например, ошибку вместо данных), фронт упадёт без понятного сообщения. Хотя interceptor в client.ts обрабатывает 401, другие ошибки могут быть неинформативными.

**Рекомендация:** Добавить типизацию ошибок и обработку на уровне API-слоя.

---

### m-8: Нет Content-Security-Policy в nginx

**Файл:** `nginx/nginx.conf:12-15`
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Отсутствует `Content-Security-Policy` — это ключевой заголовок безопасности, предотвращающий XSS-атаки.

**Рекомендация:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:8000" always;
```

---

### m-9: Нет rate limiting на эндпоинт парсинга

**Файл:** `backend/app/api/v1/endpoints/parser.py:28`
```python
@router.post("/parse")
async def parse_kp(...):
```

Парсинг PDF — ресурсоёмкая операция. Без rate limiting злоумышленник может отправить 100 файлов по 50MB каждый и вызвать OOM.

**Рекомендация:**
```python
@router.post("/parse")
@limiter.limit("5/minute")
async def parse_kp(request: Request, ...):
```

---

### m-10: Нет валидации supplier_id в parser.py

**Файл:** `backend/app/api/v1/endpoints/parser.py:52`
```python
async def upload_and_save_kp(
    file: UploadFile = File(...),
    supplier_id: int = 0,  # 0 — невалидный ID!
    ...
```

`supplier_id=0` — значение по умолчанию, которое не соответствует ни одному поставщику. Если пользователь не передаст `supplier_id`, КП сохранится с `supplier_id=0`, что нарушит FK-ограничение или создаст «сиротскую» запись.

**Рекомендация:**
```python
supplier_id: int = Field(..., gt=0, description="ID поставщика (обязательно)")
```

---

### m-11: Нет обработки дубликатов в toastStore

**Файл:** `frontend/src/store/toastStore.ts:21-28`
```typescript
addToast: (toast) => {
  const id = crypto.randomUUID()
  const newToast = { ...toast, id }
  set((state) => ({ toasts: [...state.toasts, newToast] }))

  const duration = toast.duration ?? 4000
  if (duration > 0) {
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  }
},
```

Если пользователь быстро нажмёт кнопку 5 раз, появится 5 одинаковых toast-ов. Нет ограничения на количество одновременных toast-ов.

**Рекомендация:** Добавить лимит:
```typescript
set((state) => ({
  toasts: [...state.toasts, newToast].slice(-5), // максимум 5
}))
```

---

### m-12: Нет закрытия файлового дескриптора в generate_sz_endpoint

**Файл:** `backend/app/api/v1/endpoints/parser.py:103-115`
```python
try:
    kp_data = parse_kp_file(tmp_path)
    generate_sz(kp_data, output_path)
    return FileResponse(output_path, ...)
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Ошибка генерации: {str(e)}")
finally:
    if os.path.exists(tmp_path):
        os.unlink(tmp_path)
    # output_path НЕ удаляется!
```

`output_path` (сгенерированный DOCX) не удаляется после отправки клиента. При каждом вызове в `/tmp` остаётся файл.

**Рекомендация:**
```python
finally:
    for path in [tmp_path, output_path]:
        if os.path.exists(path):
            os.unlink(path)
```

---

## ✅ Что сделано хорошо

1. **Грамотная слоистая архитектура** — endpoints → services → models. Чёткое разделение ответственности.
2. **JWT-авторизация с ролями** — `require_auth`, `require_write_access`, `require_admin` — понятная система прав.
3. **Soft-delete** — оборудование не удаляется, а помечается как `decommissioned`. Номенклатура — `is_active = False`.
4. **Структурированное логирование** — structlog с JSON в production и цветным выводом в dev.
5. **Rate limiting** — slowapi на уровне приложения.
6. **CORS-настройки** — вынесены в конфиг, не захардкожены.
7. **Pydantic-валидация** — min_length, max_length, ge/gt на полях схем.
8. **Async на всех уровнях** — asyncpg, AsyncSession, async endpoints.
9. **Документация в коде** — docstrings на русском, description в Field.
10. **Frontend типизация** — TypeScript с интерфейсами для всех сущностей.

---

## 📊 Сводка

| Категория | Critical | Major | Minor |
|-----------|----------|-------|-------|
| Корректность | 1 (C-1) | 3 (M-2, M-3, M-6) | 3 (m-3, m-7, m-12) |
| Безопасность | 2 (C-2, C-3) | 2 (M-7, M-8) | 3 (m-1, m-2, m-8) |
| Архитектура | — | 2 (M-4, M-5) | 1 (m-11) |
| Производительность | — | 1 (M-1) | 2 (m-4, m-5) |
| Читаемость | — | — | 1 (m-6) |
| **Итого** | **3** | **8** | **12** |

---

## 🎯 Приоритет исправлений

1. **Немедленно (до деплоя):**
   - C-2: Убрать секреты из docker-compose.yml
   - C-3: Добавить Enum-валидацию статусов
   - M-2: Добавить обработку IntegrityError при регистрации

2. **Спринт 1:**
   - C-1: Валидация строковых фильтров
   - M-1: Добавить индексы
   - M-3: Синхронизировать типы фронт/бэк
   - m-8: Добавить CSP-заголовок

3. **Спринт 2:**
   - M-4, M-5: Рефакторинг дублирования
   - M-6, M-7: Безопасность парсера
   - m-5: Debounce поиска
   - m-9: Rate limiting парсера

---

*Review generated by OWL — Senior Code Reviewer*
*Проект: СнабЛаб v0.2.0 | Проект Бестии 🐻*
