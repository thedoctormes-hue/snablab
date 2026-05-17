import client from './client'
import type { Inventory, InventoryCreate, InventoryTransaction, InventoryTransactionCreate, PaginatedResponse } from '@/types'

export const inventoryApi = {
  list: (params?: { skip?: number; limit?: number; status?: string; nomenclature_id?: number; search?: string }) =>
    client.get<PaginatedResponse<Inventory>>('/inventory/', { params }).then((r) => r.data),

  create: (data: InventoryCreate) =>
    client.post<Inventory>('/inventory/', data).then((r) => r.data),

  createTransaction: (data: InventoryTransactionCreate) =>
    client.post<InventoryTransaction>('/inventory/transactions', data).then((r) => r.data),

  lowStock: (thresholdDays: number = 30) =>
    client.get<{ items: Inventory[]; total: number }>(`/inventory/low-stock?threshold_days=${thresholdDays}`).then((r) => r.data),
}
