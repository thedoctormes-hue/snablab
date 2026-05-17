import client from './client'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<TokenResponse>('/users/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    client.post<User>('/users/register', data).then((r) => r.data),

  me: () =>
    client.get<User>('/users/me').then((r) => r.data),
}
