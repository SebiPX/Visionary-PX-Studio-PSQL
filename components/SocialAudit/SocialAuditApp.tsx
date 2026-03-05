import React, { useState } from 'react';
import { AccountsView } from './AccountsView';
import { PerformanceDashboard } from './PerformanceDashboard';
import { AIInsightsView } from './AIInsightsView';

export const SocialAuditApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'DASHBOARD' | 'INSIGHTS'>('ACCOUNTS');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab('DASHBOARD');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#101622] text-slate-100 overflow-hidden relative">
      {/* Top Header */}
      <div className="flex bg-[#161f30] border-b border-white/5 px-6 py-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center neon-glow">
            <span className="material-icons-round">troubleshoot</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Social Audit Agent</h2>
            <p className="text-xs text-slate-400">KI-gestützte Social Media Analyse</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0a0f18] p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ACCOUNTS' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              Accounts
            </button>
            <button 
              onClick={() => setActiveTab('DASHBOARD')}
              disabled={!selectedAccountId}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'DASHBOARD' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'} disabled:opacity-30`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('INSIGHTS')}
              disabled={!selectedAccountId}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'INSIGHTS' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'} disabled:opacity-30`}
            >
              AI Insights
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full p-6 relative">
        {activeTab === 'ACCOUNTS' && (
            <AccountsView onAccountSelect={handleAccountSelect} />
        )}
        
        {activeTab === 'DASHBOARD' && selectedAccountId && (
            <PerformanceDashboard accountId={selectedAccountId} />
        )}
        
        {activeTab === 'INSIGHTS' && selectedAccountId && (
            <AIInsightsView accountId={selectedAccountId} />
        )}
      </div>
    </div>
  );
};
