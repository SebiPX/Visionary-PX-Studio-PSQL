import React, { useState } from 'react';
import { useCreativeAgentStore } from '../../../store/useCreativeAgentStore';
import { getToken } from '../../../lib/apiClient';

export const BriefingStep: React.FC = () => {
  const { currentProject, updateProject, generateMatrix, loading } = useCreativeAgentStore();

  const [occasion, setOccasion] = useState(currentProject?.occasion || '');
  const [guestCount, setGuestCount] = useState(currentProject?.guest_count?.toString() || '');
  const [budget, setBudget] = useState(currentProject?.budget || '');
  const [season, setSeason] = useState(currentProject?.season || '');
  const [industry, setIndustry] = useState(currentProject?.industry || '');
  const [emotionalGoals, setEmotionalGoals] = useState(currentProject?.emotional_goals || '');
  const [targetAudience, setTargetAudience] = useState(currentProject?.target_audience || '');
  const [locationPreference, setLocationPreference] = useState(currentProject?.location_preference || '');

  const [isSaving, setIsSaving] = useState(false);

  if (!currentProject) return null;

  const hasMatrix = currentProject.matrices && currentProject.matrices.length > 0;

  const handleContinue = async () => {
    const token = getToken();
    if (!token) return;
    setIsSaving(true);
    try {
      await updateProject(token, currentProject.id, { current_step: 'matrix' });
    } catch (err) {
      console.error(err);
      alert('Failed to continue.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const token = getToken();
    if (!token) return;
    setIsSaving(true);
    try {
      // 1. Save all fields
      await updateProject(token, currentProject.id, {
        occasion,
        guest_count: parseInt(guestCount) || 0,
        budget: budget === '' ? null : budget,
        season: season === '' ? null : season,
        industry: industry === '' ? null : industry,
        emotional_goals: emotionalGoals === '' ? null : emotionalGoals,
        target_audience: targetAudience === '' ? null : targetAudience,
        location_preference: locationPreference === '' ? null : locationPreference
      });

      // 2. Generate matrix
      await generateMatrix(token, currentProject.id);

    } catch (err) {
      console.error(err);
      alert('Failed to save or generate matrix.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Step 1: Event Briefing</h2>
        <p className="text-slate-400">Specify the parameters for your event. The more details you provide, the more tailored the AI matrix will be.</p>
      </div>

      <div className="bg-[#161f30] rounded-2xl border border-white/10 p-8 shadow-xl space-y-6">
        
        {/* Required Fields Group */}
        <div className="pb-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Required Parameters <span className="text-red-500 text-sm font-normal ml-2">*</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Occasion</label>
              <input 
                type="text" 
                value={occasion} 
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Guest Count</label>
              <input 
                type="number" 
                value={guestCount} 
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Optional Fields Group */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Optional Constraints & Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Budget (€)</label>
              <input 
                type="text" 
                value={budget} 
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Season / Date</label>
              <input 
                type="text" 
                value={season} 
                onChange={(e) => setSeason(e.target.value)}
                placeholder="e.g. Summer, Q3 2026"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Industry</label>
              <input 
                type="text" 
                value={industry} 
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Automotive, Finance"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Target Audience</label>
              <input 
                type="text" 
                value={targetAudience} 
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. C-Level Executives, Employees"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Location Preference</label>
              <input 
                type="text" 
                value={locationPreference} 
                onChange={(e) => setLocationPreference(e.target.value)}
                placeholder="e.g. Southern Europe, Mountains, Urban"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Emotional Goals / Vibe</label>
              <textarea 
                value={emotionalGoals} 
                onChange={(e) => setEmotionalGoals(e.target.value)}
                placeholder="e.g. We want to build absolute trust, but keep the energy very euphoric and dynamic."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors min-h-[100px]"
              />
            </div>

          </div>
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-4">
        {hasMatrix && (
          <button 
            onClick={handleContinue}
            disabled={isSaving || loading}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
          >
            Skip to Matrix <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        )}

        <button 
          onClick={handleSaveAndContinue}
          disabled={isSaving || loading || !occasion || !guestCount}
          className="px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center gap-2 text-lg"
        >
          {isSaving || loading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating Matrix...
            </span>
          ) : (
            <>
              {hasMatrix ? 'Re-generate Matrix' : 'Next: Generate Matrix'} <span className="material-icons-round">auto_awesome</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
