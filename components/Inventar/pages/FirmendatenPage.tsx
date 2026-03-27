import { useState } from 'react'
import { Building2, Landmark, Plus, Pencil, Trash2, Check, X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Firmendatum } from '../types'

interface Props {
  firmendaten: Firmendatum[]
  onCreate: (entry: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>) => Promise<Firmendatum>
  onUpdate: (id: string, updates: Partial<Firmendatum>) => Promise<Firmendatum>
  onDelete: (id: string) => Promise<void>
}

const inputCls = 'w-full px-2 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary-500'

type Kat = 'Bankverbindung' | 'Handelsregister'

function emptyEintrag(kat: Kat): Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'> {
  return { kategorie: kat, bezeichner: '', wert: '', anmerkung: '', datei_name: '', sort_order: 99 }
}

// ── Bankverbindung section ──────────────────────────────────
function BankSection({ rows, onEdit, onDelete, onAdd }: {
  rows: Firmendatum[]
  onEdit: (f: Firmendatum) => void
  onDelete: (id: string, label: string | null) => void
  onAdd: () => void
}) {
  return (
    <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/40">
        <div className="flex items-center gap-2.5">
          <Landmark size={18} className="text-primary-400" />
          <h2 className="font-semibold text-foreground">Bankverbindung</h2>
          <span className="text-xs text-muted-foreground">{rows.length} Einträge</span>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-foreground text-xs font-semibold rounded-lg transition-colors">
          <Plus size={13} /> Neu
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map(f => (
          <div key={f.id} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/20 transition-colors group">
            <span className="w-40 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-0.5">{f.bezeichner}</span>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-sm text-foreground break-all select-all">{f.wert || '–'}</span>
              {f.anmerkung && (
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{f.anmerkung}</p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => onEdit(f)} className="p-1.5 text-muted-foreground hover:text-primary-400 transition-colors"><Pencil size={13} /></button>
              <button onClick={() => onDelete(f.id, f.bezeichner)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Handelsregister section ─────────────────────────────────
function RegisterSection({ rows, onEdit, onDelete, onAdd }: {
  rows: Firmendatum[]
  onEdit: (f: Firmendatum) => void
  onDelete: (id: string, label: string | null) => void
  onAdd: () => void
}) {
  return (
    <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/40">
        <div className="flex items-center gap-2.5">
          <FileText size={18} className="text-primary-400" />
          <h2 className="font-semibold text-foreground">Handelsregister</h2>
          <span className="text-xs text-muted-foreground">{rows.length} Einträge</span>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-foreground text-xs font-semibold rounded-lg transition-colors">
          <Plus size={13} /> Neu
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map(f => (
          <div key={f.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{f.bezeichner}</p>
              {f.anmerkung && <p className="text-xs text-muted-foreground mt-0.5">{f.anmerkung}</p>}
              {f.datei_name && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/80 rounded-lg px-2.5 py-1">
                  <FileText size={11} className="text-muted-foreground" />
                  {f.datei_name}
                </span>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => onEdit(f)} className="p-1.5 text-muted-foreground hover:text-primary-400 transition-colors"><Pencil size={13} /></button>
              <button onClick={() => onDelete(f.id, f.bezeichner)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Edit / Add Modal ────────────────────────────────────────
function EditModal({ entry, onSave, onClose, saving }: {
  entry: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>
  onSave: (data: typeof entry) => void
  onClose: () => void
  saving: boolean
}) {
  const [data, setData] = useState({ ...entry })
  const set = (k: keyof typeof data, v: string) => setData(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {entry.bezeichner ? `Bearbeiten: ${entry.bezeichner}` : 'Neuer Eintrag'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Kategorie</span>
            <select value={data.kategorie} onChange={e => set('kategorie', e.target.value)}
              className={inputCls + ' cursor-pointer'}>
              <option value="Bankverbindung">Bankverbindung</option>
              <option value="Handelsregister">Handelsregister</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bezeichner / Name</span>
            <input value={data.bezeichner || ''} onChange={e => set('bezeichner', e.target.value)} className={inputCls} placeholder="z.B. IBAN oder HRB 209335" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Wert</span>
            <input value={data.wert || ''} onChange={e => set('wert', e.target.value)} className={inputCls} placeholder="Inhalt / Wert" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Anmerkung</span>
            <textarea value={data.anmerkung || ''} onChange={e => set('anmerkung', e.target.value)}
              className={inputCls + ' resize-none h-20'} placeholder="Zusätzliche Infos" />
          </label>
          {data.kategorie === 'Handelsregister' && (
            <label className="block">
              <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Datei-Name</span>
              <input value={data.datei_name || ''} onChange={e => set('datei_name', e.target.value)} className={inputCls} placeholder="z.B. HRB_209335.pdf" />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors">Abbrechen</button>
          <button onClick={() => onSave(data)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            <Check size={14} /> Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────
export function FirmendatenPage({ firmendaten, onCreate, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<{
    mode: 'edit' | 'add'
    data: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>
    id?: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const bankRows = firmendaten.filter(f => f.kategorie === 'Bankverbindung')
  const registerRows = firmendaten.filter(f => f.kategorie === 'Handelsregister')

  function openEdit(f: Firmendatum) {
    setModal({ mode: 'edit', id: f.id, data: { kategorie: f.kategorie, bezeichner: f.bezeichner, wert: f.wert, anmerkung: f.anmerkung, datei_name: f.datei_name, sort_order: f.sort_order } })
  }
  function openAdd(kat: Kat) {
    setModal({ mode: 'add', data: emptyEintrag(kat) })
  }

  async function handleDelete(id: string, label: string | null) {
    if (!confirm(`"${label || 'Eintrag'}" wirklich löschen?`)) return
    try { await onDelete(id); toast.success('Gelöscht') }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Fehler') }
  }

  async function handleSave(data: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>) {
    setSaving(true)
    try {
      if (modal?.mode === 'edit' && modal.id) {
        await onUpdate(modal.id, data)
        toast.success('Gespeichert')
      } else {
        await onCreate(data)
        toast.success('Hinzugefügt')
      }
      setModal(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Building2 size={24} className="text-primary-400" /> Firmendaten
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bankverbindung & Handelsregister — nur für Admins sichtbar</p>
      </div>

      <BankSection
        rows={bankRows}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={() => openAdd('Bankverbindung')}
      />

      <RegisterSection
        rows={registerRows}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={() => openAdd('Handelsregister')}
      />

      {/* Edit/Add Modal */}
      {modal && (
        <EditModal
          entry={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

