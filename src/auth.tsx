import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { api, tokenStore } from './api'
import type { AuthResponse, User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  register: (fullName: string, email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }
    api<User>('/me', 'GET')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function handleAuth(res: AuthResponse) {
    tokenStore.set(res.token)
    // Fetch full capabilities (hasProviderProfile, approval, customer profile)
    // so the UI can gate correctly right after login/register.
    try {
      const full = await api<User>('/me', 'GET')
      setUser(full)
    } catch {
      setUser(res.user)
    }
  }

  const value: AuthState = {
    user,
    loading,
    register: async (fullName, email, password) => {
      const res = await api<AuthResponse>('/auth/register', 'POST', { fullName, email, password })
      await handleAuth(res)
    },
    login: async (email, password) => {
      const res = await api<AuthResponse>('/auth/login', 'POST', { email, password })
      await handleAuth(res)
    },
    logout: () => {
      tokenStore.clear()
      setUser(null)
    },
    // Re-fetch the current user (e.g. after gaining the PROVIDER role).
    refresh: async () => {
      const u = await api<User>('/me', 'GET')
      setUser(u)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
