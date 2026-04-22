import React from 'react';
import { TextToolProps } from '../types';

export const TextTool: React.FC<TextToolProps> = ({
    textContent,
    setTextContent,
    textStyle,
    setTextStyle,
    onGenerateIdea,
    isGeneratingIdea,
    videoTopic
}) => {
    const textStyles = [
        'Bold & Modern',
        'Elegant Script',
        'Playful Cartoon',
        'Tech Futuristic',
        'Minimal Clean'
    ];

    return (
        <div className="space-y-6 animate-[float_0.3s_ease-out]">
            {/* Text Content */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Text Overlay</label>
                <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your text..."
                    className="w-full min-h-24 max-h-[60vh] px-4 py-3 bg-white/5 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
            </div>

            {/* Generate Idea Button */}
            <div>
                <button
                    onClick={onGenerateIdea}
                    disabled={isGeneratingIdea || !videoTopic}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    <span className={`material-icons-round text-sm ${isGeneratingIdea ? 'animate-spin' : ''}`}>
                        {isGeneratingIdea ? 'autorenew' : 'auto_awesome'}
                    </span>
                    {isGeneratingIdea ? 'Thinking...' : 'Generate Idea from Topic'}
                </button>
            </div>

            {/* Text Style Selector */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Text Style</label>
                <div className="grid grid-cols-2 gap-2">
                    {textStyles.map((style) => (
                        <button
                            key={style}
                            onClick={() => setTextStyle(style)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${textStyle === style
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
