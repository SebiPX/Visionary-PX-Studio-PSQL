import { useState, useEffect, useCallback } from 'react'
import { inventar, InventarItem } from '../../../lib/apiClient'

export function useInventar() {
  const [items, setItems] = useState<InventarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await inventar.items.list()
      setItems(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function createItem(item: Omit<InventarItem, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.items.create(item)
    setItems(prev => [...prev, data])
    return data
  }

  async function updateItem(id: string, updates: Partial<InventarItem>) {
    const data = await inventar.items.update(id, updates)
    setItems(prev => prev.map(i => i.id === id ? data : i))
    return data
  }

  async function deleteItem(id: string) {
    await inventar.items.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function uploadImage(file: File, pxNummer: string): Promise<string | null> {
    // Import uploadFile lazily to avoid circular deps
    const { uploadFile } = await import('../../../lib/apiClient')
    const folder = `inventar/${pxNummer || Date.now()}`
    return uploadFile(file, folder)
  }

  return { items, loading, error, fetchItems, createItem, updateItem, deleteItem, uploadImage }
}
