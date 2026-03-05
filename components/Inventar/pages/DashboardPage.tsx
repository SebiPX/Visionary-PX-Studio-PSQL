import React, { useMemo, useState } from 'react'
import {
  Package, AlertCircle, CheckCircle, RefreshCw,
  ExternalLink, Calendar, ArrowRight, Clock, Settings, Key
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { InventarItem, InventarLoan, InternalLink, Verleihschein, Login } from '../types'
import type { DashboardConfig } from '../hooks/useDashboardConfig'
import { DashboardConfigDrawer } from '../components/DashboardConfigDrawer'
import { AppView } from '../../../types'
import { RecentGenerations } from '../../Dashboard'

// ─── Avatar colour helper ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-orange-500',
  'bg-rose-600', 'bg-cyan-600', 'bg-amber-500', 'bg-fuchsia-600',
]
function avatarColor(label: string) {
  return AVATAR_COLORS[(label.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).origin)}&sz=32` }
  catch { return null }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatPill({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div className={`flex items-center gap-3 bg-slate-800/60 border rounded-xl px-4 py-3 ${alert ? 'border-red-500/40' : 'border-slate-700'}`}>
      <span className={`text-2xl font-bold ${alert ? 'text-red-300' : 'text-white'}`}>{value}</span>
      <span className="text-xs text-slate-400 leading-tight">{label}</span>
    </div>
  )
}

function LinkCard({ link }: { link: InternalLink }) {
  const [imgError, setImgError] = useState(false)
  const favicon = getFavicon(link.url)
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700 hover:border-slate-500 rounded-xl p-3 transition-all group"
    >
      <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
        {favicon && !imgError ? (
          <img src={favicon} alt="" className="w-4 h-4 object-contain" onError={() => setImgError(true)} />
        ) : (
          <span className={`w-full h-full flex items-center justify-center text-xs font-bold text-white rounded-lg ${avatarColor(link.titel)}`}>
            {link.titel.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{link.titel}</p>
        {link.beschreibung && <p className="text-xs text-slate-500 truncate">{link.beschreibung}</p>}
      </div>
      <ExternalLink size={12} className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
    </a>
  )
}

function PinnedLoginCard({ login }: { login: Login }) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarColor(login.name || login.id)}`}>
        {(login.name || login.website || '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{login.name || login.website}</p>
        {login.login_name && <p className="text-xs text-slate-500 truncate">{login.login_name}</p>}
      </div>
      {login.website && (
        <a href={login.website} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface DashboardPageProps {
  items: InventarItem[]
  loans: InventarLoan[]
  links: InternalLink[]
  scheine: Verleihschein[]
  logins: Login[]
  config: DashboardConfig
  onConfigSave: (next: DashboardConfig) => void
  configSaving: boolean
  setView?: (view: AppView) => void
  navigateToItem?: (view: AppView, itemId: string) => void
}

export function DashboardPage({
  items, loans, links, scheine, logins, config, onConfigSave, configSaving, setView, navigateToItem
}: DashboardPageProps) {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    available: items.filter(i => i.status === 'Vorhanden').length,
    loaned: items.filter(i => i.status === 'Ausgeliehen').length,
    defective: items.filter(i => i.status === 'Defekt' || i.status === 'Fehlt').length,
  }), [items])

  // All unique link categories
  const allLinkCategories = useMemo(() => {
    const cats = new Set(links.map(l => l.kategorie || 'Allgemein'))
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'de'))
  }, [links])

  // Links filtered by config
  const filteredLinks = useMemo(() => {
    if (!config.show_links) return []
    return links.filter(l => {
      const cat = l.kategorie || 'Allgemein'
      return config.link_categories === null || config.link_categories.includes(cat)
    })
  }, [links, config.show_links, config.link_categories])

  // Grouped filtered links
  const linksByCategory = useMemo(() => {
    const map: Record<string, InternalLink[]> = {}
    filteredLinks.forEach(l => {
      const cat = l.kategorie || 'Allgemein'
      if (!map[cat]) map[cat] = []
      map[cat].push(l)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'de'))
  }, [filteredLinks])

  // Upcoming Verleihscheine (next 14 days)
  const upcomingScheine = useMemo(() => {
    const now = new Date()
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    return scheine
      .filter(s => s.status === 'aktiv' && new Date(s.abholzeit) >= now && new Date(s.abholzeit) <= in14)
      .sort((a, b) => new Date(a.abholzeit).getTime() - new Date(b.abholzeit).getTime())
      .slice(0, 8)
  }, [scheine])

  // Active loans
  const activeLoans = useMemo(() => loans.filter(l => !l.zurueck_am).slice(0, 5), [loans])

  // Pinned logins
  const pinnedLogins = useMemo(() =>
    logins.filter(l => config.pinned_login_ids.includes(l.id))
  , [logins, config.pinned_login_ids])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function daysUntil(iso: string) {
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
    if (diff === 0) return 'Heute'
    if (diff === 1) return 'Morgen'
    return `in ${diff} Tagen`
  }

  const showMiddleRow = config.show_calendar || config.show_loans

  return (
    <>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Willkommen im PX INTERN</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          >
            <Settings size={14} />
            Anpassen
          </button>
        </div>

        {/* ── Pinned Logins (if any) ─────────────────────────────────────── */}
        {pinnedLogins.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Key size={16} className="text-violet-400" />
                Meine Logins
              </h2>
              <button onClick={() => navigate('/logins')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Alle <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {pinnedLogins.map(login => <PinnedLoginCard key={login.id} login={login} />)}
            </div>
          </section>
        )}

        {/* ── Internal Links ─────────────────────────────────────────────── */}
        {config.show_links && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ExternalLink size={16} className="text-blue-400" />
                Interne Links
              </h2>
              <button onClick={() => navigate('/links')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Alle verwalten <ArrowRight size={12} />
              </button>
            </div>
            {filteredLinks.length === 0 ? (
              <p className="text-slate-500 text-sm">Keine Links für die gewählten Kategorien.</p>
            ) : (
              <div className="space-y-5">
                {linksByCategory.map(([category, categoryLinks]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{category}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {categoryLinks.map(link => <LinkCard key={link.id} link={link} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Calendar + Active Loans ─────────────────────────────────────── */}
        {showMiddleRow && (
          <div className={`grid grid-cols-1 gap-6 ${config.show_calendar && config.show_loans ? 'lg:grid-cols-2' : ''}`}>

            {config.show_calendar && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Calendar size={16} className="text-violet-400" />
                    Kommende Ausleihen
                    {upcomingScheine.length > 0 && (
                      <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20">
                        {upcomingScheine.length}
                      </span>
                    )}
                  </h2>
                  <button onClick={() => navigate('/kalender')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    Kalender <ArrowRight size={12} />
                  </button>
                </div>
                {upcomingScheine.length === 0 ? (
                  <p className="text-slate-500 text-sm px-5 py-4">Keine Ausleihen in den nächsten 14 Tagen.</p>
                ) : (
                  <div className="divide-y divide-slate-700/60">
                    {upcomingScheine.map(s => (
                      <div key={s.id} className="px-5 py-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Calendar size={15} className="text-violet-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">
                            {s.borrower_type === 'extern'
                              ? (s.extern_name || s.extern_firma || 'Extern')
                              : (s.profile?.full_name || 'Intern')}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(s.abholzeit)}</p>
                          {s.zweck && <p className="text-xs text-slate-500 truncate">{s.zweck}</p>}
                        </div>
                        <span className="text-xs text-violet-400 shrink-0 font-medium">{daysUntil(s.abholzeit)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {config.show_loans && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" />
                    Aktive Ausleihen
                    {activeLoans.length > 0 && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {loans.filter(l => !l.zurueck_am).length}
                      </span>
                    )}
                  </h2>
                  <button onClick={() => navigate('/verleih')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    Alle <ArrowRight size={12} />
                  </button>
                </div>
                {activeLoans.length === 0 ? (
                  <p className="text-slate-500 text-sm px-5 py-4">Keine aktiven Ausleihen.</p>
                ) : (
                  <div className="divide-y divide-slate-700/60">
                    {activeLoans.map(loan => {
                      const overdue = loan.zurueck_bis && new Date(loan.zurueck_bis) < new Date()
                      return (
                        <div key={loan.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {loan.item?.geraet}
                              <span className="text-slate-400 font-normal"> → {loan.profile?.full_name || loan.mitarbeiter_name}</span>
                            </p>
                            <p className="text-xs text-slate-500">{loan.item?.px_nummer}{loan.zweck ? ` · ${loan.zweck}` : ''}</p>
                          </div>
                          {overdue && <span className="text-xs text-red-400 shrink-0 font-semibold">Überfällig</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── Inventar Stats ─────────────────────────────────────────────── */}
        {config.show_inventory_stats && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <Package size={14} /> Inventar Übersicht
              </h2>
              <button onClick={() => navigate('/inventar')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Inventar öffnen <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Gesamt Artikel" value={stats.total} />
              <StatPill label="Verfügbar" value={stats.available} />
              <StatPill label="Ausgeliehen" value={stats.loaned} />
              <StatPill label="Defekt / Fehlt" value={stats.defective} alert={stats.defective > 0} />
            </div>
          </section>
        )}

      </div>

      {/* ── Recent Generations ─────────────────────────────────────────────── */}
      <div className="mt-8 border-t border-white/5 pt-8 max-w-7xl mx-auto px-6">
          <RecentGenerations setView={setView} navigateToItem={navigateToItem} isActive={true} />
      </div>

      {/* Config Drawer */}
      <DashboardConfigDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        config={config}
        onSave={onConfigSave}
        saving={configSaving}
        allLinkCategories={allLinkCategories}
        allLogins={logins}
      />
    </>
  )
}
