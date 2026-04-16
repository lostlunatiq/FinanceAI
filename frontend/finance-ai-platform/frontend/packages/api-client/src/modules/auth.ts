import { api, tokenStore } from '../http'
import type { User, AuthTokens, LoginResult, MfaSetupResponse } from '@finance-ai/core'

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const data = await api.post<
      | { mfaRequired: true; challengeId: string }
      | { mfaRequired: false; user: User; tokens: AuthTokens }
    >('/auth/login', { email, password })

    if ('mfaRequired' in data && data.mfaRequired) {
      return { mfaRequired: true, challengeId: data.challengeId }
    }
    const ok = data as { mfaRequired: false; user: User; tokens: AuthTokens }
    tokenStore.set(ok.tokens)
    return { mfaRequired: false, user: ok.user, tokens: ok.tokens }
  },

  async verifyMfa(challengeId: string, totp: string): Promise<{ user: User; tokens: AuthTokens }> {
    const data = await api.post<{ user: User; tokens: AuthTokens }>('/auth/mfa/verify', { challengeId, totp })
    tokenStore.set(data.tokens)
    return data
  },

  async setupMfa(): Promise<MfaSetupResponse> {
    return api.post<MfaSetupResponse>('/auth/mfa/setup')
  },

  async enableMfa(totp: string): Promise<void> {
    await api.post<void>('/auth/mfa/enable', { totp })
  },

  async disableMfa(totp: string): Promise<void> {
    await api.post<void>('/auth/mfa/disable', { totp })
  },

  async refresh(): Promise<AuthTokens> {
    const current = tokenStore.get()
    if (!current?.refreshToken) throw new Error('No refresh token')
    const data = await api.post<AuthTokens>('/auth/refresh', { refreshToken: current.refreshToken })
    tokenStore.set(data)
    return data
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout')
    } finally {
      tokenStore.set(null)
    }
  },

  async me(): Promise<User> {
    return api.get<User>('/me')
  },

  async updateMe(patch: Partial<Pick<User, 'firstName' | 'lastName' | 'department'>>): Promise<User> {
    return api.patch<User>('/me', patch)
  },

  async changePassword(current: string, next: string): Promise<void> {
    await api.post<void>('/me/change-password', { current, next })
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post<void>('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post<void>('/auth/reset-password', { token, newPassword })
  }
}
