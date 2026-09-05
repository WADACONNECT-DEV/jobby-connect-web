import { useEffect, useState } from 'react'
import { api } from './api'
import { type PlatformSettings } from './types'

/**
 * Platform-wide values the UI has to respect.
 *
 * The provider-per-request cap is admin-managed (V25) and served by
 * GET /master/settings, so the number the form enforces is the same one the API
 * enforces — UAT Round 2 open item 7.2. Nothing in the UI hard-codes it.
 *
 * Fetched once per session and shared by every caller. If the call fails the UI
 * falls back to the documented default rather than blocking the customer; the
 * API is still the authority, so a stale fallback can only ever be rejected
 * server-side, never over-allowed.
 */

export const DEFAULT_MAX_PROVIDERS_PER_REQUEST = 4

let settingsCache: Promise<PlatformSettings> | null = null

export function loadPlatformSettings(): Promise<PlatformSettings> {
  if (!settingsCache) {
    settingsCache = api<PlatformSettings>('/master/settings', 'GET').catch(() => ({
      maxProvidersPerRequest: DEFAULT_MAX_PROVIDERS_PER_REQUEST,
      updatedAt: '',
    }))
  }
  return settingsCache
}

/** Drop the cached settings — used after an admin changes them. */
export function clearPlatformSettings() {
  settingsCache = null
}

/** The configured cap, ready to use in a component. */
export function useMaxProvidersPerRequest(): number {
  const [max, setMax] = useState(DEFAULT_MAX_PROVIDERS_PER_REQUEST)

  useEffect(() => {
    let alive = true
    loadPlatformSettings().then((s) => {
      if (alive && s.maxProvidersPerRequest > 0) setMax(s.maxProvidersPerRequest)
    })
    return () => { alive = false }
  }, [])

  return max
}
