import apiClient from "./client";

export interface DashboardStats {
  nomenclature: { active: number };
  suppliers: { active: number };
  equipment: { total: number; by_status: Record<string, number> };
  inventory: { total_quantity: number; by_status: Record<string, number>; expiring_30d: number };
  purchases: { total: number; by_status: Record<string, number> };
  offers: { total: number; by_status: Record<string, number> };
}

export interface InventoryTrend {
  period_days: number;
  receipts: { date: string; quantity: number }[];
  consumption: { date: string; quantity: number }[];
}

export interface PurchaseSummary {
  period_months: number;
  monthly: { month: string; count: number; total_estimated: number }[];
  top_nomenclature: { name: string; requests: number; estimated_total: number }[];
}

export const analyticsApi = {
  getDashboard: () => apiClient.get<DashboardStats>("/analytics/dashboard"),
  getInventoryTrend: (days = 30) =>
    apiClient.get<InventoryTrend>(`/analytics/inventory-trend?days=${days}`),
  getPurchaseSummary: (months = 6) =>
    apiClient.get<PurchaseSummary>(`/analytics/purchase-summary?months=${months}`),
};
