import { useState, useEffect, useCallback } from 'react'
import { inventar, Login } from '../../../lib/apiClient'

export function useLogins() {
  const [logins, setLogins] = useState<Login[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogins = useCallback(async () => {
    setLoading(true)
    try {
      const data = await inventar.logins.list()
      setLogins(data)
    } catch (err: any) {
      console.error('[useLogins]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogins() }, [fetchLogins])

  async function createLogin(entry: Omit<Login, 'id' | 'created_at' | 'updated_at'>) {
    const data = await inventar.logins.create(entry)
    setLogins(prev => [...prev, data].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    return data
  }

  async function updateLogin(id: string, updates: Partial<Login>) {
    const data = await inventar.logins.update(id, updates)
    setLogins(prev => prev.map(l => l.id === id ? data : l))
    return data
  }

  async function deleteLogin(id: string) {
    await inventar.logins.delete(id)
    setLogins(prev => prev.filter(l => l.id !== id))
  }

  return { logins, loading, fetchLogins, createLogin, updateLogin, deleteLogin }
}
