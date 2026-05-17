import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
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
import { suppliersApi } from '@/api/suppliers'
import type { Supplier, SupplierCreate } from '@/types'

const emptyForm: SupplierCreate = {
  name: '',
  inn: '',
  kpp: '',
  address: '',
  bank_details: '',
  contact_email: '',
  contact_phone: '',
  manager_name: '',
}

const PAGE_SIZE = 25

export function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<SupplierCreate>(emptyForm)
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
      const data = await suppliersApi.list({
        search: debouncedSearch || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить поставщиков')
      console.error('Failed to load suppliers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, currentPage, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    try {
      await suppliersApi.create(form)
      setIsModalOpen(false)
      setForm(emptyForm)
      loadData()
    } catch (err) {
      setError('Не удалось создать поставщика')
      console.error('Failed to create supplier:', err)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'name', header: 'Наименование' },
    { key: 'inn', header: 'ИНН', render: (item: Supplier) => item.inn || '—' },
    { key: 'manager_name', header: 'Контактное лицо', render: (item: Supplier) => item.manager_name || '—' },
    { key: 'contact_phone', header: 'Телефон', render: (item: Supplier) => item.contact_phone || '—' },
    { key: 'contact_email', header: 'Email', render: (item: Supplier) => item.contact_email || '—' },
    {
      key: 'is_active',
      header: 'Статус',
      render: (item: Supplier) => (
        <Badge variant={item.is_active ? 'success' : 'default'}>
          {item.is_active ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
  ]

  const exportData = items.map((i) => ({
    name: i.name,
    inn: i.inn || '',
    manager_name: i.manager_name || '',
    contact_phone: i.contact_phone || '',
    contact_email: i.contact_email || '',
    is_active: i.is_active ? 'Активен' : 'Неактивен',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Поставщики</h1>
          <p className="text-gray-500 mt-1">Справочник поставщиков лабораторных расходных материалов</p>
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
              placeholder="Поиск по названию, ИНН, контакту..."
            />
          </div>
          <ExportButton
            data={exportData}
            filename="suppliers"
            columns={[
              { key: 'name', header: 'Наименование' },
              { key: 'inn', header: 'ИНН' },
              { key: 'manager_name', header: 'Контактное лицо' },
              { key: 'contact_phone', header: 'Телефон' },
              { key: 'contact_email', header: 'Email' },
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
              emptyMessage="Поставщики не найдены"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Добавить поставщика" size="lg">
        <div className="space-y-4">
          <Input
            label="Наименование *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='ООО "Название"'
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="ИНН" value={form.inn || ''} onChange={(e) => setForm({ ...form, inn: e.target.value })} />
            <Input label="КПП" value={form.kpp || ''} onChange={(e) => setForm({ ...form, kpp: e.target.value })} />
          </div>
          <Input label="Адрес" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Банковские реквизиты" value={form.bank_details || ''} onChange={(e) => setForm({ ...form, bank_details: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Контактное лицо" value={form.manager_name || ''} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
            <Input label="Телефон" value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
