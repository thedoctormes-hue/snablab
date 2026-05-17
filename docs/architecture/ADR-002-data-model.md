# ADR-002: Модель данных

**Дата:** 2026-05-15
**Статус:** Принято

## Контекст

Система управляет закупками лабораторных расходников. Нужна модель данных, покрывающая полный цикл: справочники → КП → закупки → склад.

## Ключевые сущности

**Nomenclature** — номенклатура реагентов/расходников
- Каталожный номер, производитель, единица измерения
- Коды: ОКПД2, КТРУ, НКМИ
- Связь с оборудованием (расход на 1 анализ)

**Equipment** — лабораторное оборудование
- Название, модель, серийный номер, статус
- Связь с номенклатурой

**Supplier** — поставщики
- Реквизиты, ИНН, контакты, рейтинг

**CommercialOffer + OfferItem** — коммерческие предложения
- Метаданные КП + позиции с ценами

**Inventory + InventoryTransaction** — складской учёт
- Остатки, партии, сроки годности, движения

**PurchaseRequest** — заявки на закупку
- Workflow: draft → pending → approved → ordered

**User** — пользователи
- Роли: admin, lab_head, lab_tech, economist

## Ключевые связи

```
Equipment ←→ Nomenclature (many-to-many через nomenclature_equipment)
  consumption_per_test: расход реагента на 1 анализ

Supplier → CommercialOffer → OfferItem → Nomenclature

Nomenclature → Inventory (one-to-many, разные партии)

Nomenclature → PurchaseRequest
```

## Индексы

- `nomenclature.name` — полнотекстовый поиск
- `nomenclature.catalog_number` — точный поиск
- `suppliers.inn` — поиск по ИНН
- `inventory.expiry_date` — поиск истекающих партий
- `commercial_offers.offer_date` — сортировка
