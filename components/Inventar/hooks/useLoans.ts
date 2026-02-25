import { useState, useEffect, useCallback } from 'react'
import { inventar, InventarLoan } from '../../../lib/apiClient'

export function useLoans(itemId?: string) {
  const [loans, setLoans] = useState<InventarLoan[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      setLoans(await inventar.loans.list(itemId))
    } catch (err: any) {
      console.error('[useLoans]', err)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { fetchLoans() }, [fetchLoans])

  async function createLoan(loan: {
    item_id: string
    profile_id?: string | null
    mitarbeiter_name?: string
    department?: string
    ausgeliehen_am: string
    zurueck_bis?: string | null
    zweck?: string
    notes?: string
    created_by?: string | null
  }) {
    const data = await inventar.loans.create(loan as any)
    setLoans(prev => [data, ...prev])
    return data
  }

  async function returnLoan(id: string) {
    const data = await inventar.loans.return_(id)
    setLoans(prev => prev.map(l => l.id === id ? data : l))
    return data
  }

  async function deleteLoan(id: string) {
    await inventar.loans.delete(id)
    setLoans(prev => prev.filter(l => l.id !== id))
  }

  const activeLoans = loans.filter(l => !l.zurueck_am)
  const pastLoans   = loans.filter(l => !!l.zurueck_am)

  return { loans, activeLoans, pastLoans, loading, fetchLoans, createLoan, returnLoan, deleteLoan }
}
