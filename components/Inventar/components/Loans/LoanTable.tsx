import { format, parseISO, isPast, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { CheckCircle, AlertCircle, Package, Trash2 } from 'lucide-react'
import type { InventarLoan } from '../../types'

interface LoanTableProps {
  loans: InventarLoan[]
  isAdmin: boolean
  showItem?: boolean
  onReturn: (id: string) => void
  onDelete: (id: string) => void
}

function DisplayName({ loan }: { loan: InventarLoan }) {
  const name = loan.profile?.full_name || loan.mitarbeiter_name
  return <span className="font-medium text-foreground">{name || '–'}</span>
}

function DueDate({ zurueck_bis, zurueck_am }: { zurueck_bis?: string | null; zurueck_am?: string | null }) {
  if (zurueck_am) return null
  if (!zurueck_bis) return <span className="text-muted-foreground text-xs">kein Datum</span>

  const date = parseISO(zurueck_bis)
  const overdue = isPast(date)
  const days = differenceInDays(date, new Date())

  return (
    <span className={`text-xs font-medium ${overdue ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
      {overdue ? `${Math.abs(days)}d überfällig` : format(date, 'dd.MM.yyyy', { locale: de })}
    </span>
  )
}

export function LoanTable({ loans, isAdmin, showItem = false, onReturn, onDelete }: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <CheckCircle size={36} className="mb-2 opacity-40" />
        <p className="text-sm">Keine Ausleihen vorhanden</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {showItem && <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gerät</th>}
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mitarbeiter</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ausgeliehen am</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zurück bis</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zweck</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            {isAdmin && <th className="w-24" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {loans.map(loan => {
            const returned = !!loan.zurueck_am
            return (
              <tr key={loan.id} className="hover:bg-card/40 transition-colors group">
                {showItem && (
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {loan.item?.bild_url ? (
                        <img src={loan.item.bild_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                          <Package size={12} className="text-slate-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-foreground font-medium text-xs">{loan.item?.geraet}</p>
                        <p className="text-muted-foreground text-xs">{loan.item?.px_nummer}</p>
                      </div>
                    </div>
                  </td>
                )}
                <td className="py-3 px-4">
                  <DisplayName loan={loan} />
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">
                  {format(parseISO(loan.ausgeliehen_am), 'dd.MM.yyyy', { locale: de })}
                </td>
                <td className="py-3 px-4">
                  {returned ? (
                    <span className="text-xs text-emerald-400">{format(parseISO(loan.zurueck_am!), 'dd.MM.yyyy', { locale: de })}</span>
                  ) : (
                    <DueDate zurueck_bis={loan.zurueck_bis} zurueck_am={loan.zurueck_am} />
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{loan.zweck || '–'}</td>
                <td className="py-3 px-4">
                  {returned ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle size={11} /> Zurück
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <AlertCircle size={11} /> Ausgeliehen
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!returned && (
                        <button onClick={() => onReturn(loan.id)}
                          className="px-2 py-1 text-xs rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors border border-emerald-600/30">
                          Zurück
                        </button>
                      )}
                      <button onClick={() => onDelete(loan.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
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
