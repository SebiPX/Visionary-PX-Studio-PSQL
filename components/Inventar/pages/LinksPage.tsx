import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Link2, FolderOpen, ChevronDown, ChevronRight, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { InternalLink } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFavicon(url: string) {
  try {
    const origin = new URL(url).origin
    // Use Google's Favicon CDN — works for SharePoint, Teams etc.
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`
  } catch {
    return null
  }
}

// Color palette for letter-avatar fallback
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-orange-500',
  'bg-rose-600', 'bg-cyan-600', 'bg-amber-500', 'bg-fuchsia-600',
]
function avatarColor(label: string) {
  const i = (label.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

const KATEGORIE_VORSCHLAEGE = [
  'Allgemein', 'Sharepoint', 'Rechtliches', 'Marketing', 'Tools', 'IT', 'HR',
]

// ─── Link Form ────────────────────────────────────────────────────────────────

interface LinkFormProps {
  link?: InternalLink
  onSave: (data: Omit<InternalLink, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
}

function LinkForm({ link, onSave, onCancel }: LinkFormProps) {
  const [titel, setTitel] = useState(link?.titel ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const [beschreibung, setBeschreibung] = useState(link?.beschreibung ?? '')
  const [kategorie, setKategorie] = useState(link?.kategorie ?? '')
  const [sort_order, setSortOrder] = useState(link?.sort_order ?? 0)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titel.trim() || !url.trim()) { toast.error('Titel und URL sind Pflichtfelder'); return }
    // basic url validation
    try { new URL(url) } catch { toast.error('Bitte eine gültige URL eingeben (z.B. https://...)'); return }
    setSaving(true)
    try {
      await onSave({ titel: titel.trim(), url: url.trim(), beschreibung: beschreibung.trim() || null, kategorie: kategorie.trim() || null, sort_order })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Titel *</label>
          <input className={inputCls} value={titel} onChange={e => setTitel(e.target.value)} placeholder="z.B. PX Sharepoint" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>URL *</label>
          <input className={inputCls} value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://..." />
        </div>
        <div>
          <label className={labelCls}>Kategorie</label>
          <input
            className={inputCls}
            value={kategorie}
            onChange={e => setKategorie(e.target.value)}
            placeholder="z.B. Sharepoint"
            list="kategorien-list"
          />
          <datalist id="kategorien-list">
            {KATEGORIE_VORSCHLAEGE.map(k => <option key={k} value={k} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Reihenfolge</label>
          <input className={inputCls} type="number" value={sort_order} onChange={e => setSortOrder(Number(e.target.value))} min={0} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Beschreibung</label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={beschreibung} onChange={e => setBeschreibung(e.target.value)} placeholder="Kurze Beschreibung des Links..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? 'Speichern…' : link ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  )
}

// ─── Link Card ────────────────────────────────────────────────────────────────

interface LinkCardProps {
  key?: React.Key
  link: InternalLink
  isAdmin: boolean
  onEdit: (link: InternalLink) => void
  onDelete: (link: InternalLink) => void
}

function LinkCard({ link, isAdmin, onEdit, onDelete }: LinkCardProps) {
  const favicon = getFavicon(link.url)
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group flex items-start gap-4 p-4 bg-slate-800/60 border border-slate-700 rounded-2xl hover:border-slate-600 hover:bg-slate-800/80 transition-all">
      {/* Favicon */}
      <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
        {favicon && !imgError ? (
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          // Letter‑avatar fallback: colored initial instead of a generic icon
          <span className={`w-full h-full flex items-center justify-center text-sm font-bold text-white rounded-xl ${avatarColor(link.titel)}`}>
            {link.titel.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-white hover:text-brand-400 transition-colors truncate text-sm flex items-center gap-1.5 group/link"
          >
            {link.titel}
            <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
          </a>
        </div>
        {link.beschreibung && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{link.beschreibung}</p>
        )}
        <p className="text-xs text-slate-500 mt-1 truncate">{link.url}</p>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(link)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Bearbeiten"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(link)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface LinksPageProps {
  links: InternalLink[]
  isAdmin: boolean
  onCreate: (data: Omit<InternalLink, 'id' | 'created_at' | 'updated_at'>) => Promise<void | InternalLink>
  onUpdate: (id: string, data: Partial<InternalLink>) => Promise<void | InternalLink>
  onDelete: (id: string) => Promise<void>
}

export function LinksPage({ links, isAdmin, onCreate, onUpdate, onDelete }: LinksPageProps) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editLink, setEditLink] = useState<InternalLink | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InternalLink | null>(null)
  const [collapsedKats, setCollapsedKats] = useState<Set<string>>(new Set())

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return links
    return links.filter(l =>
      l.titel.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      (l.beschreibung ?? '').toLowerCase().includes(q) ||
      (l.kategorie ?? '').toLowerCase().includes(q)
    )
  }, [links, search])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, InternalLink[]>()
    for (const l of filtered) {
      const kat = l.kategorie || 'Allgemein'
      if (!map.has(kat)) map.set(kat, [])
      map.get(kat)!.push(l)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'de'))
  }, [filtered])

  function toggleKat(kat: string) {
    setCollapsedKats(prev => {
      const next = new Set(prev)
      next.has(kat) ? next.delete(kat) : next.add(kat)
      return next
    })
  }

  async function handleSaveNew(data: Omit<InternalLink, 'id' | 'created_at' | 'updated_at'>) {
    try {
      await onCreate(data)
      toast.success('Link hinzugefügt!')
      setShowAdd(false)
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleSaveEdit(data: Omit<InternalLink, 'id' | 'created_at' | 'updated_at'>) {
    if (!editLink) return
    try {
      await onUpdate(editLink.id, data)
      toast.success('Link gespeichert!')
      setEditLink(null)
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await onDelete(deleteTarget.id)
      toast.success('Link gelöscht')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen size={22} className="text-brand-400" />
            Interne Links
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Nützliche Links für das Team — {links.length} {links.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-brand-900/40"
          >
            <Plus size={16} /> Link hinzufügen
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Links durchsuchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Empty state */}
      {links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <Link2 size={28} className="text-slate-500" />
          </div>
          <p className="text-slate-300 font-semibold">Noch keine Links vorhanden</p>
          {isAdmin && (
            <p className="text-slate-500 text-sm mt-1">Füge den ersten Link über den Button oben hinzu.</p>
          )}
        </div>
      )}

      {/* No results from search */}
      {links.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          Keine Links für „{search}" gefunden.
        </div>
      )}

      {/* Grouped link list */}
      {grouped.map(([kat, katLinks]) => {
        const collapsed = collapsedKats.has(kat)
        return (
          <div key={kat}>
            <button
              onClick={() => toggleKat(kat)}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 hover:text-white transition-colors group/kat"
            >
              {collapsed
                ? <ChevronRight size={14} className="text-slate-500 group-hover/kat:text-slate-300 transition-colors" />
                : <ChevronDown size={14} className="text-slate-500 group-hover/kat:text-slate-300 transition-colors" />
              }
              {kat}
              <span className="ml-1 text-slate-600 font-normal normal-case tracking-normal">({katLinks.length})</span>
            </button>

            {!collapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {katLinks.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    isAdmin={isAdmin}
                    onEdit={setEditLink}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Link hinzufügen" size="md">
        <LinkForm onSave={handleSaveNew} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editLink} onClose={() => setEditLink(null)} title="Link bearbeiten" size="md">
        {editLink && (
          <LinkForm link={editLink} onSave={handleSaveEdit} onCancel={() => setEditLink(null)} />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Link löschen"
        message={`Soll „${deleteTarget?.titel}" wirklich gelöscht werden?`}
        confirmLabel="Löschen"
        danger
      />
    </div>
  )
}
