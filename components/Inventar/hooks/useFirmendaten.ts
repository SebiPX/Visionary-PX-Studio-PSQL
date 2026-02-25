import { useState, useEffect, useCallback } from 'react'
import { inventar, Firmendatum } from '../../../lib/apiClient'

export function useFirmendaten() {
  const [firmendaten, setFirmendaten] = useState<Firmendatum[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFirmendaten = useCallback(async () => {
    setLoading(true)
    try {
      setFirmendaten(await inventar.firmendaten.list())
    } catch (err: any) {
      console.error('[useFirmendaten]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFirmendaten() }, [fetchFirmendaten])

  async function createEintrag(entry: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.firmendaten.create(entry)
    setFirmendaten(prev => [...prev, data])
    return data
  }

  async function updateEintrag(id: string, updates: Partial<Firmendatum>) {
    const data = await inventar.firmendaten.update(id, updates)
    setFirmendaten(prev => prev.map(f => f.id === id ? data : f))
    return data
  }

  async function deleteEintrag(id: string) {
    await inventar.firmendaten.delete(id)
    setFirmendaten(prev => prev.filter(f => f.id !== id))
  }

  return { firmendaten, loading, createEintrag, updateEintrag, deleteEintrag }
}
