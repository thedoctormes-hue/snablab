# ADR-005: Стратегия развёртывания

**Дата:** 2026-05-15
**Статус:** Принято

## Контекст

СнабЛаб — внутренняя система лаборатории. Нужна простая и надёжная стратегия развёртывания.

## Решение

**Docker Compose** на одном сервере.

### Сервисы
| Сервис | Образ | Порт | Назначение |
|--------|-------|------|------------|
| PostgreSQL | postgres:16-alpine | 5432 | Основная БД |
| Redis | redis:7-alpine | 6379 | Кэш, сессии, очереди |
| MinIO | minio/minio | 9000/9001 | Хранение файлов (PDF, DOCX) |
| Backend | custom (Python 3.12) | 8000 | FastAPI |
| Frontend | custom (Node) | 5173 | React dev server |

### Хранение данных
- PostgreSQL: named volume `pgdata`
- MinIO: named volume `miniodata`
- Backend code: bind mount (для hot-reload в dev)

## Альтернативы

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| **Docker Compose (выбрано)** | Простота, один сервер | Нет автоскейлинг |
| Kubernetes | Масштабируемость | Избыточно для 1 сервера |
| Systemd без Docker | Минимум зависимостей | Сложнее управлять зависимостями |
| PaaS (Railway/Render) | Ноль конфигурации | Зависимость от провайдера, стоимость |

## Production план

1. Nginx reverse proxy (SSL termination)
2. Let's Encrypt для HTTPS
3. Volume backups (pg_dump + mc mirror)
4. Health checks в Docker Compose
5. Мониторинг: Prometheus + Grafana (опционально)

## Последствия

- ✅ Один сервер, простая конфигурация
- ✅ Воспроизводимость окружения
- ✅ Локальная разработка = production
- ⚠️ Single point of failure (приемлемо для внутренней системы)
