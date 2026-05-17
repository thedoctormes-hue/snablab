import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, MapPin, Globe, Download, Clock, Tag } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageSpinner } from '@/components/common/Spinner'
import { eventsApi } from '@/api/events'
import type { LabEvent } from '@/types'

const eventTypeLabels: Record<string, string> = {
  conference: 'Конференция',
  forum: 'Форум',
  exhibition: 'Выставка',
  webinar: 'Вебинар',
  summit: 'Саммит',
  congress: 'Конгресс',
  workshop: 'Практикум',
  other: 'Другое',
}

const eventTypeColors: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  conference: 'info',
  forum: 'success',
  exhibition: 'warning',
  webinar: 'info',
  summit: 'danger',
  congress: 'info',
  workshop: 'default',
  other: 'default',
}

export function EventsPage() {
  const [events, setEvents] = useState<LabEvent[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LabEvent[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (filterType) params.event_type = filterType
      const data = await eventsApi.list(params)
      setEvents(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Не удалось загрузить мероприятия')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [filterType])

  useEffect(() => { loadEvents() }, [loadEvents])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const result = await eventsApi.search(searchQuery)
      setSearchResults(result.results)
    } catch {
      setError('Ошибка поиска')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSeed = async () => {
    try {
      await eventsApi.seed()
      loadEvents()
    } catch {
      setError('Ошибка загрузки из FedLab')
    }
  }

  const displayEvents = searchResults ?? events

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мероприятия отрасли</h1>
          <p className="text-gray-500 mt-1">Конференции, форумы и выставки лабораторной медицины</p>
        </div>
        <Button onClick={handleSeed} variant="secondary">
          <Download className="h-4 w-4 mr-2" />
          Загрузить из FedLab
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск: КЛФ, форум, Москва..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Ищу...' : 'Найти'}
        </Button>
        {searchResults && (
          <Button variant="secondary" onClick={() => { setSearchResults(null); setSearchQuery('') }}>
            Сбросить
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filterType === null ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterType(null)}
        >
          Все
        </Button>
        {Object.entries(eventTypeLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={filterType === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType(filterType === key ? null : key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Events Grid */}
      {isLoading ? (
        <PageSpinner />
      ) : displayEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Мероприятия не найдены</p>
          <p className="text-sm text-gray-400 mt-1">Нажмите «Загрузить из FedLab» для импорта</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500">Всего: {total}</div>
    </div>
  )
}

function EventCard({ event }: { event: LabEvent }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 text-sm leading-tight">{event.title}</h3>
          {event.is_online && (
            <Badge variant="info" className="flex-shrink-0">
              <Globe className="h-3 w-3 mr-1" />
              Онлайн
            </Badge>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {event.event_type && (
            <Badge variant={eventTypeColors[event.event_type] || 'default'}>
              <Tag className="h-3 w-3 mr-1" />
              {eventTypeLabels[event.event_type] || event.event_type}
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          {event.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.city}
            </div>
          )}
          {event.month && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {event.month} {event.year || ''}
            </div>
          )}
          {event.start_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.start_date}
              {event.end_date && event.end_date !== event.start_date && ` — ${event.end_date}`}
            </div>
          )}
        </div>

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
          >
            Подробнее →
          </a>
        )}
      </div>
    </Card>
  )
}
