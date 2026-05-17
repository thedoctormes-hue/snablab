import client from './client'
import type { FedLabContent, FedLabSearchResponse, PaginatedResponse } from '@/types'

export const fedlabApi = {
  list: (params?: { skip?: number; limit?: number; content_type?: string; category?: string; city?: string; year?: number; query?: string }) =>
    client.get<PaginatedResponse<FedLabContent>>('/fedlab/', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<FedLabContent>(`/fedlab/${id}`).then((r) => r.data),

  upcoming: (limit?: number) =>
    client.get<PaginatedResponse<FedLabContent>>('/fedlab/upcoming', { params: { limit } }).then((r) => r.data),

  categories: () =>
    client.get<string[]>('/fedlab/categories').then((r) => r.data),

  contentTypes: () =>
    client.get<string[]>('/fedlab/content-types').then((r) => r.data),

  search: (query: string, limit = 20) =>
    client.post<FedLabSearchResponse>('/fedlab/search', { query, limit }).then((r) => r.data),

  seed: () =>
    client.post('/fedlab/seed').then((r) => r.data),
}
