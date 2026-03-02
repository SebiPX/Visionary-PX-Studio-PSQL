import React, { useEffect } from 'react';
import { useCreativeAgentStore } from '../../store/useCreativeAgentStore';
import { getToken } from '../../lib/apiClient';
import { AgentDashboard } from './AgentDashboard';
import { BriefingStep } from './steps/BriefingStep';
import { MatrixStep } from './steps/MatrixStep';
import { ScamperStep } from './steps/ScamperStep';
import { OutputStep } from './steps/OutputStep';

export const PxCreativeApp: React.FC = () => {
  const { fetchProjects, currentProject, setCurrentProject } = useCreativeAgentStore();

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchProjects(token);
    }
  }, [fetchProjects]);

  return (
    <div className="w-full h-full flex flex-col bg-[#101622] text-slate-100 overflow-hidden relative">
      {/* Top Header */}
      <div className="flex bg-[#161f30] border-b border-white/5 px-6 py-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center neon-glow-orange">
            <span className="material-icons-round text-white text-lg">tips_and_updates</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">PX Event <span className="text-orange-500">Agent</span></h1>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Editing: <span className="text-white font-medium">{currentProject.title}</span>
            </div>
            <button 
              onClick={() => setCurrentProject(null)}
              className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full flex relative">
        {!currentProject ? (
          <AgentDashboard />
        ) : (
          <div className="w-full h-full p-6">
            {currentProject.current_step === 'briefing' && <BriefingStep />}
            {currentProject.current_step === 'matrix' && <MatrixStep />}
            {currentProject.current_step === 'scamper' && <ScamperStep />}
            {currentProject.current_step === 'finished' && <OutputStep />}
          </div>
        )}
      </div>
    </div>
  );
};
