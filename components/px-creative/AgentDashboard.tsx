import React, { useState } from 'react';
import { useCreativeAgentStore } from '../../store/useCreativeAgentStore';
import { getToken } from '../../lib/apiClient';

export const AgentDashboard: React.FC = () => {
  const { projects, loading, createProject, fetchProject, deleteProject } = useCreativeAgentStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOccasion, setNewOccasion] = useState('');
  const [newGuestCount, setNewGuestCount] = useState('');

  const handleStartProject = async () => {
    const token = getToken();
    if (!token || !newTitle || !newOccasion || !newGuestCount) return;
    try {
      await createProject(token, {
        title: newTitle,
        occasion: newOccasion,
        guest_count: parseInt(newGuestCount) || 0,
      });
      setIsCreating(false);
      setNewTitle('');
      setNewOccasion('');
      setNewGuestCount('');
    } catch (err) {
      console.error(err);
      alert('Error creating project');
    }
  };

  const handleOpenProject = async (id: string) => {
    const token = getToken();
    if (!token) return;
    await fetchProject(token, id);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = getToken();
    if (!token) return;
    if (confirm('Are you sure you want to delete this event project?')) {
      await deleteProject(token, id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-8">

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-2">My Event Projects</h2>
          <p className="text-slate-400">Gen-AI powered concept generation and SCAMPER refinement.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-2 transition-colors shadow-lg shadow-brand-500/20"
          >
            <span className="material-icons-round">add</span>
            New Concept
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-[#161f30] rounded-2xl border border-white/10 p-6 mb-8 shadow-xl">
          <h3 className="text-lg font-bold mb-4">Start a new Event Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Internal Title</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Acme Corp Launch 2026"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Occasion</label>
              <input 
                type="text" 
                value={newOccasion} 
                onChange={(e) => setNewOccasion(e.target.value)}
                placeholder="e.g. Product Launch, Summer Party"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Guests</label>
              <input 
                type="number" 
                value={newGuestCount} 
                onChange={(e) => setNewGuestCount(e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleStartProject}
              disabled={!newTitle || !newOccasion || !newGuestCount || loading}
              className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              Start Agent <span className="material-icons-round text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {loading && projects.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Loading projects...</div>
      ) : projects.length === 0 && !isCreating ? (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <span className="material-icons-round text-3xl">lightbulb</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">Start a new event project to generate out-of-the-box matrices and SCAMPER refinements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div 
              key={p.id}
              onClick={() => handleOpenProject(p.id)}
              className="group bg-[#161f30] rounded-2xl border border-white/5 cursor-pointer hover:border-brand-500/50 hover:-translate-y-1 transition-all overflow-hidden p-6 relative"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{p.title}</h3>
                <button 
                  onClick={(e) => handleDeleteProject(p.id, e)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
                >
                  <span className="material-icons-round text-sm">delete</span>
                </button>
              </div>
              
              <div className="space-y-2 mb-6 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Occasion:</span>
                  <span className="text-white font-medium text-right truncate pl-4 max-w-[60%]">{p.occasion}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guests:</span>
                  <span className="text-white font-medium">{p.guest_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="text-white font-medium">{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    p.current_step === 'finished' ? 'bg-green-500' :
                    p.current_step === 'scamper' ? 'bg-purple-500' :
                    p.current_step === 'matrix' ? 'bg-blue-500' : 'bg-brand-500'
                  } shadow-[0_0_8px_currentColor]`} />
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                    Step: {p.current_step}
                  </span>
                </div>
                <span className="material-icons-round text-slate-500 group-hover:text-brand-500 group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
