import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { PageSpinner } from '@/components/common/Spinner'
import { SearchBar } from '@/components/common/SearchBar'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { inventoryApi } from '@/api/inventory'
import type { Inventory, InventoryCreate } from '@/types'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  in_stock: { label: 'В наличии', variant: 'success' },
  low: { label: 'Мало', variant: 'warning' },
  expired: { label: 'Истёк срок', variant: 'danger' },
  depleted: { label: 'Израсходовано', variant: 'default' },
}

const emptyForm: InventoryCreate = {
  nomenclature_id: 0,
  quantity: 0,
  unit: 'шт',
}

const PAGE_SIZE = 25

export function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<InventoryCreate>(emptyForm)
  const [error, setError] = useState<string | null>(null)

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
      const data = await inventoryApi.list({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить складские остатки')
      console.error('Failed to load inventory:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, debouncedSearch, currentPage, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleCreate = async () => {
    if (!form.nomenclature_id) {
      setError('Укажите ID номенклатуры')
      return
    }
    try {
      await inventoryApi.create(form)
      setIsModalOpen(false)
      setForm(emptyForm)
      loadData()
    } catch (err) {
      setError('Не удалось добавить позицию на склад')
      console.error('Failed to create inventory:', err)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nomenclature_id', header: 'ID номенклатуры' },
    { key: 'batch_number', header: 'Партия', render: (item: Inventory) => item.batch_number || '—' },
    { key: 'quantity', header: 'Количество', render: (item: Inventory) => `${item.quantity} ${item.unit}` },
    { key: 'expiry_date', header: 'Срок годности', render: (item: Inventory) => item.expiry_date || '—' },
    { key: 'received_date', header: 'Дата поступления', render: (item: Inventory) => item.received_date || '—' },
    {
      key: 'status',
      header: 'Статус',
      render: (item: Inventory) => {
        const s = statusConfig[item.status] || { label: item.status, variant: 'default' as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
  ]

  const exportData = items.map((i) => ({
    id: i.id,
    nomenclature_id: i.nomenclature_id,
    batch_number: i.batch_number || '',
    quantity: i.quantity,
    unit: i.unit,
    expiry_date: i.expiry_date || '',
    received_date: i.received_date || '',
    status: statusConfig[i.status]?.label || i.status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Складской учёт</h1>
          <p className="text-gray-500 mt-1">Остатки, партии, сроки годности</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Поступление
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-danger text-sm">{error}</div>
      )}

      <Card className="border-warning bg-amber-50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="text-sm font-medium text-amber-800">Контроль сроков годности</p>
            <p className="text-xs text-amber-600 mt-0.5">Автоматический мониторинг истекающих партий</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Поиск по партии..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            <option value="">Все статусы</option>
            <option value="in_stock">В наличии</option>
            <option value="low">Мало</option>
            <option value="expired">Истёк срок</option>
            <option value="depleted">Израсходовано</option>
          </select>
          <ExportButton
            data={exportData}
            filename="inventory"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'nomenclature_id', header: 'ID номенклатуры' },
              { key: 'batch_number', header: 'Партия' },
              { key: 'quantity', header: 'Количество' },
              { key: 'unit', header: 'Ед. изм.' },
              { key: 'expiry_date', header: 'Срок годности' },
              { key: 'received_date', header: 'Дата поступления' },
              { key: 'status', header: 'Статус' },
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
              emptyMessage="Склад пуст"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Поступление на склад">
        <div className="space-y-4">
          <Input
            label="ID номенклатуры *"
            type="number"
            value={form.nomenclature_id || ''}
            onChange={(e) => setForm({ ...form, nomenclature_id: Number(e.target.value) })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Количество"
              type="number"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
            <Input
              label="Ед. изм."
              value={form.unit || ''}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <Input
            label="Номер партии"
            value={form.batch_number || ''}
            onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата поступления"
              type="date"
              value={form.received_date || ''}
              onChange={(e) => setForm({ ...form, received_date: e.target.value })}
            />
            <Input
              label="Срок годности"
              type="date"
              value={form.expiry_date || ''}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!form.nomenclature_id}>Добавить</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
