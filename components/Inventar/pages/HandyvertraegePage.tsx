import { useState } from 'react'
import { Smartphone, Plus, Pencil, Trash2, Check, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Handyvertrag } from '../types'

interface Props {
  vertraege: Handyvertrag[]
  isAdmin: boolean
  onCreate: (entry: Omit<Handyvertrag, 'id' | 'created_at' | 'updated_at'>) => Promise<Handyvertrag>
  onUpdate: (id: string, updates: Partial<Handyvertrag>) => Promise<Handyvertrag>
  onDelete: (id: string) => Promise<void>
}

const inputCls = 'w-full px-2 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary-500'

function emptyVertrag(): Omit<Handyvertrag, 'id' | 'created_at' | 'updated_at'> {
  return { handynummer: '', kartennummer: '', pin: '', puk: '', pin2: '', puk2: '', anmerkung: '', it_bestandsliste: '' }
}

// Reveal toggle for PIN/PUK cells
function SecretCell({ value }: { value: string | null }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-muted-foreground/80 text-xs">–</span>
  return (
    <span className="flex items-center gap-1 font-mono text-xs">
      {show
        ? <span className="text-amber-300 select-all">{value}</span>
        : <span className="text-muted-foreground">{'•'.repeat(value.length)}</span>}
      <button onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground/90 transition-colors">
        {show ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
    </span>
  )
}

export function HandyvertraegePage({ vertraege, isAdmin, onCreate, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Handyvertrag>>({})
  const [adding, setAdding] = useState(false)
  const [newData, setNewData] = useState(emptyVertrag())
  const [saving, setSaving] = useState(false)

  function startEdit(v: Handyvertrag) { setEditId(v.id); setEditData({ ...v }) }
  function cancelEdit() { setEditId(null); setEditData({}) }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    try { await onUpdate(editId, editData); setEditId(null); toast.success('Gespeichert') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string, nr: string | null) {
    if (!confirm(`Vertrag ${nr || ''} wirklich löschen?`)) return
    try { await onDelete(id); toast.success('Gelöscht') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
  }

  async function handleAdd() {
    setSaving(true)
    try { await onCreate(newData); setNewData(emptyVertrag()); setAdding(false); toast.success('Hinzugefügt') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
    finally { setSaving(false) }
  }

  const FIELDS: { key: keyof typeof newData; label: string; secret?: boolean }[] = [
    { key: 'handynummer',      label: 'Handynummer' },
    { key: 'kartennummer',     label: 'Kartennummer' },
    { key: 'pin',              label: 'PIN',    secret: true },
    { key: 'puk',              label: 'PUK',    secret: true },
    { key: 'pin2',             label: 'PIN 2',  secret: true },
    { key: 'puk2',             label: 'PUK 2',  secret: true },
    { key: 'anmerkung',        label: 'Anmerkung' },
    { key: 'it_bestandsliste', label: 'IT Bestand' },
  ]

  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap'
  const td = 'px-3 py-2.5 text-sm align-middle'

  // Group by handynummer for display
  const grouped = vertraege.reduce<Map<string, Handyvertrag[]>>((m, v) => {
    const key = v.handynummer || '–'
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(v)
    return m
  }, new Map())

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Smartphone size={24} className="text-primary-400" /> Handyverträge
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{vertraege.length} SIM-Karten / Einträge — PINs nur für eingeloggte User sichtbar</p>
        </div>
        {isAdmin && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-foreground text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} /> Neu
          </button>
        )}
      </div>

      <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border">
              <tr>
                {FIELDS.map(f => <th key={f.key} className={th}>{f.label}</th>)}
                {isAdmin && <th className={th + ' w-16'}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {adding && (
                <tr className="bg-primary-500/5">
                  {FIELDS.map(f => (
                    <td key={f.key} className="px-2 py-1.5">
                      <input value={(newData[f.key] as string) || ''} placeholder={f.label}
                        onChange={e => setNewData(p => ({ ...p, [f.key]: e.target.value }))}
                        className={inputCls} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button onClick={handleAdd} disabled={saving} className="p-1.5 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                      <button onClick={() => setAdding(false)} className="p-1.5 text-muted-foreground hover:text-foreground/90"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {Array.from(grouped.entries()).map(([nr, rows]) =>
                rows.map((v, idx) => (
                  <tr key={v.id} className={`transition-colors ${idx === 0 ? 'bg-card/30' : 'bg-transparent'} hover:bg-muted/20`}>
                    {editId === v.id ? (
                      <>
                        {FIELDS.map(f => (
                          <td key={f.key} className="px-2 py-1.5">
                            <input value={(editData[f.key] as string) || ''}
                              onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))}
                              className={inputCls} />
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button onClick={saveEdit} disabled={saving} className="p-1.5 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                            <button onClick={cancelEdit} className="p-1.5 text-muted-foreground hover:text-foreground/90"><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={td}>
                          <span className={`font-mono font-semibold ${idx === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {idx === 0 ? nr : '↳'}
                          </span>
                        </td>
                        <td className={td}><span className="font-mono text-xs text-muted-foreground">{v.kartennummer || '–'}</span></td>
                        <td className={td}><SecretCell value={v.pin} /></td>
                        <td className={td}><SecretCell value={v.puk} /></td>
                        <td className={td}><SecretCell value={v.pin2} /></td>
                        <td className={td}><SecretCell value={v.puk2} /></td>
                        <td className={td}>
                          <span className="text-muted-foreground text-xs">{v.anmerkung || ''}</span>
                        </td>
                        <td className={td}>
                          {v.it_bestandsliste && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {v.it_bestandsliste}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className={td}>
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(v)} className="p-1.5 text-muted-foreground hover:text-primary-400 transition-colors"><Pencil size={12} /></button>
                              <button onClick={() => handleDelete(v.id, v.handynummer)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

