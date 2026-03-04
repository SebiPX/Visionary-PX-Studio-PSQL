import React, { useState, useRef } from 'react';
import { fal } from '@fal-ai/client';
import { uploadFile } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import toast from 'react-hot-toast';

export const Studio3D: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  
  // Advanced Settings
  const [textureSize, setTextureSize] = useState<1024 | 2048 | 4096>(2048);
  const [decimationTarget, setDecimationTarget] = useState<number>(500000);
  const [samplingSteps, setSamplingSteps] = useState<number>(12);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { save3D } = useGeneratedContent();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setGeneratedModelUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      toast.error('Bitte lade zuerst ein Bild hoch.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusText('Bild vorbereiten...');
    
    try {
      // 1. Convert local Base64 purely for passing as data URI or uploading
      let imageUrl = sourceImage;
      
      setStatusText('Modell analysieren & 3D Daten formen...');
      const result = await fal.subscribe("fal-ai/trellis-2", {
        input: {
          resolution: 1024,
          ss_guidance_strength: 7.5,
          ss_guidance_rescale: 0.7,
          ss_sampling_steps: samplingSteps,
          ss_rescale_t: 5,
          shape_slat_guidance_strength: 7.5,
          shape_slat_guidance_rescale: 0.5,
          shape_slat_sampling_steps: samplingSteps,
          shape_slat_rescale_t: 3,
          tex_slat_guidance_strength: 1,
          tex_slat_sampling_steps: samplingSteps,
          tex_slat_rescale_t: 3,
          decimation_target: decimationTarget,
          texture_size: textureSize,
          remesh: true,
          remesh_band: 1,
          image_url: imageUrl,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            const msgs = update.logs?.map(log => log.message) || [];
            if (msgs.length > 0) {
              setStatusText(msgs[msgs.length - 1]);
            }
            // Estimate progress visually
            setProgress((prev) => Math.min(prev + 5, 95));
          }
        },
      });

      console.log('Trellis Result:', result.data);
      const outputModel = (result.data as any).model_glb?.url || (result.data as any).model_file?.url;
      
      if (!outputModel) {
        throw new Error("No model link found in response.");
      }

      setGeneratedModelUrl(outputModel);
      setProgress(100);
      setStatusText('Modell fertig!');

      // Save to database
      await save3D({
        image_url: sourceImage,
        model_url: outputModel,
        config: { model: 'fal-ai/trellis-2' }
      });

      toast.success('3D Modell erfolgreich generiert!');
    } catch (err: any) {
      console.error(err);
      toast.error('Fehler bei der 3D-Generierung: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#101622]">
      {/* Sidebar for Controls */}
      <div className="w-96 border-r border-[#1e293b] flex flex-col hide-scrollbar overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center neon-glow">
              <span className="material-icons-round">view_in_ar</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">3D Studio</h2>
              <p className="text-xs text-slate-400">Image-to-3D Object Synthesis</p>
            </div>
          </div>

          <div className="space-y-6">
             {/* Upload Section */}
             <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Referenzbild (2D)</label>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-48 rounded-xl border-2 border-dashed border-white/10 bg-[#0a0f18] hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center"
              >
                {sourceImage ? (
                  <>
                    <img src={sourceImage} alt="Reference" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white bg-black/50 px-4 py-2 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm flex items-center gap-2">
                        <span className="material-icons-round">edit</span> Bild ändern
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <span className="material-icons-round text-4xl text-slate-500 mb-2 group-hover:text-primary transition-colors">cloud_upload</span>
                    <p className="text-sm text-slate-400 font-medium">Klicken zum Upload</p>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP unterstützt</p>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-icons-round text-lg transition-transform duration-300" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
                Erweiterte Parameter (Optional)
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-white/5 border border-white/5 rounded-xl">
                  {/* Texture Size */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Textur-Auflösung</label>
                      <span className="text-xs text-slate-400">{textureSize}px</span>
                    </div>
                    <div className="flex gap-2">
                      {[1024, 2048, 4096].map(val => (
                        <button
                          key={val}
                          onClick={() => setTextureSize(val as any)}
                          className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${textureSize === val ? 'bg-primary text-white font-medium' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Polygon Count (Decimation) */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Geometrie-Detail (Polygone)</label>
                      <span className="text-xs text-slate-400">
                        {decimationTarget === 50000 ? 'Low Poly' : decimationTarget === 100000 ? 'Medium' : 'High Poly'}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="50000" 
                      max="500000" 
                      step="50000"
                      value={decimationTarget}
                      onChange={(e) => setDecimationTarget(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>50k (Schneller)</span>
                      <span>500k (Detaillierter)</span>
                    </div>
                  </div>

                  {/* Sampling Steps */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">KI Detail-Schritte</label>
                      <span className="text-xs text-slate-400">{samplingSteps} Steps</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="24" 
                      step="2"
                      value={samplingSteps}
                      onChange={(e) => setSamplingSteps(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                     <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>10 (Draft)</span>
                      <span>24 (Hi-Res)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                onClick={handleGenerate}
                disabled={!sourceImage || isGenerating}
                className="w-full h-12 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-primary text-white font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                   <>
                     <span className="material-icons-round animate-spin">refresh</span>
                     Generiere...
                   </>
                ) : (
                   <>
                     <span className="material-icons-round">box</span>
                     3D Modell erstellen
                   </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-[#0a0f18] relative overflow-hidden flex items-center justify-center">
         {!sourceImage && !isGenerating && !generatedModelUrl && (
            <div className="text-center text-slate-500 animate-pulse">
               <span className="material-icons-round text-6xl mb-4 opacity-50 block">3d_rotation</span>
               <p className="font-medium text-lg">Lade ein Bild hoch, um es in 3D zu verwandeln.</p>
            </div>
         )}
         
         {isGenerating && (
            <div className="text-center z-10 w-full max-w-sm">
                <div className="mb-6 relative w-24 h-24 mx-auto">
                  <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center material-icons-round text-primary/80">3d_rotation</span>
                </div>
                
                <h3 className="text-white text-lg font-bold mb-2">Trellis arbeitet...</h3>
                <p className="text-slate-400 text-sm mb-4 h-5 overflow-hidden">{statusText}</p>
                
                <div className="w-full bg-[#1a2333] rounded-full h-2 shadow-inner overflow-hidden border border-white/5">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 relative" 
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
            </div>
         )}

         {!isGenerating && generatedModelUrl && (
            <div className="w-full h-full relative">
               {/* 
                 @ts-ignore 
               */}
               <model-viewer 
                 src={generatedModelUrl} 
                 alt="A 3D model" 
                 auto-rotate 
                 camera-controls 
                 ar 
                 shadow-intensity="1" 
                 tone-mapping="neutral"
                 style={{ width: '100%', height: '100%', backgroundColor: '#0a0f18' }}
               />
               
               <div className="absolute top-6 right-6 flex items-center gap-3">
                 <button 
                  onClick={() => window.open(generatedModelUrl, '_blank')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 transition-colors"
                 >
                   <span className="material-icons-round text-sm text-slate-300">download</span>
                   <span className="text-sm font-medium text-slate-300">Objekt Download (.glb)</span>
                 </button>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
