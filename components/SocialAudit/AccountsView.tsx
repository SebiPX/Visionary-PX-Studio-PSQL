import React, { useState, useEffect } from 'react';
import { useSocialAudit } from '../../hooks/useSocialAudit';
import toast from 'react-hot-toast';

interface AccountsViewProps {
  onAccountSelect: (accountId: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ onAccountSelect }) => {
  const { loadAccounts, addAccount, runSync, deleteAccount, loading } = useSocialAudit();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [platform, setPlatform] = useState('instagram');
  const [username, setUsername] = useState('');

  const fetchAccounts = async () => {
    const res = await loadAccounts();
    if (res.success) {
      setAccounts(res.data);
    } else {
      toast.error('Fehler beim Laden der Accounts');
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    const res = await addAccount(platform, username);
    if (res.success) {
      toast.success('Account hinzugefügt!');
      setUsername('');
      setShowAddForm(false);
      fetchAccounts();
    } else {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleSync = async (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation(); // Prevent row click
    toast.loading(`Synchronisiere @${accountName} via Apify (Das kann 1-2 Minuten dauern)...`, { id: 'sync' });
    const res = await runSync(accountId);
    if (res.success) {
      toast.success(`${res.data.count || 0} Posts synchronisiert!`, { id: 'sync' });
      await fetchAccounts();
      // Auto-redirect to the dashboard for this account
      onAccountSelect(accountId);
    } else {
      toast.error(`Sync fehlgeschlagen: ${res.error}`, { id: 'sync' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation(); // Prevent row click
    if (!window.confirm(`Möchtest du den Account @${accountName} wirklich löschen? Alle Daten und Analysen dazu werden entfernt.`)) {
        return;
    }

    toast.loading('Account wird gelöscht...', { id: 'delete' });
    const res = await deleteAccount(accountId);
    if (res.success) {
      toast.success('Account gelöscht!', { id: 'delete' });
      // If the selected account was deleted, we should ideally notify parent to reset it, 
      // but reloading the list will at least remove it from view.
      fetchAccounts();
    } else {
      toast.error(`Löschen fehlgeschlagen: ${res.error}`, { id: 'delete' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Verknüpfte Accounts</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">add</span>
          Account hinzufügen
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAccount} className="glass-card p-6 rounded-xl border border-white/5 flex items-end gap-4 shadow-xl">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Plattform</label>
            <select 
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="flex-2 min-w-[300px]">
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Username</label>
            <input 
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="z.B. @pixelschickeria"
              className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
          >
            Speichern
          </button>
        </form>
      )}

      {accounts.length === 0 && !loading && (
        <div className="text-center py-12 border border-white/5 border-dashed rounded-xl bg-white/5">
          <span className="material-icons-round text-slate-500 text-4xl mb-4">group_add</span>
          <p className="text-slate-400">Noch keine Accounts verknüpft.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(acc => (
          <div 
            key={acc.id}
            onClick={() => onAccountSelect(acc.id)}
            className="glass-card p-5 rounded-xl border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${acc.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' : 'bg-black border border-white/20'}`}>
                   {/* Simplified icon representation */}
                   <span className="font-bold text-xs">{acc.platform === 'instagram' ? 'IG' : 'TT'}</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">@{acc.username}</h4>
                  <p className="text-xs text-slate-400 capitalize">{acc.platform}</p>
                </div>
              </div>
              <button 
                onClick={(e) => handleDelete(e, acc.id, acc.username)}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
                title="Account löschen"
              >
                <span className="material-icons-round text-sm">delete</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-4 border-t border-white/5 pt-4">
               <span>Letzter Sync: {acc.last_sync ? new Date(acc.last_sync).toLocaleString() : 'Nie'}</span>
               <button 
                  onClick={(e) => handleSync(e, acc.id, acc.username)}
                  disabled={loading}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 px-2 py-1 rounded"
               >
                 <span className="material-icons-round text-[14px]">sync</span>
                 Sync Data
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
