import React, { useState, useMemo } from 'react'
import { X, Link2, BarChart2, Calendar, Clock, Key, Search, Check } from 'lucide-react'
import type { DashboardConfig } from '../hooks/useDashboardConfig'
import type { InternalLink, Login } from '../types'

interface DashboardConfigDrawerProps {
  open: boolean
  onClose: () => void
  config: DashboardConfig
  onSave: (next: DashboardConfig) => void
  saving: boolean
  allLinkCategories: string[]
  allLogins: Login[]
}

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-foreground group-hover:text-blue-300 transition-colors">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-blue-600 border-blue-600' : 'bg-muted border-border/80'
        }`}
      >
        <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </label>
  )
}

export function DashboardConfigDrawer({
  open, onClose, config, onSave, saving, allLinkCategories, allLogins
}: DashboardConfigDrawerProps) {
  const [draft, setDraft] = useState<DashboardConfig>(config)
  const [loginSearch, setLoginSearch] = useState('')

  // Sync draft when external config changes (e.g. after initial load)
  React.useEffect(() => { setDraft(config) }, [config])

  const filteredLogins = useMemo(() =>
    allLogins.filter(l =>
      !loginSearch || (l.name || '').toLowerCase().includes(loginSearch.toLowerCase())
      || (l.website || '').toLowerCase().includes(loginSearch.toLowerCase())
    )
  , [allLogins, loginSearch])

  function toggleCategory(cat: string) {
    const current = draft.link_categories
    if (current === null) {
      // currently showing all — switch to all-except-this
      const next = allLinkCategories.filter(c => c !== cat)
      setDraft(d => ({ ...d, link_categories: next.length === allLinkCategories.length ? null : next }))
    } else if (current.includes(cat)) {
      const next = current.filter(c => c !== cat)
      setDraft(d => ({ ...d, link_categories: next }))
    } else {
      const next = [...current, cat]
      setDraft(d => ({ ...d, link_categories: next.length === allLinkCategories.length ? null : next }))
    }
  }

  function isCategoryActive(cat: string) {
    return draft.link_categories === null || draft.link_categories.includes(cat)
  }

  function toggleLogin(id: string) {
    setDraft(d => ({
      ...d,
      pinned_login_ids: d.pinned_login_ids.includes(id)
        ? d.pinned_login_ids.filter(i => i !== id)
        : [...d.pinned_login_ids, id],
    }))
  }

  function handleSave() {
    onSave(draft)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground text-base">Dashboard anpassen</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* ── Widgets ─────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
              <BarChart2 size={12} /> Widgets
            </h3>
            <div className="divide-y divide-border">
              <Toggle
                label="Interne Links"
                sub="Link-Kacheln im Dashboard"
                checked={draft.show_links}
                onChange={v => setDraft(d => ({ ...d, show_links: v }))}
              />
              <Toggle
                label="Kommende Ausleihen"
                sub="Verleihscheine der nächsten 14 Tage"
                checked={draft.show_calendar}
                onChange={v => setDraft(d => ({ ...d, show_calendar: v }))}
              />
              <Toggle
                label="Aktive Ausleihen"
                sub="Aktuell ausgeliehene Geräte"
                checked={draft.show_loans}
                onChange={v => setDraft(d => ({ ...d, show_loans: v }))}
              />
              <Toggle
                label="Inventar Statistiken"
                sub="Gesamt / Verfügbar / Defekt"
                checked={draft.show_inventory_stats}
                onChange={v => setDraft(d => ({ ...d, show_inventory_stats: v }))}
              />
            </div>
          </section>

          {/* ── Link Categories ──────────────────────────────────────────── */}
          {draft.show_links && allLinkCategories.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Link2 size={12} /> Sichtbare Link-Kategorien
                </h3>
                <button
                  onClick={() => setDraft(d => ({ ...d, link_categories: null }))}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Alle
                </button>
              </div>
              <div className="space-y-1">
                {allLinkCategories.map(cat => {
                  const active = isCategoryActive(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        active ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20' : 'text-muted-foreground hover:bg-card'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        active ? 'bg-blue-600 border-blue-600' : 'border-border/80'
                      }`}>
                        {active && <Check size={10} className="text-foreground" />}
                      </span>
                      {cat}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Pinned Logins ────────────────────────────────────────────── */}
          {allLogins.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <Key size={12} /> Logins anpinnen
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Angeheftete Logins werden als Widget im Dashboard angezeigt.</p>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={loginSearch}
                  onChange={e => setLoginSearch(e.target.value)}
                  placeholder="Logins suchen…"
                  className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {filteredLogins.map(login => {
                  const pinned = draft.pinned_login_ids.includes(login.id)
                  return (
                    <button
                      key={login.id}
                      onClick={() => toggleLogin(login.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        pinned ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20' : 'text-muted-foreground hover:bg-card'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        pinned ? 'bg-violet-600 border-violet-600' : 'border-border/80'
                      }`}>
                        {pinned && <Check size={10} className="text-foreground" />}
                      </span>
                      <span className="flex-1 truncate">{login.name || login.website || login.id}</span>
                      {login.kategorie && <span className="text-xs text-muted-foreground/80 shrink-0">{login.kategorie}</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-border text-sm text-foreground/90 hover:bg-card transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-foreground text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  )
}
