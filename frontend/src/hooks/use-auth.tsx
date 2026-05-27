'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearSession, getStoredToken, getStoredUser, type StoredUser } from '@/lib/api-client'
import { applyAppearancePreferences, readAppearancePreferences } from '@/lib/appearance'
import type { LoginRequest } from '@/types/complaint'

interface AuthContextValue {
  token: string | null
  user: StoredUser | null
  isAuthenticated: boolean
  login: (body: LoginRequest) => Promise<StoredUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    setToken(getStoredToken())
    setUser(getStoredUser())
    const { theme, font } = readAppearancePreferences()
    applyAppearancePreferences(theme, font)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    async login(body) {
      const response = await api.login(body)
      const stored: StoredUser = {
        role: response.role,
        user_id: response.user_id,
        name: response.name,
        email: body.email,
        expires_at: response.expires_at,
      }
      setToken(response.access_token)
      setUser(stored)
      return stored
    },
    logout() {
      clearSession()
      setToken(null)
      setUser(null)
    },
  }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
