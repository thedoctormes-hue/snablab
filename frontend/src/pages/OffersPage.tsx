import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { PageSpinner } from '@/components/common/Spinner'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { offersApi } from '@/api/offers'
import type { CommercialOffer } from '@/types'

const statusLabels: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  new: { label: 'Новое', variant: 'info' },
  parsed: { label: 'Распознано', variant: 'warning' },
  approved: { label: 'Одобрено', variant: 'success' },
  rejected: { label: 'Отклонено', variant: 'danger' },
}

const PAGE_SIZE = 25

export function OffersPage() {
  const [items, setItems] = useState<CommercialOffer[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const skip = (currentPage - 1) * pageSize
      const data = await offersApi.list({
        parsed_status: statusFilter || undefined,
        skip,
        limit: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить коммерческие предложения')
      console.error('Failed to load offers:', err)
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

  const handleUpload = async () => {
    if (!uploadFile) return
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      await offersApi.upload(formData)
      setIsUploadOpen(false)
      setUploadFile(null)
      loadData()
    } catch (err) {
      setError('Не удалось загрузить файл')
      console.error('Failed to upload:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'offer_number', header: '№ КП', render: (item: CommercialOffer) => item.offer_number || '—' },
    { key: 'supplier_id', header: 'ID поставщика', render: (item: CommercialOffer) => item.supplier_id },
    { key: 'offer_date', header: 'Дата', render: (item: CommercialOffer) => item.offer_date || '—' },
    { key: 'total_amount', header: 'Сумма', render: (item: CommercialOffer) => item.total_amount ? `${item.total_amount} ₽` : '—' },
    {
      key: 'parsed_status',
      header: 'Статус',
      render: (item: CommercialOffer) => {
        const s = statusLabels[item.parsed_status] || { label: item.parsed_status, variant: 'default' as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
  ]

  const exportData = items.map((i) => ({
    offer_number: i.offer_number || '',
    supplier_id: i.supplier_id,
    offer_date: i.offer_date || '',
    total_amount: i.total_amount || '',
    parsed_status: statusLabels[i.parsed_status]?.label || i.parsed_status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Коммерческие предложения</h1>
          <p className="text-gray-500 mt-1">Загрузка и парсинг КП от поставщиков</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Загрузить КП
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
            <option value="new">Новое</option>
            <option value="parsed">Распознано</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
          </select>
          <div className="flex-1" />
          <ExportButton
            data={exportData}
            filename="offers"
            columns={[
              { key: 'offer_number', header: '№ КП' },
              { key: 'supplier_id', header: 'ID поставщика' },
              { key: 'offer_date', header: 'Дата' },
              { key: 'total_amount', header: 'Сумма' },
              { key: 'parsed_status', header: 'Статус' },
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
              emptyMessage="Коммерческие предложения не найдены"
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

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Загрузить коммерческое предложение">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            {uploadFile ? (
              <div>
                <p className="text-sm font-medium text-gray-700">{uploadFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Перетащите файл сюда или</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX</p>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="mt-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsUploadOpen(false)}>Отмена</Button>
            <Button onClick={handleUpload} disabled={!uploadFile} isLoading={isUploading}>
              Загрузить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
