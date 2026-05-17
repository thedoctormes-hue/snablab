import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { PageSpinner } from '@/components/common/Spinner'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { purchasesApi } from '@/api/purchases'
import type { PurchaseRequest, PurchaseRequestCreate } from '@/types'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  draft: { label: 'Черновик', variant: 'default' },
  pending: { label: 'На согласовании', variant: 'warning' },
  approved: { label: 'Одобрено', variant: 'info' },
  ordered: { label: 'Заказано', variant: 'success' },
  received: { label: 'Получено', variant: 'success' },
  cancelled: { label: 'Отменено', variant: 'danger' },
}

const emptyForm: PurchaseRequestCreate = {
  nomenclature_id: 0,
}

const PAGE_SIZE = 25

export function PurchasesPage() {
  const [items, setItems] = useState<PurchaseRequest[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<PurchaseRequestCreate>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const skip = (currentPage - 1) * pageSize
      const data = await purchasesApi.list({
        status: statusFilter || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить заявки на закупку')
      console.error('Failed to load purchases:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, currentPage, pageSize])

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
      await purchasesApi.create(form)
      setIsModalOpen(false)
      setForm(emptyForm)
      loadData()
    } catch (err) {
      setError('Не удалось создать заявку')
      console.error('Failed to create purchase:', err)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await purchasesApi.approve(id)
      loadData()
    } catch (err) {
      setError('Не удалось согласовать заявку')
      console.error('Failed to approve:', err)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'request_number', header: '№ заявки', render: (item: PurchaseRequest) => item.request_number || `PR-${item.id}` },
    { key: 'nomenclature_id', header: 'ID номенклатуры' },
    { key: 'quantity', header: 'Кол-во', render: (item: PurchaseRequest) => item.quantity ? `${item.quantity} ${item.unit || ''}` : '—' },
    { key: 'estimated_price', header: 'Цена', render: (item: PurchaseRequest) => item.estimated_price ? `${item.estimated_price} ₽` : '—' },
    { key: 'created_at', header: 'Дата создания' },
    {
      key: 'status',
      header: 'Статус',
      render: (item: PurchaseRequest) => {
        const s = statusConfig[item.status] || { label: item.status, variant: 'default' as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (item: PurchaseRequest) => (
        item.status === 'pending' ? (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(item.id) }}>
            Согласовать
          </Button>
        ) : null
      ),
    },
  ]

  const exportData = items.map((i) => ({
    id: i.id,
    request_number: i.request_number || `PR-${i.id}`,
    nomenclature_id: i.nomenclature_id,
    quantity: i.quantity || '',
    unit: i.unit || '',
    estimated_price: i.estimated_price || '',
    status: statusConfig[i.status]?.label || i.status,
    created_at: i.created_at,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Закупки</h1>
          <p className="text-gray-500 mt-1">Заявки на закупку и согласование</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая заявка
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-danger text-sm">{error}</div>
      )}

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            <option value="">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="pending">На согласовании</option>
            <option value="approved">Одобрено</option>
            <option value="ordered">Заказано</option>
            <option value="received">Получено</option>
            <option value="cancelled">Отменено</option>
          </select>
          <div className="flex-1" />
          <ExportButton
            data={exportData}
            filename="purchases"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'request_number', header: '№ заявки' },
              { key: 'nomenclature_id', header: 'ID номенклатуры' },
              { key: 'quantity', header: 'Кол-во' },
              { key: 'unit', header: 'Ед. изм.' },
              { key: 'estimated_price', header: 'Цена' },
              { key: 'status', header: 'Статус' },
              { key: 'created_at', header: 'Дата создания' },
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
              emptyMessage="Заявки не найдены"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая заявка на закупку">
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
              value={form.quantity ?? ''}
              onChange={(e) => setForm({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Input
              label="Ед. изм."
              value={form.unit || ''}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <Input
            label="Ориентировочная цена"
            type="number"
            value={form.estimated_price ?? ''}
            onChange={(e) => setForm({ ...form, estimated_price: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Input
            label="ID поставщика"
            type="number"
            value={form.supplier_id ?? ''}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Input
            label="Номер заявки"
            value={form.request_number || ''}
            onChange={(e) => setForm({ ...form, request_number: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!form.nomenclature_id}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
