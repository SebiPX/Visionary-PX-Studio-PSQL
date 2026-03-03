import React, { useState, useEffect } from 'react';
import { useCreativeAgentStore } from '../../../store/useCreativeAgentStore';
import { getToken } from '../../../lib/apiClient';

export const MatrixStep: React.FC = () => {
  const { currentProject, generateConcepts, loading, updateProject } = useCreativeAgentStore();

  const [activeConceptIndex, setActiveConceptIndex] = useState(0);
  const [concepts, setConcepts] = useState<Array<Record<string, string>>>([{}, {}]); // Pre-fill with 2 empty concepts
  const [isGenerating, setIsGenerating] = useState(false);

  // Load previously selected user concepts if available
  useEffect(() => {
    if (currentProject?.concepts && currentProject.concepts.length > 0) {
      const userConcepts = currentProject.concepts.filter(c => c.concept_type === 'user');
      if (userConcepts.length === 2) {
        setConcepts([userConcepts[0].selected_parameters, userConcepts[1].selected_parameters]);
      }
    }
  }, [currentProject?.concepts]);

  // Parse Matrix Data securely
  const matrixData = currentProject?.matrices?.[0]?.matrix_data;
  const categories = matrixData?.categories || [];

  const handleSelectOption = (categoryName: string, optionName: string) => {
    const updatedConcepts = [...concepts];
    updatedConcepts[activeConceptIndex] = {
      ...updatedConcepts[activeConceptIndex],
      [categoryName]: optionName
    };
    setConcepts(updatedConcepts);
  };

  const hasConcepts = currentProject?.concepts && currentProject.concepts.length > 0;

  const handleContinue = async () => {
    const token = getToken();
    if (!token || !currentProject) return;
    setIsGenerating(true);
    try {
      await updateProject(token, currentProject.id, { current_step: 'scamper' });
    } catch (err) {
      console.error(err);
      alert('Failed to continue.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScamper = async () => {
    const token = getToken();
    if (!token || !currentProject) return;
    setIsGenerating(true);
    try {
      await generateConcepts(token, currentProject.id, concepts);
    } catch (err) {
      console.error(err);
      alert('Failed to generate SCAMPER concepts.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isConceptComplete = (index: number) => {
    const concept = concepts[index];
    const catKeys = categories.map((c: any) => c.name);
    return catKeys.every((k: string) => concept[k]);
  };

  const bothComplete = isConceptComplete(0) && isConceptComplete(1);

  if (!matrixData || categories.length === 0) {
    return <div className="p-8 text-center text-slate-400">Waiting for Matrix data... Please hold on.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Step 2: The Morphological Matrix</h2>
          <p className="text-slate-400">
            Combine parameters to create your <b>2 favorite seed concepts</b>. The AI has mapped out standard options (Green) and radical ideas (Red).
          </p>
        </div>
      </div>

      <div className="flex gap-6 mb-8">
        {[0, 1].map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveConceptIndex(idx)}
            className={`flex-1 p-4 rounded-xl border transition-all ${
              activeConceptIndex === idx 
                ? 'border-orange-500 bg-orange-500/10' 
                : 'border-white/10 bg-[#161f30] hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold ${activeConceptIndex === idx ? 'text-orange-500' : 'text-slate-300'}`}>
                Concept {idx + 1}
              </span>
              {isConceptComplete(idx) && (
                <span className="material-icons-round text-green-500 text-sm">check_circle</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-left">
              {Object.keys(concepts[idx]).length} / {categories.length} selected
            </p>
          </button>
        ))}
      </div>

      <div className="bg-[#161f30] rounded-2xl border border-white/10 p-2 shadow-xl overflow-hidden">
        <div className="overflow-x-auto p-6 hide-scrollbar">
          
          <table className="w-full border-collapse">
            <tbody>
              {categories.map((cat: any, i: number) => {
                const activeSelection = concepts[activeConceptIndex][cat.name];
                return (
                  <tr key={cat.name} className={`${i !== categories.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <td className="py-6 pr-6 w-48 align-middle whitespace-nowrap">
                      <h4 className="font-bold text-slate-300 tracking-tight">{cat.name}</h4>
                    </td>
                    <td className="py-6 align-middle">
                      <div className="flex flex-wrap gap-3">
                        {cat.options.map((opt: any, j: number) => {
                          const isSelected = activeSelection === opt.name;
                          const colorObj = 
                            opt.color === 'green' ? { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]' } :
                            opt.color === 'red' ? { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' } :
                            { bg: 'bg-white/5', text: 'text-slate-300', border: 'border-white/10', glow: 'shadow-none' };
                          
                          return (
                            <button
                              key={opt.name}
                              onClick={() => handleSelectOption(cat.name, opt.name)}
                              title={opt.reason}
                              className={`px-4 py-2 rounded-lg text-sm transition-all border block whitespace-normal text-left
                                ${isSelected 
                                  ? `${colorObj.bg} ${colorObj.border} ${colorObj.text} font-bold ${colorObj.glow} scale-105` 
                                  : 'bg-[#0f1522] border-white/5 text-slate-400 hover:border-white/20'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{opt.name}</span>
                                {isSelected && <span className="material-icons-round text-[12px] flex-shrink-0">check</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button 
          onClick={async () => {
            const token = getToken();
            if (token && currentProject) await updateProject(token, currentProject.id, { current_step: 'briefing' });
          }}
          disabled={isGenerating || loading}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">arrow_back</span> Back to Briefing
        </button>

        <div className="flex gap-4 items-center">
          {hasConcepts && (
            <button 
              onClick={handleContinue}
              disabled={isGenerating || loading}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
            >
              Skip to SCAMPER <span className="material-icons-round text-sm">arrow_forward</span>
            </button>
          )}

          <button 
            onClick={handleGenerateScamper}
            disabled={!bothComplete || isGenerating || loading}
            className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-2 text-lg"
          >
            {isGenerating || loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Running SCAMPER Engine...
              </span>
            ) : (
              <>
                {hasConcepts ? 'Re-generate Concepts' : 'Next: Generate SCAMPER Concepts'} <span className="material-icons-round">bolt</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
