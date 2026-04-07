import { Pencil, Trash2, Package, User, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { StatusBadge } from '../ui/Badge'
import type { InventarItem } from '../../types'

export type SortKey = 'geraet' | 'px_nummer' | 'department' | 'ort' | 'assigned_to_name' | 'status'
export type SortDir = 'asc' | 'desc'

interface InventarTableProps {
  items: InventarItem[]
  isAdmin: boolean
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onEdit: (item: InventarItem) => void
  onDelete: (item: InventarItem) => void
  onSelect: (item: InventarItem) => void
  // Bulk selection
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="opacity-30 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-brand-400 ml-1 inline" />
    : <ChevronDown size={12} className="text-brand-400 ml-1 inline" />
}

function SortTh({ col, label, sortKey, sortDir, onSort }: { col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  return (
    <th
      onClick={() => onSort(col)}
      className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors"
    >
      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )
}

export function InventarTable({
  items, isAdmin, sortKey, sortDir, onSort,
  onEdit, onDelete, onSelect,
  selectedIds, onToggleSelect, onToggleSelectAll,
}: InventarTableProps) {

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package size={48} className="mb-3 opacity-40" />
        <p className="text-lg font-medium">Keine Einträge gefunden</p>
        <p className="text-sm">Passe die Filter an oder lege ein neues Item an.</p>
      </div>
    )
  }

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id))
  const someSelected = items.some(i => selectedIds.has(i.id))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {/* Select-all checkbox */}
            <th className="py-3 px-3 w-10" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
              />
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">Bild</th>
            <SortTh col="geraet"           label="Gerät / Modell" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh col="px_nummer"        label="PX-Nr."         sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh col="department"       label="Department"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh col="ort"              label="Ort"            sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh col="assigned_to_name" label="Zugewiesen"    sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh col="status"           label="Status"         sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            {isAdmin && <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Aktionen</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {items.map(item => {
            const isSelected = selectedIds.has(item.id)
            return (
              <tr
                key={item.id}
                className={`hover:bg-card/50 transition-colors group cursor-pointer ${isSelected ? 'bg-brand-500/5' : ''}`}
                onClick={() => onSelect(item)}
              >
                {/* Checkbox */}
                <td className="py-3 px-3" onClick={e => { e.stopPropagation(); onToggleSelect(item.id) }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                  />
                </td>

                {/* Bild */}
                <td className="py-3 px-4">
                  {item.bild_url ? (
                    <img src={item.bild_url} alt={item.geraet} className="w-10 h-10 object-cover rounded-lg border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                      <Package size={16} className="text-slate-600" />
                    </div>
                  )}
                </td>

                {/* Gerät / Modell */}
                <td className="py-3 px-4">
                  <p className="font-medium text-foreground">{item.geraet}</p>
                  {item.modell && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{item.modell}</p>}
                </td>

                {/* PX-Nr */}
                <td className="py-3 px-4">
                  <span className="font-mono text-xs text-muted-foreground bg-card px-2 py-1 rounded-lg border border-border">
                    {item.px_nummer || '–'}
                  </span>
                </td>

                {/* Department */}
                <td className="py-3 px-4 text-muted-foreground text-xs">{item.department || '–'}</td>

                {/* Ort */}
                <td className="py-3 px-4 text-muted-foreground text-xs">{item.ort || '–'}</td>

                {/* Zugewiesen */}
                <td className="py-3 px-4">
                  {item.assigned_to_name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card px-2 py-1 rounded-full border border-border">
                      <User size={11} className="text-brand-400" />
                      {item.assigned_to_name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">–</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <StatusBadge status={item.status} />
                </td>

                {/* Aktionen (nur Admin) */}
                {isAdmin && (
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
