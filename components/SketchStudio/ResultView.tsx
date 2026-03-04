import React, { useState } from 'react';
import { ContextOption, StyleOption } from './types';
import { downloadAsset } from '../../lib/apiClient';

interface ResultViewProps {
  originalSketch: string;
  generatedImage: string;
  context: ContextOption;
  style: StyleOption;
  onBack: () => void;
  onEdit: (instruction: string) => Promise<void>;
  isEditing: boolean;
}

const ResultView: React.FC<ResultViewProps> = ({
  originalSketch,
  generatedImage,
  context,
  style,
  onBack,
  onEdit,
  isEditing
}) => {
  const [prompt, setPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onEdit(prompt);
    setPrompt('');
  };

  const handleDownload = () => {
    downloadAsset(generatedImage, `sketch-masterpiece-${Date.now()}.png`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800/50 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
        >
          <span className="material-icons-round text-lg">arrow_back</span>
          <span className="text-sm font-medium">Back to Sketch</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#135bec] hover:bg-[#0d4bb8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#135bec]/30"
          >
            <span className="material-icons-round text-lg">download</span>
            Download
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 relative">
        <div className="flex h-full gap-6">
          {/* Main Display Area (Left) - Generated Image */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#135bec] uppercase tracking-wider flex items-center gap-2">
                <span className="material-icons-round">auto_awesome</span>
                Generated Masterpiece
              </h3>
            </div>

            <div className="relative rounded-xl overflow-hidden border-2 border-[#135bec]/30 shadow-2xl shadow-[#135bec]/10 flex-1 bg-slate-950/50 group">
              <img
                src={generatedImage}
                alt="Generated Masterpiece"
                className={`w-full h-full object-contain transition-opacity duration-500 ${isEditing ? 'opacity-50 blur-sm' : 'opacity-100'}`}
              />

              {/* Controls Overlay - Matching ImageGen Style */}
              {!isEditing && (
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Fullscreen Preview"
                  >
                    <span className="material-icons-round">fullscreen</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    title="Download Image"
                  >
                    <span className="material-icons-round">download</span>
                  </button>
                </div>
              )}

              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-slate-900/80 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md border border-[#135bec]/30">
                    <span className="material-icons-round animate-spin text-[#135bec]">refresh</span>
                    <span className="text-white font-medium">Refining image...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Right) - Sketch & Info */}
          <div className="w-[300px] shrink-0 flex flex-col gap-4 h-full overflow-y-auto pr-1">

            {/* Original Sketch Card */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                Original Sketch
              </h3>
              <div className="bg-white rounded-lg overflow-hidden border border-slate-600 aspect-video relative flex items-center justify-center">
                {originalSketch ? (
                  <img src={originalSketch} alt="Sketch" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400 text-xs">Not available for restored sketches</span>
                )}
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase tracking-wider mb-1">Artistic Style</span>
                  <span className="text-white text-sm font-medium block truncate bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">{style}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase tracking-wider mb-1">Context</span>
                  <span className="text-white text-sm font-medium block truncate bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">{context}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer - Edit Prompt */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
        <form onSubmit={handleEditSubmit} className="relative max-w-3xl mx-auto">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isEditing}
            placeholder='Refine the result... e.g., "Add a warm sunset glow", "Make it look more futuristic"'
            className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-full py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all shadow-lg"
          />
          <button
            type="submit"
            disabled={isEditing || !prompt.trim()}
            className="absolute right-2 top-2 p-2 bg-[#135bec] text-white rounded-full hover:bg-[#0d4bb8] disabled:opacity-50 disabled:hover:bg-[#135bec] transition-colors"
          >
            <span className="material-icons-round">send</span>
          </button>
        </form>
        <p className="text-center text-slate-500 text-xs mt-3">
          Powered by Gemini 3.1 Flash. Describe changes to update the image.
        </p>
      </div>

      {/* Fullscreen Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 p-3 glass rounded-lg text-white hover:bg-white/10 transition-colors z-10"
            title="Close Preview"
          >
            <span className="material-icons-round">close</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="absolute top-4 right-20 p-3 glass rounded-lg text-white hover:bg-white/10 transition-colors z-10"
            title="Download Image"
          >
            <span className="material-icons-round">download</span>
          </button>
          <img
            src={generatedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ResultView;
