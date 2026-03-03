import React, { useState } from 'react';
import { useCreativeAgentStore } from '../../../store/useCreativeAgentStore';
import { getToken } from '../../../lib/apiClient';

export const ScamperStep: React.FC = () => {
  const { currentProject, selectFinalConcept, loading, updateProject } = useCreativeAgentStore();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const concepts = currentProject?.concepts || [];
  const hasFinalConcept = concepts.some(c => c.is_final_choice);

  const handleSelectConcept = async (conceptId: string) => {
    const token = getToken();
    if (!token || !currentProject) return;
    setSelectingId(conceptId);
    try {
      await selectFinalConcept(token, currentProject.id, conceptId);
    } catch (err) {
      console.error(err);
      alert('Failed to select final concept.');
    } finally {
      setSelectingId(null);
    }
  };

  if (!concepts || concepts.length === 0) {
    return <div className="p-8 text-center text-slate-400">Waiting for Concepts data... Please hold on.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto w-full pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Step 3: SCAMPER Refinements & Evaluation</h2>
        <p className="text-slate-400">
          The AI has refined your selected templates using the <b>SCAMPER process</b> to add a unique wow-factor. Compare the 4 concepts and choose your favorite.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {concepts.map((concept, idx) => {
          const isHow = concept.how_now_wow_score === 'how';
          const isNow = concept.how_now_wow_score === 'now';
          const isWow = concept.how_now_wow_score === 'wow';

          return (
            <div key={concept.id} className="bg-[#161f30] rounded-2xl border border-white/10 p-6 shadow-xl flex flex-col h-full relative overflow-hidden group hover:border-orange-500/30 transition-all">
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white">Concept {idx + 1}</h3>
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${
                  concept.concept_type === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {concept.concept_type === 'ai' ? 'AI Out-of-the-Box' : 'User Selection'}
                </span>
              </div>

              <div className="flex-grow space-y-6">
                
                {/* Selected Parameters */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Core Parameters</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(concept.selected_parameters).map((val: any) => (
                      <span key={val} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">
                        {val}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SCAMPER Wow-Factor */}
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                    <span className="material-icons-round text-sm">auto_awesome</span> 
                    SCAMPER Refinement
                  </h4>
                  {concept.scamper_refinements?.applied_adjectives && concept.scamper_refinements.applied_adjectives.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {concept.scamper_refinements.applied_adjectives.map((adj, i) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] uppercase font-bold rounded border border-orange-500/30">
                          {adj}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-300 leading-relaxed italic bg-orange-500/5 p-3 rounded-lg border border-orange-500/10 mb-4">
                    "{concept.scamper_refinements?.idea}"
                  </p>
                  
                  {/* Real-World Validation */}
                  {concept.scamper_refinements?.real_world_validation && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-3">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 pb-2 mb-2">
                        <span className="material-icons-round text-xs">travel_explore</span> 
                        Real-World Validation
                      </h4>
                      
                      {concept.scamper_refinements.real_world_validation.location && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 mb-1">Real Location</span>
                          <strong className="text-green-400 text-sm block">{concept.scamper_refinements.real_world_validation.location.name}</strong>
                          <p className="text-xs text-slate-400 mt-1 mb-2">{concept.scamper_refinements.real_world_validation.location.description}</p>
                          {concept.scamper_refinements.real_world_validation.location.address && <p className="text-[11px] text-slate-300 mt-1"><span className="opacity-50">📍</span> {concept.scamper_refinements.real_world_validation.location.address}</p>}
                          {concept.scamper_refinements.real_world_validation.location.contact && <p className="text-[11px] text-slate-300"><span className="opacity-50">📞</span> {concept.scamper_refinements.real_world_validation.location.contact}</p>}
                          {concept.scamper_refinements.real_world_validation.location.website && <p className="text-[11px] text-blue-400 truncate"><a href={concept.scamper_refinements.real_world_validation.location.website} target="_blank" rel="noreferrer"><span className="opacity-70">🌐</span> {concept.scamper_refinements.real_world_validation.location.website}</a></p>}
                        </div>
                      )}

                      {concept.scamper_refinements.real_world_validation.nearby_vendors && concept.scamper_refinements.real_world_validation.nearby_vendors.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <span className="block text-[10px] uppercase text-slate-500 mb-2">Nearby Vendors</span>
                          <div className="space-y-3">
                            {concept.scamper_refinements.real_world_validation.nearby_vendors.map((v: any, vi: number) => (
                              <div key={vi} className="bg-white/5 p-2 rounded border border-white/5">
                                <strong className="text-blue-400 text-xs block">{v.name} <span className="text-[10px] text-slate-500 font-normal">({v.type})</span></strong>
                                <p className="text-[10px] text-slate-400 mt-1">{v.description}</p>
                                <p className="text-[10px] text-slate-300 mt-1">📞 {v.contact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Evaluation */}
                <div className="flex gap-4 p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="flex-1">
                    <span className="block text-[10px] uppercase text-slate-500 mb-1">HNW Score</span>
                    <span className={`text-sm font-bold uppercase tracking-wider ${
                      isWow ? 'text-green-400' : isNow ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {concept.how_now_wow_score}
                    </span>
                  </div>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <span className="block text-[10px] uppercase text-slate-500 mb-1">Budget</span>
                    <span className="text-sm font-bold text-white">
                      {concept.budget_estimation || 'N/A'}
                    </span>
                  </div>
                </div>

              </div>

              <button 
                onClick={() => handleSelectConcept(concept.id)}
                disabled={loading || selectingId !== null}
                className="mt-6 w-full py-3 rounded-xl bg-white/5 hover:bg-orange-600 border border-white/10 hover:border-transparent text-white font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] disabled:opacity-50"
              >
                {selectingId === concept.id ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</span>
                ) : (
                  <>Select as Final Concept <span className="material-icons-round text-sm">check_circle</span></>
                )}
              </button>

            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button 
          onClick={async () => {
            const token = getToken();
            if (token && currentProject) await updateProject(token, currentProject.id, { current_step: 'matrix' });
          }}
          disabled={loading || selectingId !== null}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">arrow_back</span> Back to Matrix
        </button>

        {hasFinalConcept && (
          <button 
            onClick={async () => {
              const token = getToken();
              if (token && currentProject) await updateProject(token, currentProject.id, { current_step: 'finished' });
            }}
            disabled={loading || selectingId !== null}
            className="px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center gap-2 text-lg"
          >
            Skip to Output <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
};
