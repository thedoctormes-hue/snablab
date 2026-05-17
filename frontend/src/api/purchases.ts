import client from './client'
import type { PurchaseRequest, PurchaseRequestCreate, PurchaseRequestUpdate, PaginatedResponse } from '@/types'

export const purchasesApi = {
  list: (params?: { skip?: number; limit?: number; status?: string; nomenclature_id?: number }) =>
    client.get<PaginatedResponse<PurchaseRequest>>('/purchases', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<PurchaseRequest>(`/purchases/${id}`).then((r) => r.data),

  create: (data: PurchaseRequestCreate) =>
    client.post<PurchaseRequest>('/purchases', data).then((r) => r.data),

  update: (id: number, data: PurchaseRequestUpdate) =>
    client.patch<PurchaseRequest>(`/purchases/${id}`, data).then((r) => r.data),

  approve: (id: number) =>
    client.post<PurchaseRequest>(`/purchases/${id}/approve`).then((r) => r.data),
}
