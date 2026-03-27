import React from 'react'
import { useState } from 'react'
import { Calendar, User, Save } from 'lucide-react'
import type { Profile } from '../../types'

interface LoanFormProps {
  itemId: string
  itemName: string
  profiles: Profile[]
  currentUserId?: string
  onSave: (data: {
    item_id: string
    profile_id?: string | null
    mitarbeiter_name?: string
    department?: string
    ausgeliehen_am: string
    zurueck_bis?: string | null
    zweck?: string
    notes?: string
    created_by?: string | null
  }) => Promise<void>
  onCancel: () => void
}

export function LoanForm({ itemId, itemName, profiles, currentUserId, onSave, onCancel }: LoanFormProps) {
  const [loading, setLoading] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [customName, setCustomName] = useState('')
  const [department, setDepartment] = useState('')
  const [ausgeliehen_am, setAusgeliehen] = useState(new Date().toISOString().split('T')[0])
  const [zurueck_bis, setZurueck] = useState('')
  const [zweck, setZweck] = useState('')
  const [notes, setNotes] = useState('')

  const selectedProfile = profiles.find(p => p.id === profileId)

  const inputCls = 'w-full px-3 py-2.5 bg-card border border-border/80 rounded-xl text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-brand-500/20 transition-all'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSave({
      item_id: itemId,
      profile_id: profileId || null,
      mitarbeiter_name: profileId ? (selectedProfile?.full_name || '') : customName,
      department: department || selectedProfile?.role || '',
      ausgeliehen_am,
      zurueck_bis: zurueck_bis || null,
      zweck,
      notes,
      created_by: currentUserId || null,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
        <p className="text-xs text-primary-300 font-medium">Gerät</p>
        <p className="text-foreground font-semibold mt-0.5">{itemName}</p>
      </div>

      {/* Mitarbeiter aus profiles */}
      <div>
        <label className={labelCls}>Mitarbeiter (aus System)</label>
        <select value={profileId} onChange={e => setProfileId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="">– Aus dem System wählen –</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </select>
      </div>

      {/* Oder manueller Name */}
      {!profileId && (
        <div>
          <label className={labelCls}>Oder: Name freitext</label>
          <input value={customName} onChange={e => setCustomName(e.target.value)} className={inputCls} placeholder="Vor- und Nachname" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ausgeliehen am</label>
          <input type="date" value={ausgeliehen_am} onChange={e => setAusgeliehen(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Zurück bis (geplant)</label>
          <input type="date" value={zurueck_bis} onChange={e => setZurueck(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Zweck / Projekt</label>
        <input value={zweck} onChange={e => setZweck(e.target.value)} className={inputCls} placeholder="z.B. Messe Berlin, Dreh München …" />
      </div>

      <div>
        <label className={labelCls}>Notizen</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border/80 text-foreground/90 text-sm hover:bg-muted transition-colors">
          Abbrechen
        </button>
        <button type="submit" disabled={loading || (!profileId && !customName)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-foreground text-sm font-medium transition-colors">
          <Save size={16} />
          {loading ? 'Speichert …' : 'Ausleihe erfassen'}
        </button>
      </div>
    </form>
  )
}

