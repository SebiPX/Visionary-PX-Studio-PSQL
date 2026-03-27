import React from 'react'
import { useState, useMemo, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { InventarFilters } from '../components/inventar-filters/InventarFilters'
import { InventarTable } from '../components/Inventar/InventarTable'
import type { SortKey, SortDir } from '../components/Inventar/InventarTable'
import { ItemForm } from '../components/Inventar/ItemForm'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { InventarItem, Profile } from '../types'

interface InventarPageProps {
  items: InventarItem[]
  isAdmin: boolean
  profiles?: Profile[]
  onCreateItem: (data: Partial<InventarItem>, imageFile?: File) => Promise<void>
  onUpdateItem: (id: string, data: Partial<InventarItem>, imageFile?: File) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onSelectItem: (item: InventarItem) => void
}

export function InventarPage({ items, isAdmin, profiles = [], onCreateItem, onUpdateItem, onDeleteItem, onSelectItem }: InventarPageProps) {
  const [search, setSearch] = useState('')
  const [filterGeraet, setFilterGeraet] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOrt, setFilterOrt] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('geraet')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const [editItem, setEditItem] = useState<InventarItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InventarItem | null>(null)

  const geraetTypes = useMemo(() => [...new Set(items.map(i => i.geraet))].sort(), [items])
  const ortTypes = useMemo(() => [...new Set(items.map(i => i.ort).filter(Boolean))].sort() as string[], [items])
  const deptTypes = useMemo(() => [...new Set(items.map(i => i.department).filter(Boolean))].sort() as string[], [items])
  const personTypes = useMemo(() => [...new Set(items.map(i => i.assigned_to_name).filter(Boolean))].sort() as string[], [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(item => {
      if (search && !`${item.geraet} ${item.px_nummer} ${item.modell} ${item.seriennummer}`.toLowerCase().includes(q)) return false
      if (filterGeraet && item.geraet !== filterGeraet) return false
      if (filterStatus && item.status !== filterStatus) return false
      if (filterOrt && item.ort !== filterOrt) return false
      if (filterDept && item.department !== filterDept) return false
      if (filterPerson && item.assigned_to_name !== filterPerson) return false
      return true
    })
  }, [items, search, filterGeraet, filterStatus, filterOrt, filterDept, filterPerson])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv, 'de') : bv.localeCompare(av, 'de')
    })
  }, [filtered, sortKey, sortDir])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const onToggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      sorted.every(i => prev.has(i.id))
        ? new Set()
        : new Set(sorted.map(i => i.id))
    )
  }, [sorted])

  async function handleBulkStatus(newStatus: string) {
    for (const id of selectedIds) {
      await onUpdateItem(id, { status: newStatus as InventarItem['status'] })
    }
    toast.success(`${selectedIds.size} Geräte → ${newStatus}`)
    setSelectedIds(new Set())
  }

  async function handleSaveNew(data: Partial<InventarItem>, imageFile?: File) {
    try {
      await onCreateItem(data, imageFile)
      toast.success('Gerät angelegt!')
      setShowAdd(false)
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleSaveEdit(data: Partial<InventarItem>, imageFile?: File) {
    if (!editItem) return
    try {
      await onUpdateItem(editItem.id, data, imageFile)
      toast.success('Gerät aktualisiert!')
      setEditItem(null)
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await onDeleteItem(deleteTarget.id)
      toast.success('Gerät gelöscht')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    } finally {
      setDeleteTarget(null)
    }
  }

  function exportCSV() {
    const cols = [
      ['Gerät','geraet'], ['Modell','modell'], ['PX-Nummer','px_nummer'],
      ['Seriennummer','seriennummer'], ['Status','status'], ['Ort','ort'],
      ['Department','department'], ['Betriebssystem','os'], ['IP Office','ip_office'],
      ['Handynummer','handy_nr'], ['Zugewiesen an','assigned_to_name'],
      ['PX Eigentum','px_eigentum'], ['Verleihartikel','is_verleihartikel'],
      ['Anschaffungsdatum','anschaffungsdatum'], ['Preis €','anschaffungspreis'],
      ['Notizen','notes'],
    ] as const
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = cols.map(([label]) => label).join(';')
    const rows = sorted.map(item =>
      cols.map(([, key]) => esc(item[key as keyof typeof item])).join(';')
    )
    const bom = '\uFEFF' // UTF-8 BOM for Excel
    const blob = new Blob([bom + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PX-Inventar_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} Einträge exportiert`)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Sticky header: title + filters */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventar</h1>
            <p className="text-muted-foreground text-sm mt-1">{filtered.length} von {items.length} Einträgen</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted-foreground/20 text-foreground text-sm font-semibold rounded-xl transition-colors"
              title="Aktuelle Ansicht als CSV exportieren"
            >
              <Download size={16} /> Export
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-foreground text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-primary-900/40"
              >
                <Plus size={18} /> Neues Gerät
              </button>
            )}
          </div>
        </div>

        <InventarFilters
          search={search} setSearch={setSearch}
          filterGeraet={filterGeraet} setFilterGeraet={setFilterGeraet}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterOrt={filterOrt} setFilterOrt={setFilterOrt}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterPerson={filterPerson} setFilterPerson={setFilterPerson}
          geraetTypes={geraetTypes} ortTypes={ortTypes} deptTypes={deptTypes} personTypes={personTypes}
        />
      </div>

      <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600/10 border-b border-primary-500/20">
            <span className="text-sm text-primary-300 font-semibold">{selectedIds.size} ausgewählt</span>
            <span className="text-muted-foreground/80">|</span>
            <span className="text-xs text-muted-foreground">Status setzen:</span>
            {['Vorhanden', 'Ausgeliehen', 'Fehlt', 'Defekt'].map(s => (
              <button
                key={s}
                onClick={() => handleBulkStatus(s)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted-foreground/20 text-foreground transition-colors"
              >{s}</button>
            ))}
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">Abwählen</button>
          </div>
        )}
        <InventarTable
          items={sorted}
          isAdmin={isAdmin}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={setEditItem}
          onDelete={setDeleteTarget}
          onSelect={onSelectItem}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
        />
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Neues Gerät anlegen" size="lg">
        <ItemForm profiles={profiles} onSave={handleSaveNew} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Gerät bearbeiten" size="lg">
        {editItem && <ItemForm item={editItem} profiles={profiles} onSave={handleSaveEdit} onCancel={() => setEditItem(null)} />}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Gerät löschen"
        message={`Soll "${deleteTarget?.geraet} ${deleteTarget?.px_nummer || ''}" wirklich gelöscht werden? Alle Ausleihen werden ebenfalls entfernt.`}
        confirmLabel="Löschen"
        danger
      />
    </div>
  )
}


