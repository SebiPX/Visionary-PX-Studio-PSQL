import { Search, X } from 'lucide-react'

interface FiltersProps {
  search: string
  setSearch: (v: string) => void
  filterGeraet: string
  setFilterGeraet: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterOrt: string
  setFilterOrt: (v: string) => void
  filterDept: string
  setFilterDept: (v: string) => void
  filterPerson: string
  setFilterPerson: (v: string) => void
  geraetTypes: string[]
  ortTypes: string[]
  deptTypes: string[]
  personTypes: string[]
}

const STATUS_OPTIONS = ['Alle Status', 'Vorhanden', 'Ausgeliehen', 'Fehlt', 'Defekt']

const selectCls = 'px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors hover:border-input'

export function InventarFilters({
  search, setSearch, filterGeraet, setFilterGeraet,
  filterStatus, setFilterStatus, filterOrt, setFilterOrt,
  filterDept, setFilterDept, filterPerson, setFilterPerson,
  geraetTypes, ortTypes, deptTypes, personTypes
}: FiltersProps) {
  const hasFilters = search || filterGeraet || filterStatus || filterOrt || filterDept || filterPerson

  function clearAll() {
    setSearch(''); setFilterGeraet(''); setFilterStatus(''); setFilterOrt(''); setFilterDept(''); setFilterPerson('')
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-52">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen nach Name, PX-Nummer, Modell …"
          className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Filter Dropdowns */}
      <select value={filterGeraet} onChange={e => setFilterGeraet(e.target.value)} className={selectCls}>
        <option value="">Alle Typen</option>
        {geraetTypes.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
        {STATUS_OPTIONS.map(s => <option key={s} value={s === 'Alle Status' ? '' : s}>{s}</option>)}
      </select>
      <select value={filterOrt} onChange={e => setFilterOrt(e.target.value)} className={selectCls}>
        <option value="">Alle Orte</option>
        {ortTypes.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={selectCls}>
        <option value="">Alle Departments</option>
        {deptTypes.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className={selectCls}>
        <option value="">Alle Personen</option>
        {personTypes.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-border">
          <X size={14} /> Reset
        </button>
      )}
    </div>
  )
}
