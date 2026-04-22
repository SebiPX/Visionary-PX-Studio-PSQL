import React, { useRef } from 'react';
import { BackgroundToolProps } from '../types';

export const BackgroundTool: React.FC<BackgroundToolProps> = ({
    bgPrompt,
    setBgPrompt,
    bgImage,
    setBgImage,
    onGenerateIdea,
    isGeneratingIdea,
    videoTopic
}) => {
    const bgFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBgImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6 animate-[float_0.3s_ease-out]">
            {/* Background Prompt */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Background Scene</label>
                <textarea
                    value={bgPrompt}
                    onChange={(e) => setBgPrompt(e.target.value)}
                    placeholder="Describe the background scene..."
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

            {/* Background Upload */}
            <div>
                <input
                    type="file"
                    ref={bgFileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />
                {!bgImage ? (
                    <div
                        onClick={() => bgFileInputRef.current?.click()}
                        className="p-4 rounded-xl border border-dashed border-border bg-white/5 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <span className="material-icons-round text-muted-foreground mb-2">upload_file</span>
                        <p className="text-xs text-foreground/90 font-bold">Upload Reference</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Use an image as inspiration</p>
                    </div>
                ) : (
                    <div className="relative rounded-xl overflow-hidden border border-border group">
                        <img src={bgImage} alt="Bg Ref" className="w-full h-32 object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
                            <span className="text-xs font-bold text-foreground">Reference Loaded</span>
                        </div>
                        <button
                            onClick={() => setBgImage(null)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-foreground flex items-center justify-center hover:bg-red-500"
                        >
                            <span className="material-icons-round text-xs">close</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
