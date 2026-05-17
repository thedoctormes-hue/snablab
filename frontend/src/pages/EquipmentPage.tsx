import { useState, useEffect, useCallback } from 'react'
import { Plus, Monitor, Wrench, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { SkeletonTable } from '@/components/common/Skeleton'
import { SearchBar } from '@/components/common/SearchBar'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { equipmentApi } from '@/api/equipment'
import { useToastStore } from '@/store/toastStore'
import type { Equipment, EquipmentCreate } from '@/types'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: typeof Monitor }> = {
  active: { label: 'Активно', variant: 'success', icon: CheckCircle },
  maintenance: { label: 'На обслуживании', variant: 'warning', icon: Wrench },
  repair: { label: 'В ремонте', variant: 'danger', icon: Wrench },
  decommissioned: { label: 'Списано', variant: 'default', icon: XCircle },
}

const emptyForm: EquipmentCreate = {
  name: '',
  status: 'active',
}

const PAGE_SIZE = 25

export function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EquipmentCreate>(emptyForm)
  const { success, error: toastError } = useToastStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const skip = (currentPage - 1) * pageSize
      const data = await equipmentApi.list({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch {
      toastError('Не удалось загрузить список оборудования')
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
    if (!form.name.trim()) {
      toastError('Укажите название оборудования')
      return
    }
    try {
      if (editingId) {
        await equipmentApi.update(editingId, form)
        success('Оборудование обновлено')
      } else {
        await equipmentApi.create(form)
        success('Оборудование добавлено')
      }
      setIsModalOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      loadData()
    } catch {
      toastError(editingId ? 'Не удалось обновить оборудование' : 'Не удалось добавить оборудование')
    }
  }

  const handleEdit = (item: Equipment) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      equipment_type: item.equipment_type || undefined,
      manufacturer: item.manufacturer || undefined,
      model: item.model || undefined,
      serial_number: item.serial_number || undefined,
      department: item.department || undefined,
      location: item.location || undefined,
      status: item.status,
      notes: item.notes || undefined,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Списать оборудование?')) return
    try {
      await equipmentApi.delete(id)
      success('Оборудование списано')
      loadData()
    } catch {
      toastError('Не удалось списать оборудование')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'id', header: 'ID', className: 'w-16' },
    {
      key: 'name',
      header: 'Название',
      render: (item: Equipment) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          {item.model && <p className="text-xs text-gray-500">{item.manufacturer} {item.model}</p>}
        </div>
      ),
    },
    { key: 'department', header: 'Подразделение', render: (item: Equipment) => item.department || '—' },
    { key: 'serial_number', header: 'Серийный №', render: (item: Equipment) => item.serial_number || '—' },
    {
      key: 'status',
      header: 'Статус',
      render: (item: Equipment) => {
        const s = statusConfig[item.status] || { label: item.status, variant: 'default' as const, icon: Monitor }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (item: Equipment) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleEdit(item)}
            className="text-xs text-primary-600 hover:text-primary-800"
          >
            Изменить
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Списать
          </button>
        </div>
      ),
    },
  ]

  const exportData = items.map((i) => ({
    id: i.id,
    name: i.name,
    equipment_type: i.equipment_type || '',
    manufacturer: i.manufacturer || '',
    model: i.model || '',
    serial_number: i.serial_number || '',
    department: i.department || '',
    location: i.location || '',
    status: statusConfig[i.status]?.label || i.status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оборудование</h1>
          <p className="text-gray-500 mt-1">Учёт лабораторного оборудования</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setIsModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего', value: total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Активно', value: items.filter(i => i.status === 'active').length, color: 'bg-green-50 text-green-700' },
          { label: 'На обслуживании', value: items.filter(i => i.status === 'maintenance').length, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'В ремонте', value: items.filter(i => i.status === 'repair').length, color: 'bg-red-50 text-red-700' },
        ].map((stat) => (
          <Card key={stat.label} className={stat.color}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm opacity-80">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Поиск по названию, модели, серийному номеру..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            <option value="">Все статусы</option>
            <option value="active">Активно</option>
            <option value="maintenance">На обслуживании</option>
            <option value="repair">В ремонте</option>
            <option value="decommissioned">Списано</option>
          </select>
          <ExportButton
            data={exportData}
            filename="equipment"
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Название' },
              { key: 'equipment_type', header: 'Тип' },
              { key: 'manufacturer', header: 'Производитель' },
              { key: 'model', header: 'Модель' },
              { key: 'serial_number', header: 'Серийный №' },
              { key: 'department', header: 'Подразделение' },
              { key: 'location', header: 'Местоположение' },
              { key: 'status', header: 'Статус' },
            ]}
          />
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                data={items}
                keyExtractor={(item) => item.id}
                emptyMessage="Оборудование не найдено"
              />
            </div>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingId(null); setForm(emptyForm) }}
        title={editingId ? 'Редактировать оборудование' : 'Добавить оборудование'}
      >
        <div className="space-y-4">
          <Input label="Название *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Анализатор Sysmex XN-1000" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Тип оборудования" value={form.equipment_type || ''} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })} placeholder="Гематологический анализатор" />
            <Input label="Производитель" value={form.manufacturer || ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Sysmex" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Модель" value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="XN-1000" />
            <Input label="Серийный номер" value={form.serial_number || ''} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="SN-2026-001" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Подразделение" value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="КДЛ" />
            <Input label="Местоположение" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Каб. 205" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="active">Активно</option>
              <option value="maintenance">На обслуживании</option>
              <option value="repair">В ремонте</option>
              <option value="decommissioned">Списано</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Дата ввода в эксплуатацию" type="date" value={form.commission_date || ''} onChange={(e) => setForm({ ...form, commission_date: e.target.value })} />
            <Input label="Следующее ТО" type="date" value={form.next_maintenance || ''} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
            <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Дополнительная информация..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); setEditingId(null) }}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>{editingId ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
