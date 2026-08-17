// Small fetch wrapper. All calls go to /api/v1/* which Vite proxies
// to the Spring backend in dev (see vite.config.ts).

const TOKEN_KEY = 'jobby_token'
const ADMIN_TOKEN_KEY = 'jobby_admin_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const adminTokenStore = {
  get: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  set: (t: string) => localStorage.setItem(ADMIN_TOKEN_KEY, t),
  clear: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
}

// Admin API calls (everything under /admin/ except the admin login) are
// authenticated with the ADMIN token; all other calls use the user token.
// This keeps the two identity domains cleanly separated on the client too.
function isAdminApiPath(path: string): boolean {
  return path.startsWith('/admin/') && !path.startsWith('/admin/auth')
}

export async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = isAdminApiPath(path) ? adminTokenStore.get() : tokenStore.get()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // no body
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `Request failed (${res.status})`
    throw new Error(message)
  }
  return data as T
}
