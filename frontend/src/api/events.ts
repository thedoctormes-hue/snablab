import client from './client'
import type { LabEvent, EventSearchResponse, PaginatedResponse } from '@/types'

export const eventsApi = {
  list: (params?: { skip?: number; limit?: number; city?: string; event_type?: string; year?: number; is_online?: boolean }) =>
    client.get<PaginatedResponse<LabEvent>>('/events/', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<LabEvent>(`/events/${id}`).then((r) => r.data),

  upcoming: (limit?: number) =>
    client.get<PaginatedResponse<LabEvent>>('/events/upcoming', { params: { limit } }).then((r) => r.data),

  byMonth: (month: string, year?: number) =>
    client.get<PaginatedResponse<LabEvent>>(`/events/by-month/${month}`, { params: year ? { year } : {} }).then((r) => r.data),

  search: (query: string, limit = 10) =>
    client.post<EventSearchResponse>('/events/search', { query, limit }).then((r) => r.data),

  seed: () =>
    client.post('/events/seed').then((r) => r.data),
}
