import client from './client'
import type { CommercialOffer, PaginatedResponse } from '@/types'

export const offersApi = {
  list: (params?: { skip?: number; limit?: number; supplier_id?: number; parsed_status?: string }) =>
    client.get<PaginatedResponse<CommercialOffer>>('/offers/', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<CommercialOffer>(`/offers/${id}`).then((r) => r.data),

  upload: (formData: FormData, supplierId?: number) => {
    const params = supplierId ? `?supplier_id=${supplierId}` : ''
    return client.post(`/parser/upload${params}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  parse: (formData: FormData) =>
    client.post('/parser/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
}
