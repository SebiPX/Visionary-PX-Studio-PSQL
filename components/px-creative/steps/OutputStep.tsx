import React, { useRef, useState } from 'react';
import { useCreativeAgentStore } from '../../../store/useCreativeAgentStore';
import { getToken } from '../../../lib/apiClient';

const renderWithLinks = (text?: string) => {
  if (!text) return text;
  // Regex matches http://, https://, or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return <a key={i} href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">{part}</a>;
    }
    return part;
  });
};

export const OutputStep: React.FC = () => {
  const { currentProject, setCurrentProject, updateProject } = useCreativeAgentStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportHTML = () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      const content = printRef.current.innerHTML;
      
      const htmlTemplate = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PX Creative Concept: ${currentProject?.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
      body {
        background-color: #0f1522;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      }
    </style>
</head>
<body class="min-h-screen py-10 px-4 md:px-10 flex flex-col items-center">
    <div class="max-w-4xl w-full bg-[#161f30] rounded-2xl border border-white/10 p-8 shadow-xl relative overflow-hidden">
        ${content}
    </div>
</body>
</html>`;

      const blob = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const safeTitle = currentProject?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export';
      link.setAttribute('download', `PX_Creative_Concept_${safeTitle}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("HTML Export failed:", err);
      alert("Failed to generate HTML.");
    } finally {
      setIsExporting(false);
    }
  };

  const finalConcept = currentProject?.concepts?.find(c => c.is_final_choice);

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 neon-glow shadow-[0_0_30px_rgba(34,197,94,0.4)]">
          <span className="material-icons-round text-4xl text-green-400">task_alt</span>
        </div>
        <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-4">Event Concept Finalized!</h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          You have successfully generated, mapped out, and refined a unique event concept for <b>{currentProject?.title}</b>.
        </p>
      </div>

      {finalConcept && (
        <div ref={printRef} className="bg-[#161f30] rounded-2xl border border-white/10 p-8 shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4 relative z-10">
            Selected Concept Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Parameters</h4>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between"><span>Occasion:</span> <strong className="text-white">{currentProject?.occasion}</strong></div>
                  <div className="flex justify-between"><span>Guests:</span> <strong className="text-white">{currentProject?.guest_count}</strong></div>
                  <div className="flex justify-between"><span>Budget:</span> <strong className="text-white">{currentProject?.budget || 'N/A'}</strong></div>
                  <div className="flex justify-between"><span>HNW Score:</span> <strong className="text-orange-400 uppercase">{finalConcept.how_now_wow_score}</strong></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Core Matrix Pillars</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(finalConcept.selected_parameters).map(([key, val]) => (
                    <div key={key} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-xs">
                      <span className="block text-[10px] text-slate-500 uppercase mb-1">{key}</span>
                      <span className="text-white font-medium">{val as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                  <span className="material-icons-round text-sm">auto_awesome</span> The Wow-Factor (SCAMPER)
                </h4>
                {finalConcept.scamper_refinements?.applied_adjectives && finalConcept.scamper_refinements.applied_adjectives.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 mt-2">
                    {finalConcept.scamper_refinements.applied_adjectives.map((adj, i) => (
                      <span key={i} className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs uppercase font-bold rounded border border-orange-500/30">
                        {adj}
                      </span>
                    ))}
                  </div>
                )}
                <div className="bg-orange-500/10 p-5 rounded-xl border border-orange-500/20 mb-6">
                  <p className="text-slate-200 leading-relaxed italic text-lg">
                    "{finalConcept.scamper_refinements?.idea}"
                  </p>
                </div>

                {finalConcept.scamper_refinements?.real_world_validation && (
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span className="material-icons-round text-sm">travel_explore</span> Real-World Validation
                    </h4>
                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 space-y-4">
                      {finalConcept.scamper_refinements.real_world_validation.location && (
                        <div>
                          <span className="block text-xs uppercase text-slate-500 mb-1">Real Location</span>
                          <strong className="text-green-400 text-base block">{finalConcept.scamper_refinements.real_world_validation.location.name}</strong>
                          <p className="text-sm text-slate-400 mt-1 mb-2">{finalConcept.scamper_refinements.real_world_validation.location.description}</p>
                          {finalConcept.scamper_refinements.real_world_validation.location.address && <p className="text-xs text-slate-300 mt-1"><span className="opacity-50">📍</span> {finalConcept.scamper_refinements.real_world_validation.location.address}</p>}
                          {finalConcept.scamper_refinements.real_world_validation.location.contact && <p className="text-xs text-slate-300"><span className="opacity-50">📞</span> {finalConcept.scamper_refinements.real_world_validation.location.contact}</p>}
                          {finalConcept.scamper_refinements.real_world_validation.location.website && <p className="text-xs text-blue-400 truncate"><a href={finalConcept.scamper_refinements.real_world_validation.location.website.startsWith('http') ? finalConcept.scamper_refinements.real_world_validation.location.website : `https://${finalConcept.scamper_refinements.real_world_validation.location.website}`} target="_blank" rel="noreferrer" className="hover:underline"><span className="opacity-70">🌐</span> {finalConcept.scamper_refinements.real_world_validation.location.website}</a></p>}
                        </div>
                      )}
                      
                      {finalConcept.scamper_refinements.real_world_validation.nearby_vendors && finalConcept.scamper_refinements.real_world_validation.nearby_vendors.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <span className="block text-xs uppercase text-slate-500 mb-3">Nearby Vendors</span>
                          <div className="space-y-4">
                            {finalConcept.scamper_refinements.real_world_validation.nearby_vendors.map((v: any, vi: number) => (
                              <div key={vi} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <strong className="text-blue-400 text-sm block">{v.name} <span className="text-xs text-slate-500 font-normal">({v.type})</span></strong>
                                <p className="text-xs text-slate-400 mt-1">{v.description}</p>
                                <p className="text-xs text-slate-300 mt-2"><span className="opacity-50">📞</span> {renderWithLinks(v.contact)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setCurrentProject(null)}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">home</span> Dashboard
        </button>
        <button 
          onClick={async () => {
             const token = getToken();
             if (token && currentProject) await updateProject(token, currentProject.id, { current_step: 'scamper' });
          }}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">arrow_back</span> Back to SCAMPER
        </button>
        <button 
          className="px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center gap-2 disabled:opacity-50"
          onClick={handleExportHTML}
          disabled={isExporting}
        >
          {isExporting ? (
             <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Exporting...
            </span>
          ) : (
             <>
               <span className="material-icons-round text-sm">html</span> Export HTML Pitch
             </>
          )}
        </button>
      </div>

    </div>
  );
};
