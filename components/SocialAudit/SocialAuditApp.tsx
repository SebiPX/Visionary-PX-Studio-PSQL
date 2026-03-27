import React, { useState } from 'react';
import { AccountsView } from './AccountsView';
import { PerformanceDashboard } from './PerformanceDashboard';
import { AIInsightsView } from './AIInsightsView';
import { AccountReportsView } from './AccountReportsView';

export const SocialAuditApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'DASHBOARD' | 'INSIGHTS' | 'REPORTS'>('ACCOUNTS');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab('DASHBOARD');
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Top Header */}
      <div className="flex bg-card border-b border-border/50 px-6 py-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center neon-glow">
            <span className="material-icons-round">troubleshoot</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Social Audit Agent</h2>
            <p className="text-xs text-muted-foreground">KI-gestützte Social Media Analyse</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border/50">
            <button 
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ACCOUNTS' ? 'bg-indigo-500/20 text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Accounts
            </button>
            <button 
              onClick={() => setActiveTab('DASHBOARD')}
              disabled={!selectedAccountId}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'DASHBOARD' ? 'bg-indigo-500/20 text-indigo-400' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('INSIGHTS')}
              disabled={!selectedAccountId}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'INSIGHTS' ? 'bg-indigo-500/20 text-indigo-400' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
            >
              AI Insights
            </button>
            <button 
              onClick={() => setActiveTab('REPORTS')}
              disabled={!selectedAccountId}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'REPORTS' ? 'bg-indigo-500/20 text-indigo-400' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
            >
              AI Reports
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
        
        {activeTab === 'REPORTS' && selectedAccountId && (
            <AccountReportsView accountId={selectedAccountId} />
        )}
      </div>
    </div>
  );
};
