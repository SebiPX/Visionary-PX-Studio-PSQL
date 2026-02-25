import { useState, useEffect, useCallback } from 'react'
import { inventar, InventarLink } from '../../../lib/apiClient'

export function useLinks() {
  const [links, setLinks] = useState<InventarLink[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      setLinks(await inventar.links.list())
    } catch (err: any) {
      console.error('[useLinks]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  async function createLink(entry: Omit<InventarLink, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.links.create(entry)
    setLinks(prev => [...prev, data].sort((a, b) => (a.sort_order - b.sort_order) || (a.titel.localeCompare(b.titel, 'de'))))
    return data
  }

  async function updateLink(id: string, updates: Partial<InventarLink>) {
    const data = await inventar.links.update(id, updates)
    setLinks(prev => prev.map(l => l.id === id ? data : l))
    return data
  }

  async function deleteLink(id: string) {
    await inventar.links.delete(id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  return { links, loading, fetchLinks, createLink, updateLink, deleteLink }
}
