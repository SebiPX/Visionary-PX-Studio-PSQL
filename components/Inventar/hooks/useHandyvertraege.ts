import { useState, useEffect, useCallback } from 'react'
import { inventar, Handyvertrag } from '../../../lib/apiClient'

export function useHandyvertraege() {
  const [vertraege, setVertraege] = useState<Handyvertrag[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVertraege = useCallback(async () => {
    setLoading(true)
    try {
      setVertraege(await inventar.handyvertraege.list())
    } catch (err: any) {
      console.error('[useHandyvertraege]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVertraege() }, [fetchVertraege])

  async function createVertrag(entry: Omit<Handyvertrag, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.handyvertraege.create(entry)
    setVertraege(prev => [...prev, data])
    return data
  }

  async function updateVertrag(id: string, updates: Partial<Handyvertrag>) {
    const data = await inventar.handyvertraege.update(id, updates)
    setVertraege(prev => prev.map(v => v.id === id ? data : v))
    return data
  }

  async function deleteVertrag(id: string) {
    await inventar.handyvertraege.delete(id)
    setVertraege(prev => prev.filter(v => v.id !== id))
  }

  return { vertraege, loading, createVertrag, updateVertrag, deleteVertrag }
}
