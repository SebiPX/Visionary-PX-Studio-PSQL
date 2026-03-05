import React, { useState } from 'react'
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { useInventar } from './Inventar/hooks/useInventar'
import { useLoans } from './Inventar/hooks/useLoans'
import { useProfiles } from './Inventar/hooks/useProfiles'
import { useVerleihscheine } from './Inventar/hooks/useVerleihscheine'
import { useLogins } from './Inventar/hooks/useLogins'
import { useHandyvertraege } from './Inventar/hooks/useHandyvertraege'
import { useKreditkarten } from './Inventar/hooks/useKreditkarten'
import { useFirmendaten } from './Inventar/hooks/useFirmendaten'
import { useLinks } from './Inventar/hooks/useLinks'
import { useDashboardConfig } from './Inventar/hooks/useDashboardConfig'

import { DashboardPage } from './Inventar/pages/DashboardPage'
import { InventarPage } from './Inventar/pages/InventarPage'
import { ItemDetailPage } from './Inventar/pages/ItemDetailPage'
import { VerleihPage } from './Inventar/pages/VerleihPage'
import { VerleihFormularPage } from './Inventar/pages/VerleihFormularPage'
import { KalendarPage } from './Inventar/pages/KalendarPage'
import { LoginsPage } from './Inventar/pages/LoginsPage'
import { HandyvertraegePage } from './Inventar/pages/HandyvertraegePage'
import { KreditkartenPage } from './Inventar/pages/KreditkartenPage'
import { FirmendatenPage } from './Inventar/pages/FirmendatenPage'
import { LinksPage } from './Inventar/pages/LinksPage'

import { useAuth } from '../contexts/AuthContext'
import type { InventarItem } from './Inventar/types'
import { AppView } from '../types'

interface InventarAppProps {
  onBack: () => void
  setView?: (view: AppView) => void
  navigateToItem?: (view: AppView, itemId: string) => void
  dashboardPath?: string
}

/** Inner shell — lives inside MemoryRouter */
function InventarShell({ onBack, setView, navigateToItem, dashboardPath }: InventarAppProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (dashboardPath) {
      navigate(dashboardPath, { replace: true });
    }
  }, [dashboardPath, navigate]);

  const { user, profile: studioProfile } = useAuth()

  const profile = studioProfile
    ? {
        id: studioProfile.id,
        email: studioProfile.email ?? '',
        full_name: studioProfile.full_name ?? null,
        avatar_url: studioProfile.avatar_url ?? null,
        role: studioProfile.role ?? 'user',
      }
    : null

  const isAdmin = profile?.role === 'admin'

  const { items, createItem, updateItem, deleteItem, uploadImage, fetchItems } = useInventar()
  const { loans } = useLoans()
  const { profiles } = useProfiles()
  const { scheine, archivierte, createVerleihschein, markErledigt, fetchArchive } = useVerleihscheine()
  const { logins, createLogin, updateLogin, deleteLogin } = useLogins()
  const { vertraege, createVertrag, updateVertrag, deleteVertrag } = useHandyvertraege()
  const { kreditkarten, createKreditkarte, updateKreditkarte, deleteKreditkarte } = useKreditkarten()
  const { firmendaten, createEintrag, updateEintrag, deleteEintrag } = useFirmendaten()
  const { links, createLink, updateLink, deleteLink } = useLinks()
  const { config: dashboardConfig, saving: dashboardConfigSaving, save: saveDashboardConfig } = useDashboardConfig()
  const [selectedItem, setSelectedItem] = useState<InventarItem | null>(null)

  if (!profile) {
    return (
      <div className="flex h-full bg-slate-950 items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Item CRUD handlers with image upload support
  async function handleCreateItem(data: Partial<InventarItem>, imageFile?: File) {
    let bild_url = data.bild_url || null
    if (imageFile) bild_url = await uploadImage(imageFile, data.px_nummer || String(Date.now()))
    return createItem({ ...data, bild_url } as Omit<InventarItem, 'id' | 'created_at' | 'updated_at'>)
  }

  async function handleUpdateItem(id: string, data: Partial<InventarItem>, imageFile?: File) {
    let bild_url = data.bild_url
    if (imageFile) bild_url = await uploadImage(imageFile, data.px_nummer || id)
    const updated = await updateItem(id, { ...data, bild_url })
    if (selectedItem?.id === id) setSelectedItem(updated)
    return updated
  }

  async function handleDeleteItem(id: string) {
    await deleteItem(id)
    if (selectedItem?.id === id) setSelectedItem(null)
  }

  async function handleSaveVerleihschein(
    header: Parameters<typeof createVerleihschein>[0],
    lineItems: Parameters<typeof createVerleihschein>[1]
  ) {
    await createVerleihschein(header, lineItems)
    await fetchItems()
  }

  async function handleMarkErledigt(id: string, itemIds: string[]) {
    await markErledigt(id, itemIds)
    await fetchItems()
  }

  const currentUserId = user?.id ?? profile.id

  return (
    <div className="flex h-full bg-slate-950 relative">

      <main className="flex-1 overflow-y-auto relative">
        {selectedItem ? (
          <ItemDetailPage
            item={selectedItem}
            isAdmin={isAdmin}
            profiles={profiles}
            currentUserId={currentUserId}
            onBack={() => setSelectedItem(null)}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
          />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={
              <DashboardPage
                items={items}
                loans={loans}
                links={links}
                scheine={scheine}
                logins={logins}
                config={dashboardConfig}
                onConfigSave={saveDashboardConfig}
                configSaving={dashboardConfigSaving}
                setView={setView}
                navigateToItem={navigateToItem}
              />
            } />

            <Route path="/inventar" element={
              <InventarPage
                items={items}
                isAdmin={isAdmin}
                profiles={profiles}
                onCreateItem={handleCreateItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onSelectItem={setSelectedItem}
              />
            } />

            <Route path="/verleih" element={<VerleihPage isAdmin={isAdmin} />} />

            <Route path="/verleih-formular" element={
              <VerleihFormularPage
                items={items}
                profiles={profiles}
                scheine={scheine}
                archivierte={archivierte}
                currentUserId={currentUserId}
                onSaveVerleihschein={handleSaveVerleihschein}
                onMarkErledigt={handleMarkErledigt}
                onFetchArchive={fetchArchive}
              />
            } />

            <Route path="/kalender" element={<KalendarPage items={items} scheine={scheine} />} />

            <Route path="/logins" element={
              <LoginsPage logins={logins} isAdmin={isAdmin} onCreate={createLogin} onUpdate={updateLogin} onDelete={deleteLogin} />
            } />

            <Route path="/handyvertraege" element={
              <HandyvertraegePage vertraege={vertraege} isAdmin={isAdmin} onCreate={createVertrag} onUpdate={updateVertrag} onDelete={deleteVertrag} />
            } />

            <Route path="/kreditkarten" element={
              <KreditkartenPage kreditkarten={kreditkarten} onCreate={createKreditkarte} onUpdate={updateKreditkarte} onDelete={deleteKreditkarte} />
            } />

            <Route path="/firmendaten" element={
              <FirmendatenPage firmendaten={firmendaten} onCreate={createEintrag} onUpdate={updateEintrag} onDelete={deleteEintrag} />
            } />

            <Route path="/links" element={
              <LinksPage links={links} isAdmin={isAdmin} onCreate={createLink} onUpdate={updateLink} onDelete={deleteLink} />
            } />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </main>

      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
    </div>
  )
}

/** Public component — wraps the shell in its own MemoryRouter (isolated routing) */
export const InventarApp: React.FC<InventarAppProps> = ({ onBack, setView, navigateToItem, dashboardPath }) => (
  <MemoryRouter>
    <InventarShell onBack={onBack} setView={setView} navigateToItem={navigateToItem} dashboardPath={dashboardPath} />
  </MemoryRouter>
)
