import React from 'react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { FileText, Plus, Minus, User, Building2, Download, Calculator, Clock, CheckCircle, List, AlertCircle, Archive } from 'lucide-react'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import type { InventarItem, Profile, Verleihschein } from '../types'

interface HeaderInput {
  borrower_type: 'team' | 'extern'
  profile_id?: string | null
  extern_name?: string | null
  extern_firma?: string | null
  extern_email?: string | null
  extern_telefon?: string | null
  abholzeit: string
  rueckgabezeit: string
  prozentsatz: number
  gesamtkosten: number
  zweck?: string | null
  notizen?: string | null
  created_by?: string | null
}

interface LineItemInput {
  item_id: string
  anschaffungspreis: number | null
  tagespreis: number | null
  gesamtpreis: number | null
}

interface VerleihFormularPageProps {
  items: InventarItem[]
  profiles: Profile[]
  scheine: Verleihschein[]
  archivierte: Verleihschein[]
  onSaveVerleihschein: (header: HeaderInput, items: LineItemInput[]) => Promise<void>
  onMarkErledigt: (id: string, itemIds: string[]) => Promise<void>
  onFetchArchive: () => Promise<void>
  currentUserId?: string
}


interface ExternalContact {
  name: string; firma: string; email: string; telefon: string
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-white flex items-center gap-2 text-base mb-2">
        <Icon size={16} className="text-brand-400" /> {title}
      </h2>
      {children}
    </div>
  )
}

function formatDT(dt: string) {
  if (!dt) return '–'
  return new Date(dt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

/** DB returns NUMERIC as string — safely coerce to number */
function toNum(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export function VerleihFormularPage({
  items, profiles, scheine, archivierte,
  onSaveVerleihschein, onMarkErledigt, onFetchArchive, currentUserId,
}: VerleihFormularPageProps) {
  const [tab, setTab] = useState<'neu' | 'aktiv' | 'archiv'>('neu')
  const [saving, setSaving] = useState(false)
  const archiveFetched = useRef(false)

  // Load archive lazily when tab first opened
  useEffect(() => {
    if (tab === 'archiv' && !archiveFetched.current) {
      archiveFetched.current = true
      onFetchArchive()
    }
  }, [tab, onFetchArchive])

  // ── Form state ─────────────────────────────────────────────
  // helper: YYYY-MM-DDTHH:MM for datetime-local inputs
  function defaultDT(hours: number, minutes = 0) {
    const d = new Date()
    d.setHours(hours, minutes, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  const verleihItems = useMemo(() => items.filter(i => i.is_verleihartikel), [items])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [abholzeit, setAbholzeit] = useState(() => defaultDT(9))
  const [rueckgabezeit, setRueckgabezeit] = useState(() => defaultDT(18))
  const [prozentsatz, setProzentsatz] = useState('10')
  const [borrowerType, setBorrowerType] = useState<'team' | 'extern'>('team')
  const [profileId, setProfileId] = useState('')
  const [extern, setExtern] = useState<ExternalContact>({ name: '', firma: '', email: '', telefon: '' })
  const [zweck, setZweck] = useState('')
  const [notizen, setNotizen] = useState('')

  function toggleItem(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const selectedItems = useMemo(() => verleihItems.filter(i => selectedIds.has(i.id)), [verleihItems, selectedIds])

  const dauer = useMemo(() => {
    if (!abholzeit || !rueckgabezeit) return null
    const diff = new Date(rueckgabezeit).getTime() - new Date(abholzeit).getTime()
    return diff > 0 ? diff / (1000 * 60 * 60 * 24) : null
  }, [abholzeit, rueckgabezeit])

  const percent = parseFloat(prozentsatz) || 0
  const itemCosts = useMemo(() =>
    selectedItems.map(item => ({
      item,
      tagespreis: toNum(item.anschaffungspreis) > 0 ? toNum(item.anschaffungspreis) * (percent / 100) : 0,
      gesamtpreis: toNum(item.anschaffungspreis) > 0 && dauer ? toNum(item.anschaffungspreis) * (percent / 100) * dauer : 0,
    })), [selectedItems, percent, dauer])

  const gesamtkosten = itemCosts.reduce((s, r) => s + r.gesamtpreis, 0)
  const borrower = borrowerType === 'team' ? profiles.find(p => p.id === profileId) : null
  const borrowerName = borrowerType === 'team' ? (borrower?.full_name || '') : extern.name
  const canSubmit = selectedIds.size > 0 && abholzeit && rueckgabezeit && borrowerName && !saving

  // ── Date-overlap availability ───────────────────────────────────
  // An item is blocked only if an existing schein overlaps the selected window.
  // Items with status 'Ausgeliehen' but no date overlap are still bookable.
  const conflictMap = useMemo(() => {
    const map = new Map<string, Verleihschein>() // item_id -> conflicting schein
    if (!abholzeit || !rueckgabezeit) return map
    const reqStart = new Date(abholzeit).getTime()
    const reqEnd   = new Date(rueckgabezeit).getTime()
    for (const s of scheine) {
      const sStart = new Date(s.abholzeit).getTime()
      const sEnd   = new Date(s.rueckgabezeit).getTime()
      // Overlap if: sStart < reqEnd AND sEnd > reqStart
      if (sStart < reqEnd && sEnd > reqStart) {
        for (const li of s.items || []) {
          if (!map.has(li.item_id)) map.set(li.item_id, s)
        }
      }
    }
    return map
  }, [scheine, abholzeit, rueckgabezeit])

  function resetForm() {
    setSelectedIds(new Set()); setAbholzeit(defaultDT(9)); setRueckgabezeit(defaultDT(18))
    setProzentsatz('10'); setBorrowerType('team'); setProfileId('')
    setExtern({ name: '', firma: '', email: '', telefon: '' })
    setZweck(''); setNotizen('')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const header = {
        borrower_type: borrowerType,
        profile_id: borrowerType === 'team' ? profileId || null : null,
        extern_name: borrowerType === 'extern' ? extern.name || null : null,
        extern_firma: borrowerType === 'extern' ? extern.firma || null : null,
        extern_email: borrowerType === 'extern' ? extern.email || null : null,
        extern_telefon: borrowerType === 'extern' ? extern.telefon || null : null,
        abholzeit,
        rueckgabezeit,
        prozentsatz: percent,
        gesamtkosten,
        zweck: zweck || null,
        notizen: notizen || null,
        created_by: currentUserId || null,
      }
      const lineItems = itemCosts.map(r => ({
        item_id: r.item.id,
        anschaffungspreis: r.item.anschaffungspreis,
        tagespreis: r.tagespreis,
        gesamtpreis: r.gesamtpreis,
      }))
      await onSaveVerleihschein(header, lineItems)
      generatePDF()
      toast.success('Verleihschein gespeichert! Geräte sind als Ausgeliehen markiert.')
      resetForm()
      setTab('aktiv')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    } finally {
      setSaving(false)
    }
  }

  function generatePDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, margin = 20
    let y = margin

    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('PX INVENTAR – VERLEIHSCHEIN', margin, 20)
    y = 40

    doc.setTextColor(80, 90, 110); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Erstellt: ${new Date().toLocaleString('de-DE')}`, margin, y); y += 10

    function sectionHeader(title: string) {
      doc.setFillColor(30, 41, 59); doc.rect(margin, y - 4, W - 2 * margin, 8, 'F')
      doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
      doc.text(title.toUpperCase(), margin + 2, y + 1); y += 8
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59)
    }
    function row(label: string, value: string) {
      doc.setFontSize(10); doc.setTextColor(100, 116, 139)
      doc.text(label, margin, y); doc.setTextColor(15, 23, 42)
      doc.text(value, margin + 55, y); y += 6.5
    }

    sectionHeader('Ausleiher'); y += 2
    if (borrowerType === 'team') {
      row('Name:', borrower?.full_name || '–'); row('E-Mail:', borrower?.email || '–')
    } else {
      row('Name:', extern.name || '–'); row('Firma:', extern.firma || '–')
      row('E-Mail:', extern.email || '–'); row('Telefon:', extern.telefon || '–')
    }
    y += 4

    sectionHeader('Zeitraum'); y += 2
    row('Abholung:', formatDT(abholzeit)); row('Rückgabe:', formatDT(rueckgabezeit))
    row('Dauer:', dauer ? `${dauer.toFixed(1)} Tag(e)` : '–')
    if (zweck) row('Zweck:', zweck); y += 4

    sectionHeader('Verliehene Artikel'); y += 2
    doc.setFillColor(51, 65, 85); doc.rect(margin, y - 4, W - 2 * margin, 7, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
    doc.text('Gerät / Modell', margin + 2, y); doc.text('PX-Nr.', margin + 75, y)
    doc.text('Kaufpreis', margin + 103, y); doc.text(`Tagesrate (${percent}%)`, margin + 127, y)
    doc.text('Gesamt', margin + 158, y); y += 5
    doc.setFont('helvetica', 'normal')
    itemCosts.forEach((r, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(241, 245, 249); doc.rect(margin, y - 4, W - 2 * margin, 7, 'F') }
      doc.setTextColor(15, 23, 42); doc.setFontSize(9)
      doc.text(`${r.item.geraet}${r.item.modell ? ' – ' + r.item.modell : ''}`.slice(0, 35), margin + 2, y)
      doc.text(r.item.px_nummer || '–', margin + 75, y)
      doc.text(toNum(r.item.anschaffungspreis) > 0 ? `€ ${toNum(r.item.anschaffungspreis).toFixed(2)}` : '–', margin + 103, y)
      doc.text(r.tagespreis > 0 ? `€ ${r.tagespreis.toFixed(2)}` : '–', margin + 127, y)
      doc.text(r.gesamtpreis > 0 ? `€ ${r.gesamtpreis.toFixed(2)}` : '–', margin + 158, y); y += 7
    })
    y += 2
    doc.setFillColor(15, 23, 42); doc.rect(margin, y - 4, W - 2 * margin, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('GESAMTBETRAG:', margin + 2, y + 1)
    doc.text(gesamtkosten > 0 ? `€ ${gesamtkosten.toFixed(2)}` : '–', margin + 158, y + 1); y += 14

    if (notizen) {
      sectionHeader('Notizen'); y += 2
      doc.setTextColor(60, 60, 60); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(notizen, W - 2 * margin - 4)
      doc.text(lines, margin + 2, y); y += lines.length * 5 + 8
    }

    if (y > 250) { doc.addPage(); y = margin }
    y = Math.max(y, 230)
    doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.4)
    doc.line(margin, y, margin + 70, y)
    doc.setTextColor(100, 116, 139); doc.setFontSize(8)
    doc.text('Unterschrift Ausleiher', margin, y + 5); doc.text(borrowerName || '_________________', margin, y + 10)
    doc.line(W - margin - 70, y, W - margin, y)
    doc.text('Unterschrift PX-Mitarbeiter', W - margin - 70, y + 5); doc.text('Pixelschickeria', W - margin - 70, y + 10)
    doc.setFontSize(7.5); doc.setTextColor(180, 180, 180)
    doc.text('Pixelschickeria GmbH · PX Inventar Management', margin, 290)
    doc.save(`PX-Verleihschein_${borrowerName.replace(/\s+/g, '_') || 'Extern'}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Erledigt handler ───────────────────────────────────────
  async function handleErledigt(schein: Verleihschein) {
    try {
      const itemIds = schein.items?.map(i => i.item_id) || []
      await onMarkErledigt(schein.id, itemIds)
      toast.success('Verleihschein abgeschlossen. Geräte wieder verfügbar.')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText size={24} className="text-brand-400" /> Verleih-Formular
          </h1>
          <p className="text-slate-400 text-sm mt-1">Verleihscheine erfassen und verwalten</p>
        </div>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {([
            ['neu',   'Neuer Schein',                           Plus],
            ['aktiv', `Aktive Scheine (${scheine.length})`,     List],
            ['archiv',`Archiv (${archivierte.length})`,         Archive],
          ] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Neuer Schein ──────────────────────────────── */}
      {tab === 'neu' && (
        <>
          {/* Artikel */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2"><Plus size={16} className="text-brand-400" /> Artikel auswählen</h2>
            {verleihItems.length === 0 ? (
              <p className="text-slate-500 text-sm">Keine Verleihartikel im Inventar markiert.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {verleihItems.map(item => {
                  const conflict = conflictMap.get(item.id)  // overlapping booking
                  const selected = selectedIds.has(item.id)
                  const blocked  = !!conflict && !selected   // can't pick if conflict (unless already selected)
                  const currentlyOut = item.status === 'Ausgeliehen' && !conflict

                  // Label for the status badge
                  const conflictName = conflict
                    ? (conflict.borrower_type === 'team'
                        ? conflict.profile?.full_name
                        : conflict.extern_name) || 'Belegt'
                    : null

                  return (
                    <label key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                      ${ selected  ? 'border-brand-500/50 bg-brand-500/10 cursor-pointer'
                       : blocked   ? 'border-red-800/40 bg-red-900/10 opacity-60 cursor-not-allowed'
                       : 'border-slate-700 hover:border-slate-600 bg-slate-900/40 cursor-pointer'}`}>
                      <input type="checkbox" checked={selected} disabled={blocked}
                        onChange={() => toggleItem(item.id)} className="w-4 h-4 accent-brand-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.geraet}{item.modell ? ` – ${item.modell}` : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.px_nummer && <span className="font-mono mr-2">{item.px_nummer}</span>}
                          {toNum(item.anschaffungspreis) > 0 && <span>Kaufpreis: € {toNum(item.anschaffungspreis).toFixed(2)}</span>}
                          {blocked && conflictName && (
                            <span className="ml-2 text-red-400">· Belegt von: {conflictName}</span>
                          )}
                        </p>
                      </div>
                      {/* Status badge */}
                      {conflict ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border shrink-0 bg-red-500/20 text-red-300 border-red-500/20">
                          Belegt
                        </span>
                      ) : currentlyOut ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border shrink-0 bg-amber-500/20 text-amber-300 border-amber-500/20" title="Aktuell ausgeliehen, aber in diesem Zeitraum verfügbar">
                          Ausgeliehen ✓
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full border shrink-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/20">
                          Frei
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Zeitraum */}
          <Section title="Zeitraum" icon={Clock}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Abholzeitpunkt</label><input type="datetime-local" value={abholzeit} onChange={e => setAbholzeit(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Rückgabezeitpunkt</label><input type="datetime-local" value={rueckgabezeit} onChange={e => setRueckgabezeit(e.target.value)} className={inputCls} /></div>
            </div>
            {dauer !== null && <p className="text-sm text-slate-300">Dauer: <span className="font-semibold text-white">{dauer.toFixed(1)} Tag(e)</span></p>}
            <div><label className={labelCls}>Verwendungszweck</label><input type="text" value={zweck} onChange={e => setZweck(e.target.value)} placeholder="z.B. Messe, Fotoshooting …" className={inputCls} /></div>
          </Section>

          {/* Mietkosten */}
          <Section title="Mietkosten" icon={Calculator}>
            <div className="flex items-end gap-4">
              <div className="w-48">
                <label className={labelCls}>Tagessatz (% vom Kaufpreis)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.5" value={prozentsatz} onChange={e => setProzentsatz(e.target.value)} className={inputCls + ' pr-8'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 pb-2.5">Kaufpreis × % × Tage</p>
            </div>
            {selectedItems.length > 0 && (
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700">
                    <th className="text-left py-2.5 px-4 text-xs text-slate-400 font-semibold">Artikel</th>
                    <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-semibold">Kaufpreis</th>
                    <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-semibold">Tagesrate</th>
                    <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-semibold">Gesamt</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {itemCosts.map(({ item, tagespreis, gesamtpreis }) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 text-white">{item.geraet}{item.modell ? ` – ${item.modell}` : ''}{item.px_nummer && <span className="text-slate-500 font-mono text-xs ml-2">{item.px_nummer}</span>}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-right">{toNum(item.anschaffungspreis) > 0 ? `€ ${toNum(item.anschaffungspreis).toFixed(2)}` : '–'}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-right">{tagespreis > 0 ? `€ ${tagespreis.toFixed(2)}` : '–'}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-white">{gesamtpreis > 0 ? `€ ${gesamtpreis.toFixed(2)}` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-slate-600 bg-slate-800/60">
                    <td colSpan={3} className="py-3 px-4 text-right font-bold text-white">Gesamtbetrag:</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-300 text-lg">{gesamtkosten > 0 ? `€ ${gesamtkosten.toFixed(2)}` : '–'}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Ausleiher */}
          <Section title="Ausleiher" icon={User}>
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit border border-slate-700 mb-4">
              {(['team', 'extern'] as const).map(t => (
                <button key={t} onClick={() => setBorrowerType(t)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${borrowerType === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {t === 'team' ? <><User size={14} /> Team-Mitglied</> : <><Building2 size={14} /> Externer Kontakt</>}
                </button>
              ))}
            </div>
            {borrowerType === 'team' ? (
              <div><label className={labelCls}>Mitarbeiter</label>
                <select value={profileId} onChange={e => setProfileId(e.target.value)} className={inputCls}>
                  <option value="">– Bitte wählen –</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Name *</label><input value={extern.name} onChange={e => setExtern(p => ({ ...p, name: e.target.value }))} placeholder="Max Mustermann" className={inputCls} /></div>
                <div><label className={labelCls}>Firma</label><input value={extern.firma} onChange={e => setExtern(p => ({ ...p, firma: e.target.value }))} placeholder="Muster GmbH" className={inputCls} /></div>
                <div><label className={labelCls}>E-Mail</label><input type="email" value={extern.email} onChange={e => setExtern(p => ({ ...p, email: e.target.value }))} placeholder="max@example.com" className={inputCls} /></div>
                <div><label className={labelCls}>Telefon</label><input type="tel" value={extern.telefon} onChange={e => setExtern(p => ({ ...p, telefon: e.target.value }))} placeholder="+43 …" className={inputCls} /></div>
              </div>
            )}
          </Section>

          {/* Notizen */}
          <Section title="Interne Notizen" icon={Minus}>
            <textarea value={notizen} onChange={e => setNotizen(e.target.value)} rows={3} placeholder="Besondere Vereinbarungen, Zubehör, Zustand …" className={inputCls} />
          </Section>

          {/* CTA */}
          <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div>
              {!canSubmit && <p className="text-xs text-slate-500">
                {selectedIds.size === 0 ? 'Artikel auswählen' : !abholzeit || !rueckgabezeit ? 'Zeitraum eingeben' : 'Ausleiher angeben'}
              </p>}
              {canSubmit && gesamtkosten > 0 && <p className="text-sm text-white">Gesamt: <span className="font-bold text-brand-300 text-lg">€ {gesamtkosten.toFixed(2)}</span></p>}
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${canSubmit ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
              {saving ? 'Wird gespeichert…' : 'Speichern & PDF herunterladen'}
            </button>
          </div>
        </>
      )}

      {/* ── TAB: Aktive Scheine ────────────────────────────── */}
      {tab === 'aktiv' && (
        <div className="space-y-4">
          {scheine.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <CheckCircle size={48} className="mb-3 opacity-40 text-emerald-500" />
              <p className="text-lg font-medium">Keine aktiven Verleihscheine</p>
              <p className="text-sm">Alle Geräte sind zurückgegeben.</p>
            </div>
          ) : scheine.map(schein => {
            const name = schein.borrower_type === 'team' ? (schein.profile?.full_name || '–') : (schein.extern_name || '–')
            const firma = schein.extern_firma ? ` (${schein.extern_firma})` : ''
            const itemIds = schein.items?.map(i => i.item_id) || []
            const isOverdue = schein.rueckgabezeit && new Date(schein.rueckgabezeit) < new Date()
            return (
              <div key={schein.id} className={`border rounded-2xl overflow-hidden ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-slate-700 bg-slate-800/60'}`}>
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1">
                    <p className="font-semibold text-white flex items-center gap-2">
                      {isOverdue && <AlertCircle size={15} className="text-red-400" />}
                      {name}{firma}
                      {schein.borrower_type === 'team' && <span className="text-xs text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full border border-sky-500/20">Team</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      📦 {schein.items?.length || 0} Artikel · {formatDT(schein.abholzeit)} → {formatDT(schein.rueckgabezeit)}
                      {isOverdue && <span className="text-red-400 ml-2 font-semibold">Überfällig!</span>}
                    </p>
                    {schein.zweck && <p className="text-xs text-slate-500">Zweck: {schein.zweck}</p>}
                    {schein.gesamtkosten != null && toNum(schein.gesamtkosten) > 0 && <p className="text-xs text-brand-300 font-semibold">€ {toNum(schein.gesamtkosten).toFixed(2)}</p>}
                  </div>
                  <button onClick={() => handleErledigt(schein)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
                    <CheckCircle size={15} /> Erledigt
                  </button>
                </div>
                {schein.items && schein.items.length > 0 && (
                  <div className="border-t border-slate-700 divide-y divide-slate-800">
                    {schein.items.map(li => (
                      <div key={li.id} className="flex items-center justify-between px-5 py-2.5">
                        <p className="text-sm text-slate-300">{li.item?.geraet}{li.item?.modell ? ` – ${li.item.modell}` : ''}{li.item?.px_nummer && <span className="font-mono text-xs text-slate-500 ml-2">{li.item.px_nummer}</span>}</p>
                        {li.gesamtpreis != null && toNum(li.gesamtpreis) > 0 && <p className="text-xs text-slate-400">€ {toNum(li.gesamtpreis).toFixed(2)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: Archiv ─────────────────────────────────────── */}
      {tab === 'archiv' && (
        <div className="space-y-3">
          {archivierte.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Archive size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Noch keine abgeschlossenen Scheine</p>
            </div>
          ) : archivierte.map(schein => {
            const name = schein.borrower_type === 'team'
              ? (schein.profile?.full_name || schein.profile?.email || '–')
              : [schein.extern_name, schein.extern_firma].filter(Boolean).join(' · ') || '–'
            return (
              <div key={schein.id} className="border border-slate-700/60 bg-slate-800/30 rounded-2xl overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-300 flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-500 opacity-70" />
                      {name}
                      {schein.borrower_type === 'team' && (
                        <span className="text-xs text-sky-400/70 bg-sky-500/10 px-1.5 py-0.5 rounded-full border border-sky-500/20">Team</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      📦 {schein.items?.length || 0} Artikel
                      &nbsp;·&nbsp;
                      {formatDT(schein.abholzeit)} → {formatDT(schein.rueckgabezeit)}
                    </p>
                    {schein.zweck && <p className="text-xs text-slate-600">Zweck: {schein.zweck}</p>}
                    <p className="text-xs text-slate-700">
                      Erledigt am: {schein.erledigt_am ? formatDT(schein.erledigt_am) : '–'}
                    </p>
                    {schein.gesamtkosten != null && toNum(schein.gesamtkosten) > 0 && (
                      <p className="text-xs text-slate-500 font-semibold">€ {toNum(schein.gesamtkosten).toFixed(2)}</p>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40 shrink-0 mt-1">
                    Erledigt
                  </span>
                </div>
                {schein.items && schein.items.length > 0 && (
                  <div className="border-t border-slate-700/40 divide-y divide-slate-800/60">
                    {schein.items.map(li => (
                      <div key={li.id} className="flex items-center justify-between px-5 py-2">
                        <p className="text-sm text-slate-500">
                          {li.item?.geraet}{li.item?.modell ? ` – ${li.item.modell}` : ''}
                          {li.item?.px_nummer && (
                            <span className="font-mono text-xs text-slate-600 ml-2">{li.item.px_nummer}</span>
                          )}
                        </p>
                        {li.gesamtpreis != null && toNum(li.gesamtpreis) > 0 && (
                          <p className="text-xs text-slate-600">€ {toNum(li.gesamtpreis).toFixed(2)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}



