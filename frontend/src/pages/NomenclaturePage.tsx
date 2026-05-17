import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { PageSpinner } from '@/components/common/Spinner'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { SearchBar } from '@/components/common/SearchBar'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { nomenclatureApi } from '@/api/nomenclature'
import type { Nomenclature, NomenclatureCreate } from '@/types'

const emptyForm: NomenclatureCreate = {
  name: '',
  catalog_number: '',
  manufacturer: '',
  unit: 'шт',
}

const PAGE_SIZE = 25

export function NomenclaturePage() {
  const [items, setItems] = useState<Nomenclature[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<NomenclatureCreate>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const skip = (currentPage - 1) * pageSize
      const data = await nomenclatureApi.list({
        search: debouncedSearch || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить номенклатуру')
      console.error('Failed to load nomenclature:', err)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, currentPage, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    try {
      await nomenclatureApi.create(form)
      setIsModalOpen(false)
      setForm(emptyForm)
      loadData()
    } catch (err) {
      setError('Не удалось создать позицию')
      console.error('Failed to create:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await nomenclatureApi.delete(deleteId)
      setDeleteId(null)
      loadData()
    } catch (err) {
      setError('Не удалось удалить позицию')
      console.error('Failed to delete:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'name', header: 'Наименование' },
    { key: 'catalog_number', header: 'Кат. номер', render: (item: Nomenclature) => item.catalog_number || '—' },
    { key: 'manufacturer', header: 'Производитель', render: (item: Nomenclature) => item.manufacturer || '—' },
    { key: 'unit', header: 'Ед. изм.' },
    {
      key: 'is_active',
      header: 'Статус',
      render: (item: Nomenclature) => (
        <Badge variant={item.is_active ? 'success' : 'default'}>
          {item.is_active ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: Nomenclature) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteId(item.id) }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-danger transition-colors"
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  const exportData = items.map((i) => ({
    name: i.name,
    catalog_number: i.catalog_number || '',
    manufacturer: i.manufacturer || '',
    unit: i.unit,
    is_active: i.is_active ? 'Активен' : 'Неактивен',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Номенклатура</h1>
          <p className="text-gray-500 mt-1">Справочник лабораторных расходных материалов</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-danger text-sm">{error}</div>
      )}

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Поиск по названию, кат. номеру, производителю..."
            />
          </div>
          <ExportButton
            data={exportData}
            filename="nomenclature"
            columns={[
              { key: 'name', header: 'Наименование' },
              { key: 'catalog_number', header: 'Кат. номер' },
              { key: 'manufacturer', header: 'Производитель' },
              { key: 'unit', header: 'Ед. изм.' },
              { key: 'is_active', header: 'Статус' },
            ]}
          />
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table
              columns={columns}
              data={items}
              keyExtractor={(item) => item.id}
              emptyMessage="Номенклатура не найдена"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Добавить номенклатуру">
        <div className="space-y-4">
          <Input
            label="Наименование *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Набор реагентов для..."
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Каталожный номер"
              value={form.catalog_number || ''}
              onChange={(e) => setForm({ ...form, catalog_number: e.target.value })}
            />
            <Input
              label="Производитель"
              value={form.manufacturer || ''}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Единица измерения"
              value={form.unit || ''}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <Input
              label="Срок годности (мес.)"
              type="number"
              value={form.shelf_life_months ?? ''}
              onChange={(e) => setForm({ ...form, shelf_life_months: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <Input
            label="Условия хранения"
            value={form.storage_conditions || ''}
            onChange={(e) => setForm({ ...form, storage_conditions: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Создать</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить номенклатуру?"
        message="Это действие нельзя отменить. Позиция будет удалена из справочника."
        confirmLabel="Удалить"
        isLoading={isDeleting}
      />
    </div>
  )
}
