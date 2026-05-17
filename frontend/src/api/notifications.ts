import client from './client'

export const notificationsApi = {
  test: (message?: string) =>
    client.post<{ status: string; message?: string; reason?: string }>('/notifications/test', null, {
      params: message ? { message } : undefined,
    }).then((r) => r.data),

  lowStockCheck: (thresholdDays: number = 30) =>
    client.post<{ status: string; message: string }>('/notifications/low-stock-check', null, {
      params: { threshold_days: thresholdDays },
    }).then((r) => r.data),

  expiryCheck: (days: number = 30) =>
    client.post<{ status: string; message: string }>('/notifications/expiry-check', null, {
      params: { days },
    }).then((r) => r.data),

  status: () =>
    client.get<{ telegram: { configured: boolean; chat_configured: boolean } }>('/notifications/status').then((r) => r.data),
}
