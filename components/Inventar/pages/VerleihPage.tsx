import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { LoanTable } from '../components/Loans/LoanTable'
import { useLoans } from '../hooks/useLoans'

interface VerleihPageProps {
  isAdmin: boolean
}

export function VerleihPage({ isAdmin }: VerleihPageProps) {
  const { activeLoans, pastLoans, loading, returnLoan, deleteLoan, fetchLoans } = useLoans()

  async function handleReturn(id: string) {
    try {
      await returnLoan(id)
      toast.success('Rückgabe erfasst')
      fetchLoans()
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLoan(id)
      toast.success('Ausleihe gelöscht')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Verleih-Übersicht</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeLoans.length} aktive Ausleihe{activeLoans.length !== 1 ? 'n' : ''}
        </p>
      </div>

      {/* Aktive Ausleihen */}
      <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <RefreshCw size={16} className="text-amber-400" />
          <h2 className="font-semibold text-foreground">Aktuell ausgeliehen</h2>
          <span className="ml-auto text-xs text-muted-foreground">{activeLoans.length} Einträge</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <LoanTable loans={activeLoans} isAdmin={isAdmin} showItem onReturn={handleReturn} onDelete={handleDelete} />
        )}
      </div>

      {/* Historie */}
      {pastLoans.length > 0 && (
        <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-muted-foreground text-sm">Rückgabe-Historie ({pastLoans.length})</h2>
          </div>
          <LoanTable loans={pastLoans} isAdmin={isAdmin} showItem onReturn={handleReturn} onDelete={handleDelete} />
        </div>
      )}
    </div>
  )
}

