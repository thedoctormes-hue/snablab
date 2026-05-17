import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Calendar, FileText, Shield, Award, Download, ExternalLink, Eye } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageSpinner } from '@/components/common/Spinner'
import { Pagination } from '@/components/common/Pagination'
import { SearchBar } from '@/components/common/SearchBar'
import { ExportButton } from '@/components/common/ExportButton'
import { fedlabApi } from '@/api/fedlab'
import type { FedLabContent } from '@/types'

const contentTypeLabels: Record<string, { label: string; icon: typeof Calendar }> = {
  event: { label: 'Мероприятие', icon: Calendar },
  news: { label: 'Новость', icon: FileText },
  document: { label: 'Документ', icon: BookOpen },
  gost: { label: 'ГОСТ', icon: Award },
  regulation: { label: 'Норматив', icon: Shield },
}

const categoryColors: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  'ГОСТ': 'info',
  'ПЗИ/ПБ': 'danger',
  'PCR': 'success',
  'микробиология': 'warning',
  'безопасность': 'danger',
}

export function FedLabPage() {
  const [items, setItems] = useState<FedLabContent[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FedLabContent[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = { skip: (page - 1) * pageSize, limit: pageSize }
      if (filterType) params.content_type = filterType
      if (filterCategory) params.category = filterCategory
      const data = await fedlabApi.list(params)
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить данные')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [filterType, filterCategory, page, pageSize])

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fedlabApi.categories()
      setCategories(cats)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadCategories() }, [loadCategories])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const result = await fedlabApi.search(searchQuery)
      setSearchResults(result.results)
    } catch {
      setError('Ошибка поиска')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSeed = async () => {
    try {
      await fedlabApi.seed()
      loadData()
    } catch {
      setError('Ошибка загрузки из FedLab')
    }
  }

  const displayItems = searchResults ?? items
  const totalPages = Math.ceil(total / pageSize)

  const exportData = displayItems.map((item) => ({
    ID: item.id,
    Тип: contentTypeLabels[item.content_type]?.label || item.content_type,
    Заголовок: item.title,
    Категория: item.category || '',
    Город: item.city || '',
    Месяц: item.month || '',
    Год: item.year || '',
    Онлайн: item.is_online ? 'Да' : 'Нет',
    Просмотры: item.view_count || 0,
    URL: item.url || '',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">База знаний FedLab</h1>
          <p className="text-gray-500 mt-1">Нормативная документация, мероприятия, новости лабораторной медицины</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={exportData} filename="fedlab" />
          <Button onClick={handleSeed} variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Загрузить из FedLab
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск: ГОСТ, ПБ, PCR, микробиология..."
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Ищу...' : 'Найти'}
        </Button>
      </div>

      {searchResults && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Результаты поиска: {searchResults.length}</span>
          <Button variant="secondary" size="sm" onClick={() => { setSearchResults(null); setSearchQuery('') }}>
            Сбросить
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filterType === null ? 'primary' : 'secondary'} size="sm" onClick={() => { setFilterType(null); setPage(1) }}>
          Все
        </Button>
        {Object.entries(contentTypeLabels).map(([key, { label }]) => (
          <Button key={key} variant={filterType === key ? 'primary' : 'secondary'} size="sm"
            onClick={() => { setFilterType(filterType === key ? null : key); setPage(1) }}>
            {label}
          </Button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Категории:</span>
          <Button variant={filterCategory === null ? 'primary' : 'secondary'} size="sm"
            onClick={() => { setFilterCategory(null); setPage(1) }}>
            Все
          </Button>
          {categories.map((cat) => (
            <Button key={cat} variant={filterCategory === cat ? 'primary' : 'secondary'} size="sm"
              onClick={() => { setFilterCategory(filterCategory === cat ? null : cat); setPage(1) }}>
              {cat}
            </Button>
          ))}
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Content Grid */}
      {isLoading ? (
        <PageSpinner />
      ) : displayItems.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">База знаний пуста</p>
          <p className="text-sm text-gray-400 mt-1">Нажмите «Загрузить из FedLab» для импорта мероприятий</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayItems.map((item) => (
            <FedLabCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!searchResults && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Всего: {total}</div>
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

      {searchResults && <div className="text-sm text-gray-500">Всего: {total}</div>}
    </div>
  )
}

function FedLabCard({ item }: { item: FedLabContent }) {
  const typeInfo = contentTypeLabels[item.content_type] || { label: item.content_type, icon: FileText }
  const Icon = typeInfo.icon

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Badge variant="default" className="text-xs">{typeInfo.label}</Badge>
          </div>
          {item.view_count > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.view_count}
            </span>
          )}
        </div>

        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">{item.title}</h3>

        {item.summary && (
          <p className="text-xs text-gray-500 line-clamp-3">{item.summary}</p>
        )}

        {item.content && !item.summary && (
          <p className="text-xs text-gray-500 line-clamp-3">{item.content.substring(0, 200)}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {item.category && (
            <Badge variant={categoryColors[item.category] || 'default'} className="text-xs">
              {item.category}
            </Badge>
          )}
          {item.is_online && (
            <Badge variant="info" className="text-xs">Онлайн</Badge>
          )}
          {item.city && (
            <Badge variant="default" className="text-xs">📍 {item.city}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{item.month || ''} {item.year || ''}</span>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Источник
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}
