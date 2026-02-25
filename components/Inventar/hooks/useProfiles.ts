import { useState, useEffect } from 'react'
import { inventar, InventarProfile } from '../../../lib/apiClient'

export function useProfiles() {
  const [profiles, setProfiles] = useState<InventarProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inventar.profiles.list()
      .then(data => { setProfiles(data); setLoading(false) })
      .catch(err => { console.error('[useProfiles]', err); setLoading(false) })
  }, [])

  return { profiles, loading }
}
