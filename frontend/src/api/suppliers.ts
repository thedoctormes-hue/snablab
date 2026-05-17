import client from './client'
import type { Supplier, SupplierCreate, SupplierUpdate, PaginatedResponse } from '@/types'

export const suppliersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    client.get<PaginatedResponse<Supplier>>('/suppliers/', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),

  create: (data: SupplierCreate) =>
    client.post<Supplier>('/suppliers/', data).then((r) => r.data),

  update: (id: number, data: SupplierUpdate) =>
    client.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
}
