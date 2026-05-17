import client from './client'
import type { Nomenclature, NomenclatureCreate, NomenclatureUpdate, PaginatedResponse } from '@/types'

export const nomenclatureApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; manufacturer?: string; is_active?: boolean }) =>
    client.get<PaginatedResponse<Nomenclature>>('/nomenclature', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<Nomenclature>(`/nomenclature/${id}`).then((r) => r.data),

  create: (data: NomenclatureCreate) =>
    client.post<Nomenclature>('/nomenclature', data).then((r) => r.data),

  update: (id: number, data: NomenclatureUpdate) =>
    client.patch<Nomenclature>(`/nomenclature/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/nomenclature/${id}`),
}
