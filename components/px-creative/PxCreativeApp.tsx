import React, { useEffect } from 'react';
import { useCreativeAgentStore } from '../../store/useCreativeAgentStore';
import { getToken } from '../../lib/apiClient';
import { AgentDashboard } from './AgentDashboard';
import { BriefingStep } from './steps/BriefingStep';
import { MatrixStep } from './steps/MatrixStep';
import { ScamperStep } from './steps/ScamperStep';
import { OutputStep } from './steps/OutputStep';
import { ProjectSidebar } from './ProjectSidebar';

export const PxCreativeApp: React.FC = () => {
  const { fetchProjects, currentProject, setCurrentProject } = useCreativeAgentStore();

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchProjects(token);
    }
  }, [fetchProjects]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Top Header */}
      <div className="flex bg-card border-b border-border/50 px-6 py-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Title removed since side navigation shows current context */}
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Editing: <span className="text-foreground font-medium">{currentProject.title}</span>
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
          <div className="w-full h-full flex">
            <div className="flex-1 overflow-y-auto p-6">
              {currentProject.status === 'briefing' && <BriefingStep />}
              {currentProject.status === 'drafting' && <MatrixStep />}
              {currentProject.status === 'review' && <ScamperStep />}
              {currentProject.status === 'approved' && <OutputStep />}
            </div>
            <ProjectSidebar />
          </div>
        )}
      </div>
    </div>
  );
};
