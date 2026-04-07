import { useState, useMemo } from 'react'
import { KeyRound, Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Login } from '../types'

interface Props {
  logins: Login[]
  isAdmin: boolean
  onCreate: (entry: Omit<Login, 'id' | 'created_at' | 'updated_at'>) => Promise<Login>
  onUpdate: (id: string, updates: Partial<Login>) => Promise<Login>
  onDelete: (id: string) => Promise<void>
}

const KATEGORIEN = ['Alle', 'Interne Logins', 'Externe Logins', 'Social Media']

const inputCls = 'w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-brand-500'

function emptyLogin(): Omit<Login, 'id' | 'created_at' | 'updated_at'> {
  return { name: '', website: '', login_name: '', passwort: '', anmerkung: '', kategorie: 'Interne Logins', department: '' }
}

// Single-cell password reveal
function PwCell({ value }: { value: string | null }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-slate-600">–</span>
  return (
    <span className="flex items-center gap-1.5 font-mono text-sm">
      {show ? (
        <span className="text-emerald-300 select-all">{value}</span>
      ) : (
        <span className="text-muted-foreground tracking-widest">{'•'.repeat(Math.min(value.length, 12))}</span>
      )}
      <button onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-muted-foreground transition-colors shrink-0">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  )
}

export function LoginsPage({ logins, isAdmin, onCreate, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [kat, setKat] = useState('Alle')
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Login>>({})
  const [adding, setAdding] = useState(false)
  const [newData, setNewData] = useState(emptyLogin())
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logins.filter(l => {
      const matchKat = kat === 'Alle' || l.kategorie?.includes(kat)
      const matchQ = !q || [l.name, l.website, l.login_name, l.anmerkung, l.department]
        .some(f => f?.toLowerCase().includes(q))
      return matchKat && matchQ
    })
  }, [logins, search, kat])

  function startEdit(l: Login) { setEditId(l.id); setEditData({ ...l }) }
  function cancelEdit() { setEditId(null); setEditData({}) }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    try { await onUpdate(editId, editData); setEditId(null); toast.success('Gespeichert') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`"${name || 'Eintrag'}" wirklich löschen?`)) return
    try { await onDelete(id); toast.success('Gelöscht') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
  }

  async function handleAdd() {
    setSaving(true)
    try { await onCreate(newData); setNewData(emptyLogin()); setAdding(false); toast.success('Hinzugefügt') }
    catch (e: unknown) { toast.error((e instanceof Error ? e.message : 'Fehler')) }
    finally { setSaving(false) }
  }

  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'
  const td = 'px-3 py-2.5 text-sm text-muted-foreground align-top'

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <KeyRound size={24} className="text-brand-400" /> Logins & Passwörter
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{logins.length} Einträge — Passwörter nur für eingeloggte User sichtbar</p>
        </div>
        {isAdmin && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-foreground text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} /> Neu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Suche nach Name, Website, Login …"
          className="flex-1 min-w-56 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-brand-500" />
        <div className="flex gap-1 bg-card p-1 rounded-xl border border-border">
          {KATEGORIEN.map(k => (
            <button key={k} onClick={() => setKat(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kat === k ? 'bg-brand-600 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/60 border-b border-border">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Website</th>
                <th className={th}>Login</th>
                <th className={th}>Passwort</th>
                <th className={th}>Anmerkung</th>
                <th className={th}>Kategorie</th>
                <th className={th}>Department</th>
                {isAdmin && <th className={th + ' w-20'}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {/* Add row */}
              {adding && (
                <tr className="bg-brand-500/5">
                  {(['name','website','login_name','passwort','anmerkung','kategorie','department'] as const).map(f => (
                    <td key={f} className="px-2 py-1.5">
                      <input value={(newData[f] as string) || ''} onChange={e => setNewData(p => ({ ...p, [f]: e.target.value }))}
                        placeholder={f} className={inputCls} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button onClick={handleAdd} disabled={saving} className="p-1.5 text-emerald-400 hover:text-emerald-300"><Check size={15} /></button>
                      <button onClick={() => setAdding(false)} className="p-1.5 text-muted-foreground hover:text-muted-foreground"><X size={15} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Keine Einträge gefunden</td></tr>
              )}
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  {editId === l.id ? (
                    <>
                      {(['name','website','login_name','passwort','anmerkung','kategorie','department'] as const).map(f => (
                        <td key={f} className="px-2 py-1.5">
                          <input value={(editData[f] as string) || ''} onChange={e => setEditData(p => ({ ...p, [f]: e.target.value }))}
                            className={inputCls} />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={saving} className="p-1.5 text-emerald-400 hover:text-emerald-300"><Check size={15} /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-muted-foreground hover:text-muted-foreground"><X size={15} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={td}><span className="font-medium text-foreground">{l.name || <span className="text-slate-600">–</span>}</span></td>
                      <td className={td}>
                        {l.website ? (
                          <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                            target="_blank" rel="noreferrer"
                            className="text-brand-400 hover:text-brand-300 flex items-center gap-1 max-w-[180px] truncate">
                            {l.website.replace(/https?:\/\//, '').slice(0, 30)}
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : <span className="text-slate-600">–</span>}
                      </td>
                      <td className={td}><span className="font-mono text-xs text-muted-foreground">{l.login_name || <span className="text-slate-600">–</span>}</span></td>
                      <td className={td}><PwCell value={l.passwort} /></td>
                      <td className={td}><span className="text-muted-foreground text-xs max-w-[200px] block">{l.anmerkung || ''}</span></td>
                      <td className={td}>
                        {l.kategorie && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border
                            ${l.kategorie.includes('Intern') ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                            : l.kategorie.includes('Social') ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-input'}`}>
                            {l.kategorie}
                          </span>
                        )}
                      </td>
                      <td className={td}><span className="text-xs text-muted-foreground">{l.department || ''}</span></td>
                      {isAdmin && (
                        <td className={td}>
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(l)} className="p-1.5 text-muted-foreground hover:text-brand-400 transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(l.id, l.name)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border/50 text-xs text-slate-600">
          {filtered.length} von {logins.length} Einträgen
        </div>
      </div>
    </div>
  )
}

