import { useState, useEffect, useCallback } from 'react'
import { inventar } from '../../../lib/apiClient'

// ─── Config shape ────────────────────────────────────────────────────────────
export interface DashboardConfig {
  show_links: boolean
  /** null = all categories; string[] = only these categories */
  link_categories: string[] | null
  show_calendar: boolean
  show_loans: boolean
  show_inventory_stats: boolean
  pinned_login_ids: string[]
}

export const DEFAULT_CONFIG: DashboardConfig = {
  show_links: true,
  link_categories: null,
  show_calendar: true,
  show_loans: true,
  show_inventory_stats: true,
  pinned_login_ids: [],
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await inventar.dashboardConfig.get()
      if (data) {
        setConfig({ ...DEFAULT_CONFIG, ...(data as Partial<DashboardConfig>) })
      }
    } catch (err: any) {
      console.error('[useDashboardConfig] load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (next: DashboardConfig) => {
    setSaving(true)
    try {
      await inventar.dashboardConfig.save(next as unknown as Record<string, unknown>)
      setConfig(next)
    } catch (err: any) {
      console.error('[useDashboardConfig] save:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { config, loading, saving, save }
}
