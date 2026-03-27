import { useState } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Check, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Kreditkarte } from '../types'

interface Props {
  kreditkarten: Kreditkarte[]
  onCreate: (entry: Omit<Kreditkarte, 'id' | 'created_at' | 'updated_at'>) => Promise<Kreditkarte>
  onUpdate: (id: string, updates: Partial<Kreditkarte>) => Promise<Kreditkarte>
  onDelete: (id: string) => Promise<void>
}

const inputCls = 'w-full px-2 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary-500'

function emptyKarte(): Omit<Kreditkarte, 'id' | 'created_at' | 'updated_at'> {
  return { name: '', nummer: '', assignee: '', ablaufdatum: '', check_code: '', pin_abheben: '', secure_code: '' }
}

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

const FIELDS: { key: keyof ReturnType<typeof emptyKarte>; label: string; secret?: boolean; mono?: boolean }[] = [
  { key: 'name',        label: 'Name' },
  { key: 'nummer',      label: 'Nummer',       mono: true },
  { key: 'assignee',    label: 'Typ / Inhaber' },
  { key: 'ablaufdatum', label: 'Ablauf' },
  { key: 'check_code',  label: 'Check',        secret: true },
  { key: 'pin_abheben', label: 'PIN / Abheben', secret: true },
  { key: 'secure_code', label: 'Secure Code',   secret: true },
]

const th = 'px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap'
const td = 'px-3 py-2.5 text-sm align-middle'

export function KreditkartenPage({ kreditkarten, onCreate, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Kreditkarte>>({})
  const [adding, setAdding] = useState(false)
  const [newData, setNewData] = useState(emptyKarte())
  const [saving, setSaving] = useState(false)

  function startEdit(k: Kreditkarte) { setEditId(k.id); setEditData({ ...k }) }
  function cancelEdit() { setEditId(null); setEditData({}) }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    try { await onUpdate(editId, editData); setEditId(null); toast.success('Gespeichert') }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Fehler') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`"${name || 'Eintrag'}" wirklich löschen?`)) return
    try { await onDelete(id); toast.success('Gelöscht') }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Fehler') }
  }

  async function handleAdd() {
    setSaving(true)
    try { await onCreate(newData); setNewData(emptyKarte()); setAdding(false); toast.success('Hinzugefügt') }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Fehler') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <CreditCard size={24} className="text-primary-400" /> Kreditkarten & PayPal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {kreditkarten.length} Einträge — nur für Admins sichtbar
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-foreground text-sm font-semibold rounded-xl transition-colors">
          <Plus size={16} /> Neu
        </button>
      </div>

      {/* Table */}
      <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/60 border-b border-border">
              <tr>
                {FIELDS.map(f => <th key={f.key} className={th}>{f.label}</th>)}
                <th className={th + ' w-16'}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {/* Add row */}
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

              {kreditkarten.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Keine Einträge</td></tr>
              )}

              {kreditkarten.map(k => (
                <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                  {editId === k.id ? (
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
                      <td className={td}><span className="font-medium text-foreground">{k.name || <span className="text-muted-foreground/80">–</span>}</span></td>
                      <td className={td}><span className="font-mono text-sm text-foreground tracking-wider">{k.nummer || <span className="text-muted-foreground/80">–</span>}</span></td>
                      <td className={td}><span className="text-muted-foreground text-xs">{k.assignee || ''}</span></td>
                      <td className={td}>
                        {k.ablaufdatum
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/90 border border-border/80">{k.ablaufdatum}</span>
                          : <span className="text-muted-foreground/80">–</span>}
                      </td>
                      <td className={td}><SecretCell value={k.check_code} /></td>
                      <td className={td}><SecretCell value={k.pin_abheben} /></td>
                      <td className={td}><SecretCell value={k.secure_code} /></td>
                      <td className={td}>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(k)} className="p-1.5 text-muted-foreground hover:text-primary-400 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(k.id, k.name)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

