import { useState, useEffect, useCallback } from 'react'
import { inventar, Kreditkarte } from '../../../lib/apiClient'

export function useKreditkarten() {
  const [kreditkarten, setKreditkarten] = useState<Kreditkarte[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKreditkarten = useCallback(async () => {
    setLoading(true)
    try {
      setKreditkarten(await inventar.kreditkarten.list())
    } catch (err: any) {
      console.error('[useKreditkarten]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKreditkarten() }, [fetchKreditkarten])

  async function createKreditkarte(entry: Omit<Kreditkarte, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.kreditkarten.create(entry)
    setKreditkarten(prev => [...prev, data])
    return data
  }

  async function updateKreditkarte(id: string, updates: Partial<Kreditkarte>) {
    const data = await inventar.kreditkarten.update(id, updates)
    setKreditkarten(prev => prev.map(k => k.id === id ? data : k))
    return data
  }

  async function deleteKreditkarte(id: string) {
    await inventar.kreditkarten.delete(id)
    setKreditkarten(prev => prev.filter(k => k.id !== id))
  }

  return { kreditkarten, loading, createKreditkarte, updateKreditkarte, deleteKreditkarte }
}
