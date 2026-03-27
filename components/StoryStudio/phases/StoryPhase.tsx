import React from 'react';

interface StoryPhaseProps {
    genre: string;
    mood: string;
    targetAudience: string;
    storyText: string;
    storyboardStyle: string;
    onGenreChange: (genre: string) => void;
    onMoodChange: (mood: string) => void;
    onTargetAudienceChange: (audience: string) => void;
    onStoryTextChange: (text: string) => void;
    onStoryboardStyleChange: (style: string) => void;
    onGenerateStory: () => void;
    isGenerating: boolean;
    onBack: () => void;
    onNext: () => void;
}

export const StoryPhase: React.FC<StoryPhaseProps> = ({
    genre,
    mood,
    targetAudience,
    storyText,
    storyboardStyle,
    onGenreChange,
    onMoodChange,
    onTargetAudienceChange,
    onStoryTextChange,
    onStoryboardStyleChange,
    onGenerateStory,
    isGenerating,
    onBack,
    onNext,
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-muted-foreground mb-2">Genre</label>
                    <input
                        type="text"
                        value={genre}
                        onChange={(e) => onGenreChange(e.target.value)}
                        className="w-full bg-card/50 border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="e.g., Drama, Comedy"
                    />
                </div>
                <div>
                    <label className="block text-sm text-muted-foreground mb-2">Mood</label>
                    <input
                        type="text"
                        value={mood}
                        onChange={(e) => onMoodChange(e.target.value)}
                        className="w-full bg-card/50 border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="e.g., Uplifting, Suspenseful"
                    />
                </div>
                <div>
                    <label className="block text-sm text-muted-foreground mb-2">Target Audience</label>
                    <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => onTargetAudienceChange(e.target.value)}
                        className="w-full bg-card/50 border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="e.g., Young adults"
                    />
                </div>
            </div>

            {/* Storyboard Style Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Storyboard Visual Style
                </label>
                <select
                    value={storyboardStyle}
                    onChange={(e) => onStoryboardStyleChange(e.target.value)}
                    className="w-full px-4 py-2 bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition-all"
                >
                    <option value="realistic">📸 Realistic / Photographic</option>
                    <option value="illustrated">🎨 Illustrated / Concept Art</option>
                    <option value="comic">💥 Comic Book Style</option>
                    <option value="sketch">✏️ Pencil Sketch</option>
                    <option value="anime">🎌 Anime / Manga</option>
                    <option value="noir">🎬 Film Noir</option>
                    <option value="watercolor">🖌️ Watercolor</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                    All storyboard images will be generated in this visual style
                </p>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm text-muted-foreground">Story</label>
                    <button
                        onClick={onGenerateStory}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-secondary disabled:cursor-not-allowed text-foreground font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <span className="material-icons-round text-sm animate-spin">refresh</span>
                                Generiere...
                            </>
                        ) : (
                            <>
                                <span className="material-icons-round text-sm">auto_awesome</span>
                                Generate Story with AI
                            </>
                        )}
                    </button>
                </div>
                <textarea
                    value={storyText}
                    onChange={(e) => onStoryTextChange(e.target.value)}
                    className="w-full bg-card/50 border border-border rounded-lg px-4 py-3 text-foreground resize-none"
                    rows={12}
                    placeholder="Write your story here..."
                />
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-secondary hover:bg-muted-foreground/20 text-foreground font-semibold rounded-lg transition-all"
                >
                    ← Back to Setup
                </button>
                <button
                    onClick={onNext}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-foreground font-semibold rounded-lg transition-all"
                >
                    Continue to Storyboard →
                </button>
            </div>
        </div>
    );
};
