import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { api, adminTokenStore } from './api'
import type { AdminAuthResponse, AdminUser } from './types'

const ADMIN_INFO_KEY = 'jobby_admin_info'

interface AdminAuthState {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateAdmin: (admin: AdminUser) => void
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = adminTokenStore.get()
    const info = localStorage.getItem(ADMIN_INFO_KEY)
    if (token && info) {
      try {
        setAdmin(JSON.parse(info) as AdminUser)
      } catch {
        adminTokenStore.clear()
        localStorage.removeItem(ADMIN_INFO_KEY)
      }
    }
    setLoading(false)
  }, [])

  const value: AdminAuthState = {
    admin,
    loading,
    login: async (email, password) => {
      const res = await api<AdminAuthResponse>('/admin/auth/login', 'POST', { email, password })
      adminTokenStore.set(res.token)
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(res.admin))
      setAdmin(res.admin)
    },
    logout: () => {
      adminTokenStore.clear()
      localStorage.removeItem(ADMIN_INFO_KEY)
      setAdmin(null)
    },
    // Refresh stored admin info (e.g. after a forced password change clears the flag).
    updateAdmin: (updated: AdminUser) => {
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(updated))
      setAdmin(updated)
    },
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth()
  if (loading) return <div className="loading">Loading…</div>
  if (!admin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
