import { useState, useEffect, useCallback } from 'react'
import { inventar, Verleihschein } from '../../../lib/apiClient'

export function useVerleihscheine() {
  const [scheine, setScheine]         = useState<Verleihschein[]>([])
  const [archivierte, setArchivierte] = useState<Verleihschein[]>([])
  const [loading, setLoading]         = useState(true)
  const [archiveLoading, setArchiveLoading] = useState(false)

  const fetchScheine = useCallback(async () => {
    setLoading(true)
    try {
      setScheine(await inventar.verleihscheine.list('aktiv'))
    } catch (err: any) {
      console.error('[useVerleihscheine] fetch aktiv:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchArchive = useCallback(async () => {
    setArchiveLoading(true)
    try {
      setArchivierte(await inventar.verleihscheine.list('erledigt'))
    } catch (err: any) {
      console.error('[useVerleihscheine] fetch erledigt:', err)
    } finally {
      setArchiveLoading(false)
    }
  }, [])

  useEffect(() => { fetchScheine() }, [fetchScheine])

  async function createVerleihschein(
    header: any,
    items: { item_id: string; anschaffungspreis: number | null; tagespreis: number | null; gesamtpreis: number | null }[]
  ): Promise<Verleihschein> {
    const schein = await inventar.verleihscheine.create(header, items)
    await fetchScheine() // reload to get joined data
    return schein
  }

  async function markErledigt(id: string, itemIds: string[]) {
    await inventar.verleihscheine.markErledigt(id, itemIds)
    setScheine(prev => prev.filter(s => s.id !== id))
  }

  return { scheine, archivierte, loading, archiveLoading, fetchScheine, fetchArchive, createVerleihschein, markErledigt }
}
