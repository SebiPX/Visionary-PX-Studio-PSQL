import React from 'react'
import { useState } from 'react'
import { ArrowLeft, Package, Pencil, Trash2, RefreshCw, Info, Clock, MapPin, Monitor, Hash, User } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ItemForm } from '../components/Inventar/ItemForm'
import { LoanForm } from '../components/Loans/LoanForm'
import { LoanTable } from '../components/Loans/LoanTable'
import { useLoans } from '../hooks/useLoans'
import type { InventarItem, Profile } from '../types'

interface ItemDetailPageProps {
  item: InventarItem
  isAdmin: boolean
  profiles: Profile[]
  currentUserId?: string
  onBack: () => void
  onUpdate: (id: string, data: Partial<InventarItem>, imageFile?: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-0">
      <Icon size={15} className="text-slate-500 mt-0.5 shrink-0" />
      <span className="text-slate-500 text-sm w-32 shrink-0">{label}</span>
      <span className="text-slate-200 text-sm">{value}</span>
    </div>
  )
}

export function ItemDetailPage({ item, isAdmin, profiles, currentUserId, onBack, onUpdate, onDelete }: ItemDetailPageProps) {
  const { activeLoans, pastLoans, loading: loansLoading, fetchLoans, createLoan, returnLoan, deleteLoan } = useLoans(item.id)
  const [showEdit, setShowEdit] = useState(false)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'loans'>('info')

  async function handleUpdate(data: Partial<InventarItem>, imageFile?: File) {
    try {
      await onUpdate(item.id, data, imageFile)
      toast.success('Gerät aktualisiert!')
      setShowEdit(false)
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleDelete() {
    try {
      await onDelete(item.id)
      toast.success('Gerät gelöscht')
      onBack()
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleCreateLoan(data: Parameters<typeof createLoan>[0]) {
    try {
      await createLoan(data)
      toast.success('Ausleihe erfasst!')
      setShowLoanForm(false)
      fetchLoans()
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleReturn(id: string) {
    try {
      await returnLoan(id)
      toast.success('Rückgabe erfasst')
      fetchLoans()
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  async function handleDeleteLoan(id: string) {
    try {
      await deleteLoan(id)
      toast.success('Ausleihe gelöscht')
    } catch (e: unknown) {
      toast.error('Fehler: ' + (e instanceof Error ? e.message : 'Unbekannt'))
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Zurück zur Liste
      </button>

      {/* Header */}
      <div className="flex gap-6 items-start mb-8">
        {item.bild_url ? (
          <img src={item.bild_url} alt={item.geraet} className="w-28 h-28 object-cover rounded-2xl border border-slate-700 shrink-0" />
        ) : (
          <div className="w-28 h-28 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Package size={36} className="text-slate-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{item.geraet}</h1>
              {item.modell && <p className="text-slate-400 mt-1">{item.modell}</p>}
              <div className="flex items-center gap-3 mt-3">
                <StatusBadge status={item.status} size="md" />
                {item.px_nummer && (
                  <span className="font-mono text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">{item.px_nummer}</span>
                )}
                {item.is_verleihartikel && (
                  <span className="text-xs text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-1 rounded-full">Verleihartikel</span>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors">
                  <Pencil size={14} /> Bearbeiten
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors">
                  <Trash2 size={14} /> Löschen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/60 p-1 rounded-xl w-fit border border-slate-700">
        {[{ id: 'info', label: 'Gerätedaten', icon: Info }, { id: 'loans', label: `Ausleihen (${activeLoans.length})`, icon: RefreshCw }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'info' | 'loans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <DetailRow icon={Hash} label="PX-Nummer" value={item.px_nummer} />
          <DetailRow icon={Monitor} label="Seriennummer" value={item.seriennummer} />
          <DetailRow icon={MapPin} label="Standort" value={item.ort} />
          <DetailRow icon={Info} label="Department" value={item.department} />
          <DetailRow icon={User} label="Zugewiesen an" value={item.assigned_to_name} />
          <DetailRow icon={Monitor} label="Betriebssystem" value={item.os} />
          <DetailRow icon={Info} label="IP Office" value={item.ip_office} />
          <DetailRow icon={Info} label="IP Tiger" value={item.ip_tiger} />
          <DetailRow icon={Info} label="Handynummer" value={item.handy_nr} />
          <DetailRow icon={Clock} label="Angeschafft" value={item.anschaffungsdatum ? new Date(item.anschaffungsdatum).toLocaleDateString('de-DE') : undefined} />
          <DetailRow icon={Info} label="Preis" value={Number(item.anschaffungspreis) > 0 ? `€ ${Number(item.anschaffungspreis).toFixed(2)}` : undefined} />
          {item.notes && (
            <div className="mt-4 p-3 bg-slate-900 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Notizen</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* QR Code */}
          <div className="mt-6 pt-4 border-t border-slate-700 flex items-center gap-6">
            <div className="bg-white p-2.5 rounded-xl shadow-lg shrink-0">
              <QRCodeSVG
                value={`PX-INVENTAR | ${item.px_nummer || item.id} | ${item.geraet}${item.modell ? ' ' + item.modell : ''}`}
                size={96}
                level="M"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">QR-Code für dieses Gerät</p>
              <p className="text-xs text-slate-500">Ausdrucken und am Gerät befestigen</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">{item.px_nummer || item.id}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => setShowLoanForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors">
              <RefreshCw size={16} /> Jetzt ausleihen
            </button>
          )}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-sm">Aktive Ausleihen</h3>
            </div>
            <LoanTable loans={activeLoans} isAdmin={isAdmin} onReturn={handleReturn} onDelete={handleDeleteLoan} />
          </div>
          {pastLoans.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white text-sm text-slate-400">Historie</h3>
              </div>
              <LoanTable loans={pastLoans} isAdmin={isAdmin} onReturn={handleReturn} onDelete={handleDeleteLoan} />
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Gerät bearbeiten" size="lg">
        <ItemForm item={item} profiles={profiles} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
      </Modal>

      {/* Loan Form Modal */}
      <Modal isOpen={showLoanForm} onClose={() => setShowLoanForm(false)} title="Ausleihe erfassen" size="md">
        <LoanForm
          itemId={item.id}
          itemName={`${item.geraet}${item.modell ? ` – ${item.modell}` : ''}`}
          profiles={profiles}
          currentUserId={currentUserId}
          onSave={handleCreateLoan}
          onCancel={() => setShowLoanForm(false)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Gerät löschen"
        message="Gerät und alle Ausleihen löschen?"
        confirmLabel="Löschen"
        danger
      />
    </div>
  )
}


