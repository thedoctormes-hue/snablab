import { useState, useEffect, useCallback } from 'react'
import { Search, TrendingUp, Zap, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Table } from '@/components/common/Table'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { PageSpinner } from '@/components/common/Spinner'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { Pagination } from '@/components/common/Pagination'
import { ExportButton } from '@/components/common/ExportButton'
import { govContractsApi } from '@/api/govContracts'
import type { GovContract, PriceAnalysisResponse, ZakupkiScanResponse } from '@/types'

// ── Scan Modal ─────────────────────────────────────────────

function ScanModal({ isOpen, onClose, onScanComplete }: { isOpen: boolean; onClose: () => void; onScanComplete: () => void }) {
  const [searchString, setSearchString] = useState('расходники для лаборатории')
  const [region, setRegion] = useState('')
  const [maxPages, setMaxPages] = useState(3)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ZakupkiScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)
    setScanResult(null)
    try {
      const result = await govContractsApi.scan({
        search_string: searchString,
        region: region || undefined,
        max_pages: maxPages,
        min_price: 1000,
      })
      setScanResult(result)
      onScanComplete()
    } catch (err) {
      setError('Ошибка при сканировании zakupki.gov.ru')
      console.error('Scan error:', err)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Сканировать госзакупки" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Поисковый запрос</label>
          <input
            type="text"
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
            placeholder="например: расходники для лаборатории"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Регион (код)</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="77 = Москва, 78 = СПб"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Макс. страниц</label>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {scanResult && (
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
            <h4 className="font-medium text-gray-900">Результаты сканирования</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{scanResult.total_found}</div>
                <div className="text-xs text-gray-500">Найдено</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{scanResult.profitable_count}</div>
                <div className="text-xs text-gray-500">Выгодных</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">{scanResult.message}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isScanning}>Закрыть</Button>
          <Button onClick={handleScan} disabled={isScanning || !searchString.trim()} isLoading={isScanning}>
            <Search className="h-4 w-4 mr-2" />
            {isScanning ? 'Сканирую...' : 'Сканировать'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Analysis Modal ─────────────────────────────────────────

function AnalysisModal({ contract, isOpen, onClose }: { contract: GovContract | null; isOpen: boolean; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<PriceAnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && contract) {
      setIsLoading(true)
      setError(null)
      govContractsApi.analyze(contract.id)
        .then(setAnalysis)
        .catch(() => setError('Ошибка анализа'))
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, contract])

  if (!contract) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ценовой анализ" size="lg">
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 line-clamp-2">{contract.subject}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{contract.price.toLocaleString('ru-RU')} ₽</p>
        </div>

        {isLoading && <div className="flex justify-center py-8"><PageSpinner /></div>}
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${analysis.best_margin >= 35 ? 'text-green-600' : analysis.best_margin >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                {analysis.best_margin.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Лучшая маржа</div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 text-sm">{analysis.recommendation}</div>

            {analysis.matches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Сравнение цен</h4>
                <div className="space-y-2">
                  {analysis.matches.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{m.source}</div>
                        <div className="text-xs text-gray-500">{m.product_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{m.market_price.toLocaleString('ru-RU')} ₽</div>
                        <div className={`text-xs font-medium ${m.profit_potential >= 25 ? 'text-green-600' : 'text-gray-500'}`}>
                          +{m.profit_potential.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Contract Detail ────────────────────────────────────────

function ContractDetail({ contract, onClose }: { contract: GovContract; onClose: () => void }) {
  const [showComparisons, setShowComparisons] = useState(false)

  return (
    <Modal isOpen={!!contract} onClose={onClose} title="Детали контракта" size="lg">
      {contract && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Рег. номер</label>
              <p className="text-sm font-medium">{contract.reg_number}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Цена</label>
              <p className="text-sm font-bold">{contract.price.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Заказчик</label>
              <p className="text-sm">{contract.customer || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Регион</label>
              <p className="text-sm">{contract.region || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Дата публикации</label>
              <p className="text-sm">{contract.publish_date || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Статус</label>
              <div>
                {contract.is_profitable ? (
                  <Badge variant="success">Выгодный</Badge>
                ) : (
                  <Badge variant="default">Обычный</Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Предмет</label>
            <p className="text-sm mt-1">{contract.subject}</p>
          </div>

          {contract.profit_margin != null && (
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Маржа: {contract.profit_margin.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {contract.price_comparisons.length > 0 && (
            <div>
              <button
                onClick={() => setShowComparisons(!showComparisons)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showComparisons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Сравнение цен ({contract.price_comparisons.length})
              </button>
              {showComparisons && (
                <div className="mt-2 space-y-2">
                  {contract.price_comparisons.map((pc) => (
                    <div key={pc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span>{pc.source}</span>
                      <span className="font-medium">{pc.market_price.toLocaleString('ru-RU')} ₽</span>
                      <span className={pc.profit_potential >= 25 ? 'text-green-600' : 'text-gray-500'}>
                        +{pc.profit_potential.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {contract.contract_url && (
            <a href={contract.contract_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              <ExternalLink className="h-3 w-3" />
              Открыть на zakupki.gov.ru
            </a>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────

export function GovContractsPage() {
  const [items, setItems] = useState<GovContract[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanOpen, setIsScanOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<GovContract | null>(null)
  const [analysisContract, setAnalysisContract] = useState<GovContract | null>(null)
  const [deleteContract, setDeleteContract] = useState<GovContract | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterProfitable, setFilterProfitable] = useState<boolean | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = { skip: (page - 1) * pageSize, limit: pageSize }
      if (filterProfitable !== null) params.is_profitable = filterProfitable
      const data = await govContractsApi.list(params as { skip?: number; limit?: number; is_profitable?: boolean })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить контракты')
      console.error('Failed to load contracts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterProfitable, page, pageSize])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async () => {
    if (!deleteContract) return
    try {
      await govContractsApi.delete(deleteContract.id)
      setDeleteContract(null)
      loadData()
    } catch {
      setError('Не удалось удалить контракт')
    }
  }

  const profitableCount = items.filter((c) => c.is_profitable).length
  const totalValue = items.reduce((sum, c) => sum + c.price, 0)
  const totalPages = Math.ceil(total / pageSize)

  const exportData = items.map((item) => ({
    'Рег. номер': item.reg_number,
    Предмет: item.subject,
    Заказчик: item.customer || '',
    Цена: item.price,
    Регион: item.region || '',
    Маржа: item.profit_margin != null ? `${item.profit_margin.toFixed(1)}%` : '',
    Статус: item.is_profitable ? 'Выгодный' : 'Обычный',
    'Дата публикации': item.publish_date || '',
    URL: item.contract_url || '',
  }))

  const columns = [
    {
      key: 'reg_number',
      header: 'Рег. номер',
      render: (item: GovContract) => (
        <span className="font-mono text-xs">{item.reg_number}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Предмет',
      render: (item: GovContract) => (
        <div className="max-w-xs truncate text-sm" title={item.subject}>
          {item.subject}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Заказчик',
      render: (item: GovContract) => (
        <div className="max-w-xs truncate text-sm text-gray-600" title={item.customer || ''}>
          {item.customer || '—'}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Цена',
      render: (item: GovContract) => (
        <span className="text-sm font-medium">{item.price.toLocaleString('ru-RU')} ₽</span>
      ),
    },
    {
      key: 'region',
      header: 'Регион',
      render: (item: GovContract) => item.region || '—',
    },
    {
      key: 'profit',
      header: 'Маржа',
      render: (item: GovContract) => {
        if (item.profit_margin == null) return '—'
        return (
          <span className={`text-sm font-medium ${item.profit_margin >= 35 ? 'text-green-600' : item.profit_margin >= 25 ? 'text-yellow-600' : 'text-gray-500'}`}>
            {item.profit_margin.toFixed(1)}%
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Статус',
      render: (item: GovContract) => (
        item.is_profitable
          ? <Badge variant="success">Выгодный</Badge>
          : <Badge variant="default">Обычный</Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Госзакупки</h1>
          <p className="text-gray-500 mt-1">Мониторинг и анализ закупок с zakupki.gov.ru</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={exportData} filename="gov_contracts" />
          <Button onClick={() => setIsScanOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Сканировать
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-gray-500">Всего контрактов</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{profitableCount}</div>
              <div className="text-xs text-gray-500">Выгодных</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {items.length > 0 ? (items.reduce((s, c) => s + (c.profit_margin || 0), 0) / items.filter((c) => c.profit_margin != null).length || 0).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-500">Средняя маржа</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{(totalValue / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-gray-500">Общая сумма (₽)</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filterProfitable === null ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => { setFilterProfitable(null); setPage(1) }}
        >
          Все
        </Button>
        <Button
          variant={filterProfitable === true ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => { setFilterProfitable(true); setPage(1) }}
        >
          Только выгодные
        </Button>
        <Button
          variant={filterProfitable === false ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => { setFilterProfitable(false); setPage(1) }}
        >
          Обычные
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table
              columns={columns}
              data={items}
              keyExtractor={(item) => item.id}
              emptyMessage="Контракты не найдены. Нажмите «Сканировать» для поиска."
              onRowClick={(item) => setSelectedContract(item)}
            />
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1) }}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modals */}
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanComplete={loadData}
      />

      {selectedContract && (
        <ContractDetail
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}

      <AnalysisModal
        contract={analysisContract}
        isOpen={!!analysisContract}
        onClose={() => setAnalysisContract(null)}
      />

      <ConfirmModal
        isOpen={!!deleteContract}
        onClose={() => setDeleteContract(null)}
        onConfirm={handleDelete}
        title="Удалить контракт?"
        message={`Контракт ${deleteContract?.reg_number} будет удалён.`}
      />
    </div>
  )
}
