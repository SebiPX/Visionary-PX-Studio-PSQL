import React from 'react';
import { ContextOption, StyleOption } from './types';

interface ControlPanelProps {
  context: ContextOption;
  setContext: (context: ContextOption) => void;
  style: StyleOption;
  setStyle: (style: StyleOption) => void;
  aspectRatio: '1:1' | '16:9' | '9:16';
  setAspectRatio: (ratio: '1:1' | '16:9' | '9:16') => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  context,
  setContext,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  isGenerating,
}) => {
  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6 flex flex-col gap-6 h-full overflow-y-auto">

      {/* Context Selection */}
      <div>
        <label className="block text-sm font-semibold text-foreground/90 mb-3 flex items-center gap-2">
          <span className="material-icons-round text-[#135bec]">category</span>
          Subject Context
        </label>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(ContextOption).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setContext(value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${context === value
                ? 'bg-card text-foreground shadow-lg shadow-[#135bec]/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-semibold text-foreground/90 mb-3 flex items-center gap-2">
          <span className="material-icons-round text-[#135bec]">palette</span>
          Artistic Style
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {Object.entries(StyleOption).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setStyle(value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${style === value
                ? 'bg-card text-foreground shadow-lg shadow-[#135bec]/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Selection */}
      <div>
        <label className="block text-sm font-semibold text-foreground/90 mb-3 flex items-center gap-2">
          <span className="material-icons-round text-[#135bec]">aspect_ratio</span>
          Aspect Ratio
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setAspectRatio('1:1')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${aspectRatio === '1:1'
                ? 'bg-card text-foreground shadow-lg shadow-[#135bec]/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
          >
            <span className="material-icons-round">crop_square</span>
            <span className="text-[9px]">1:1</span>
          </button>
          <button
            onClick={() => setAspectRatio('16:9')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${aspectRatio === '16:9'
                ? 'bg-card text-foreground shadow-lg shadow-[#135bec]/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
          >
            <span className="material-icons-round">crop_landscape</span>
            <span className="text-[9px]">16:9</span>
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${aspectRatio === '9:16'
                ? 'bg-card text-foreground shadow-lg shadow-[#135bec]/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
          >
            <span className="material-icons-round">crop_portrait</span>
            <span className="text-[9px]">9:16</span>
          </button>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className={`mt-auto py-4 px-6 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${isGenerating
          ? 'bg-secondary text-muted-foreground cursor-not-allowed'
          : 'bg-gradient-to-r from-[#135bec] to-[#0d4bb8] text-foreground hover:shadow-lg hover:shadow-[#135bec]/50 hover:scale-105'
          }`}
      >
        {isGenerating ? (
          <>
            <span className="material-icons-round animate-spin">refresh</span>
            Generating...
          </>
        ) : (
          <>
            <span className="material-icons-round">auto_awesome</span>
            Generate Image
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center">
        <p>Draw your sketch on the canvas, then click Generate to transform it into a photorealistic image.</p>
      </div>
    </div>
  );
};

export default ControlPanel;
