import React, { useRef, useState } from 'react';
import { useCreativeAgentStore } from '../../../store/useCreativeAgentStore';
import { getToken } from '../../../lib/apiClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const OutputStep: React.FC = () => {
  const { currentProject, setCurrentProject, updateProject } = useCreativeAgentStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      const element = printRef.current;
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#0f172a', // matching bg
        ignoreElements: (node) => node.tagName?.toLowerCase() === 'video'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const safeTitle = currentProject?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export';
      pdf.save(`PX_Creative_Concept_${safeTitle}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF.");
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
                          <p className="text-sm text-slate-400 mt-1">{finalConcept.scamper_refinements.real_world_validation.location.description}</p>
                        </div>
                      )}
                      
                      {finalConcept.scamper_refinements.real_world_validation.vendor && (
                        <div>
                          <span className="block text-xs uppercase text-slate-500 mb-1">Real Vendor / Caterer</span>
                          <strong className="text-blue-400 text-base block">{finalConcept.scamper_refinements.real_world_validation.vendor.name}</strong>
                          <p className="text-sm text-slate-400 mt-1">{finalConcept.scamper_refinements.real_world_validation.vendor.description}</p>
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
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? (
             <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Exporting...
            </span>
          ) : (
             <>
               <span className="material-icons-round text-sm">picture_as_pdf</span> Export PDF Pitch
             </>
          )}
        </button>
      </div>

    </div>
  );
};
