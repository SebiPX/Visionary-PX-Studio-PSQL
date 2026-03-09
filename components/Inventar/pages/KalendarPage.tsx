import { useState, useMemo, Fragment } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Package, ChevronDown } from 'lucide-react'
import type { InventarItem, Verleihschein } from '../types'

interface KalendarPageProps {
  items: InventarItem[]
  scheine: Verleihschein[]
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns whether a rental covers a given day
function coversDay(schein: Verleihschein, year: number, month: number, day: number): boolean {
  const dayStart = new Date(year, month, day, 0, 0, 0).getTime()
  const dayEnd   = new Date(year, month, day, 23, 59, 59).getTime()
  const from = new Date(schein.abholzeit).getTime()
  const to   = new Date(schein.rueckgabezeit).getTime()
  return from <= dayEnd && to >= dayStart
}

export function KalendarPage({ items, scheine }: KalendarPageProps) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const days = daysInMonth(year, month)
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1)

  // Only items marked as Verleihartikel
  const verleihItems = useMemo(
    () => items.filter(i => i.is_verleihartikel),
    [items]
  )

  // Group items by category
  const categoriesMap = useMemo(() => {
    const map = new Map<string, InventarItem[]>();
    verleihItems.forEach(item => {
      const cat = item.geraet || 'Unkategorisiert';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    // Sort categories alphabetically
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [verleihItems]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Pre-index: for each (itemId, day) which schein covers it
  const coverageMap = useMemo(() => {
    const map: Map<string, Map<number, Verleihschein>> = new Map()
    for (const schein of scheine) {
      if (schein.status !== 'aktiv') continue
      for (const li of schein.items || []) {
        if (!map.has(li.item_id)) map.set(li.item_id, new Map())
        for (let d = 1; d <= days; d++) {
          if (coversDay(schein, year, month, d)) {
            map.get(li.item_id)!.set(d, schein)
          }
        }
      }
    }
    return map
  }, [scheine, year, month, days])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  // Weekend detection
  function isWeekend(day: number) {
    const d = new Date(year, month, day).getDay()
    return d === 0 || d === 6
  }
  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar size={24} className="text-brand-400" /> Kalender
          </h1>
          <p className="text-slate-400 text-sm mt-1">Verfügbarkeit der Verleihartikel im Überblick</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-semibold w-44 text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/60" /> Frei</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/60 border border-red-500/40" /> Ausgeliehen</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Wochenende</span>
      </div>

      {verleihItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Package size={48} className="mb-3 opacity-40" />
          <p className="text-lg font-medium">Keine Verleihartikel vorhanden</p>
          <p className="text-sm">Markiere Geräte im Inventar als „Verleihartikel".</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: `${100 + days * 32}px` }}>
              <thead>
                <tr className="border-b border-slate-700">
                  {/* Item name column */}
                  <th className="sticky left-0 z-10 bg-slate-900 text-left py-3 px-4 text-slate-400 font-semibold w-48 min-w-48">Gerät</th>
                  {/* Day headers */}
                  {dayNumbers.map(d => (
                    <th key={d} className={`py-3 w-8 text-center font-medium select-none ${
                      isToday(d) ? 'text-brand-400' : isWeekend(d) ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {d}
                      <div className={`text-[9px] ${isWeekend(d) ? 'text-slate-700' : 'text-slate-600'}`}>
                        {new Date(year, month, d).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Array.from(categoriesMap.entries()).map(([category, itemsInCategory]) => {
                  const isExpanded = expandedCategories.has(category);
                  return (
                    <Fragment key={category}>
                      {/* Category Header Row */}
                      <tr 
                        className="bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer group"
                        onClick={() => toggleCategory(category)}
                      >
                        <td className="sticky left-0 z-20 bg-slate-800/90 group-hover:bg-slate-700/90 py-2.5 px-3 font-semibold text-brand-300 whitespace-nowrap border-b border-slate-700/50 flex items-center gap-2 transition-colors">
                           {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                           {category} 
                           <span className="text-xs font-normal opacity-60 ml-1">({itemsInCategory.length})</span>
                        </td>
                        {/* Empty cells for the dynamic days column width, so background color fills the rest */}
                        <td colSpan={days} className="border-b border-slate-700/50 bg-slate-800/50 group-hover:bg-slate-700/50 transition-colors"></td>
                      </tr>

                      {/* Item Rows */}
                      {isExpanded && itemsInCategory.map(item => {
                        const itemMap = coverageMap.get(item.id)
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* Item name */}
                            <td className="sticky left-0 z-10 bg-slate-900 py-2 px-4 pl-10 font-medium text-white whitespace-nowrap">
                              <p className="truncate max-w-44">{item.geraet}{item.modell ? ` – ${item.modell}` : ''}</p>
                              {item.px_nummer && <p className="text-slate-500 font-mono text-[10px]">{item.px_nummer}</p>}
                            </td>
                            {/* Day cells */}
                            {dayNumbers.map(d => {
                              const schein = itemMap?.get(d)
                              const weekend = isWeekend(d)
                              const todayCell = isToday(d)
                              return (
                                <td key={d} className="p-0.5">
                                  <div
                                    className={`h-8 w-7 rounded-md mx-auto flex items-center justify-center cursor-default transition-colors ${
                                      schein
                                        ? 'bg-red-500/60 border border-red-500/40 hover:bg-red-500/80'
                                        : weekend
                                          ? 'bg-slate-700/30'
                                          : todayCell
                                            ? 'bg-brand-500/20 border border-brand-500/30'
                                            : 'bg-emerald-500/10 border border-emerald-500/10 hover:bg-emerald-500/20'
                                    }`}
                                    title={schein
                                      ? `Ausgeliehen an: ${schein.borrower_type === 'team' ? schein.profile?.full_name : schein.extern_name || '–'}\n${new Date(schein.abholzeit).toLocaleDateString('de-DE')} – ${new Date(schein.rueckgabezeit).toLocaleDateString('de-DE')}`
                                      : 'Frei'}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

