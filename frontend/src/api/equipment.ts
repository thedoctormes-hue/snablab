import client from './client'
import type { Equipment, EquipmentCreate, EquipmentUpdate, PaginatedResponse } from '@/types'

export const equipmentApi = {
  list: async (params?: {
    status?: string
    department?: string
    search?: string
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Equipment>> => {
    const { data } = await client.get('/equipment', { params })
    return data
  },

  get: async (id: number): Promise<Equipment> => {
    const { data } = await client.get(`/equipment/${id}`)
    return data
  },

  create: async (form: EquipmentCreate): Promise<Equipment> => {
    const { data } = await client.post('/equipment', form)
    return data
  },

  update: async (id: number, form: EquipmentUpdate): Promise<Equipment> => {
    const { data } = await client.patch(`/equipment/${id}`, form)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/equipment/${id}`)
  },
}
