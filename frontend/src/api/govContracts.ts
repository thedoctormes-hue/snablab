import client from './client'
import type {
  GovContract,
  PriceAnalysisResponse,
  ZakupkiScanRequest,
  ZakupkiScanResponse,
  PaginatedResponse,
} from '@/types'

export const govContractsApi = {
  list: (params?: { skip?: number; limit?: number; region?: string; is_profitable?: boolean; min_price?: number; max_price?: number }) =>
    client.get<PaginatedResponse<GovContract>>('/gov-contracts/', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<GovContract>(`/gov-contracts/${id}`).then((r) => r.data),

  create: (data: Partial<GovContract>) =>
    client.post<GovContract>('/gov-contracts/', data).then((r) => r.data),

  update: (id: number, data: Partial<GovContract>) =>
    client.patch<GovContract>(`/gov-contracts/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/gov-contracts/${id}`).then((r) => r.data),

  analyze: (id: number) =>
    client.post<PriceAnalysisResponse>(`/gov-contracts/${id}/analyze`).then((r) => r.data),

  analyzePrice: (subject: string, price: number, region?: string) =>
    client.post<PriceAnalysisResponse>('/gov-contracts/analyze/price', { subject, price, region: region || '' }).then((r) => r.data),

  scan: (data: ZakupkiScanRequest) =>
    client.post<ZakupkiScanResponse>('/gov-contracts/scan', data).then((r) => r.data),

  profitable: (params?: { min_margin?: number; limit?: number }) =>
    client.get<PaginatedResponse<GovContract>>('/gov-contracts/profitable', { params }).then((r) => r.data),
}
