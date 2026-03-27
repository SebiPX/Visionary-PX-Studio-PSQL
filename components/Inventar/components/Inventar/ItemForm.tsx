import React from 'react'
import { useState } from 'react'
import { Upload, X, Save, User } from 'lucide-react'
import type { InventarItem, ItemStatus, Profile } from '../../types'

interface ItemFormProps {
  item?: InventarItem | null
  profiles?: Profile[]
  onSave: (data: Partial<InventarItem>, imageFile?: File) => Promise<void>
  onCancel: () => void
}

const GERAET_TYPES = [
  'Akustikmodul','Beamer','Computer','Drucker','Festplatte','Funkstrecke',
  'Grafiktablet','Handy','Interface','Kamera','Kamera Tracker','Keyboard',
  'Kopfhörer','Lautsprecher','Maus','Messgerät','Midi Keyboard','Mikrofon',
  'Mischpult','Modem','Monitor','Netzwerk Switch','Notebook','Objektiv',
  'Raid','Sender','Software','Speicher BackUp','Stativ','Stream Deck',
  'Studio-Licht','Switch','Tastatur','Tiger Box','Tischmikrofon','TV','Webcam','Sonstiges'
]
const DEPARTMENTS = ['AUDIO','EDIT','MOTION','INNOVATION','PJM','GF/GL','OFFICE','Studio','Allgemein PX']
const ORTE = ['@Office','@Home Office','Studio','Keller']
const OS_TYPES = ['','Windows','MacOS','Linux']
const STATUS_TYPES: ItemStatus[] = ['Vorhanden','Fehlt','Ausgeliehen','Defekt']

export function ItemForm({ item, profiles = [], onSave, onCancel }: ItemFormProps) {
  const [loading, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(item?.bild_url || null)

  const [form, setForm] = useState({
    geraet: item?.geraet || '',
    px_nummer: item?.px_nummer || '',
    modell: item?.modell || '',
    seriennummer: item?.seriennummer || '',
    ort: item?.ort || '@Office',
    os: item?.os || '',
    status: item?.status || 'Vorhanden' as ItemStatus,
    department: item?.department || '',
    ip_office: item?.ip_office || '',
    ip_tiger: item?.ip_tiger || '',
    px_eigentum: item?.px_eigentum ?? true,
    handy_nr: item?.handy_nr || '',
    notes: item?.notes || '',
    is_verleihartikel: item?.is_verleihartikel || false,
    anschaffungsdatum: item?.anschaffungsdatum || '',
    anschaffungspreis: item?.anschaffungspreis?.toString() || '',
    assigned_to_id: item?.assigned_to_id || '',
    assigned_to_name: item?.assigned_to_name || '',
  })

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handlePersonChange(profileId: string) {
    if (!profileId) {
      setForm(prev => ({ ...prev, assigned_to_id: '', assigned_to_name: '' }))
      return
    }
    const p = profiles.find(p => p.id === profileId)
    setForm(prev => ({ ...prev, assigned_to_id: profileId, assigned_to_name: p?.full_name || '' }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      // Convert empty strings to null for typed DB columns
      anschaffungspreis: form.anschaffungspreis ? parseFloat(form.anschaffungspreis) : null,
      anschaffungsdatum: form.anschaffungsdatum || null,
      os:          form.os          || null,
      ip_office:   form.ip_office   || null,
      ip_tiger:    form.ip_tiger    || null,
      handy_nr:    form.handy_nr    || null,
      seriennummer: form.seriennummer || null,
      department:  form.department  || null,
      notes:       form.notes       || null,
      assigned_to_name: form.assigned_to_name || null,
      assigned_to_id: form.assigned_to_id || null,
      bild_url: item?.bild_url || null,
    }, imageFile || undefined)
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2.5 bg-card border border-border/80 rounded-xl text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-brand-500/20 transition-all'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
  const selectCls = inputCls + ' cursor-pointer'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Bild */}
      <div>
        <label className={labelCls}>Gerätebild</label>
        <div className="flex gap-4 items-start">
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Vorschau" className="w-24 h-24 object-cover rounded-xl border border-border/80" />
              <button type="button" onClick={() => { setImagePreview(null); setImageFile(null) }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-foreground">
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="w-24 h-24 border-2 border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors text-muted-foreground hover:text-primary-400">
              <Upload size={20} />
              <span className="text-xs mt-1">Bild</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
          <p className="text-xs text-muted-foreground pt-2">JPG, PNG, WebP bis 5 MB</p>
        </div>
      </div>

      {/* Zwei-Spalten-Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Gerätetyp *</label>
          <select value={form.geraet} onChange={e => set('geraet', e.target.value)} required className={selectCls}>
            <option value="">Typ wählen …</option>
            {GERAET_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PX-Nummer</label>
          <input value={form.px_nummer} onChange={e => set('px_nummer', e.target.value)} className={inputCls} placeholder="PX_NB_1" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Modellbezeichnung</label>
          <input value={form.modell} onChange={e => set('modell', e.target.value)} className={inputCls} placeholder="z.B. MacBook Air, M2" />
        </div>
        <div>
          <label className={labelCls}>Seriennummer</label>
          <input value={form.seriennummer} onChange={e => set('seriennummer', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value as ItemStatus)} className={selectCls}>
            {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Ort</label>
          <select value={form.ort} onChange={e => set('ort', e.target.value)} className={selectCls}>
            {ORTE.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <select value={form.department} onChange={e => set('department', e.target.value)} className={selectCls}>
            <option value="">–</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Betriebssystem</label>
          <select value={form.os} onChange={e => set('os', e.target.value)} className={selectCls}>
            {OS_TYPES.map(o => <option key={o} value={o}>{o || '–'}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>IP Office</label>
          <input value={form.ip_office} onChange={e => set('ip_office', e.target.value)} className={inputCls} placeholder="192.168.55.x" />
        </div>
        <div>
          <label className={labelCls}>Handynummer</label>
          <input value={form.handy_nr} onChange={e => set('handy_nr', e.target.value)} className={inputCls} placeholder="0179 …" />
        </div>
        <div>
          <label className={labelCls}>Anschaffungsdatum</label>
          <input type="date" value={form.anschaffungsdatum} onChange={e => set('anschaffungsdatum', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Preis (€)</label>
          <input type="number" step="0.01" value={form.anschaffungspreis} onChange={e => set('anschaffungspreis', e.target.value)} className={inputCls} placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notizen</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls} placeholder="Interne Hinweise …" />
      </div>

      {/* Zuweisung */}
      {profiles.length > 0 && (
        <div>
          <label className={labelCls}><User size={12} className="inline mr-1" />Zugewiesen an</label>
          <select
            value={form.assigned_to_id}
            onChange={e => handlePersonChange(e.target.value)}
            className={selectCls}
          >
            <option value="">– Niemand –</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Checkboxen */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.px_eigentum} onChange={e => set('px_eigentum', e.target.checked)}
            className="w-4 h-4 rounded border-border/80 bg-card accent-brand-500" />
          <span className="text-sm text-foreground/90">PX Eigentum</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_verleihartikel} onChange={e => set('is_verleihartikel', e.target.checked)}
            className="w-4 h-4 rounded border-border/80 bg-card accent-brand-500" />
          <span className="text-sm text-foreground/90">Verleihartikel</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border/80 text-foreground/90 text-sm font-medium hover:bg-muted transition-colors">
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-foreground text-sm font-medium transition-colors">
          <Save size={16} />
          {loading ? 'Speichert …' : (item ? 'Speichern' : 'Anlegen')}
        </button>
      </div>
    </form>
  )
}

