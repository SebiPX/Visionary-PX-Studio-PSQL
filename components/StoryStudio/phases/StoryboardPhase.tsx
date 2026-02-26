import React from 'react';
import { StoryShot, StoryAsset } from '../../../types';

interface StoryboardPhaseProps {
    shots: StoryShot[];
    environment: StoryAsset | null;
    isGenerating: boolean;
    onGenerateShots: () => void;
    onAddShot: () => void;
    onEditShot: (shot: StoryShot) => void;
    onDeleteShot: (shotId: string) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StoryboardPhase: React.FC<StoryboardPhaseProps> = ({
    shots,
    environment,
    isGenerating,
    onGenerateShots,
    onAddShot,
    onEditShot,
    onDeleteShot,
    onBack,
    onNext,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Shots ({shots.length})</h3>
                <div className="flex gap-3">
                    <button
                        onClick={onGenerateShots}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary-hover disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <span className="material-icons-round text-sm animate-spin">refresh</span>
                                Generiere...
                            </>
                        ) : (
                            <>
                                <span className="material-icons-round text-sm">auto_awesome</span>
                                Generate Shots with AI
                            </>
                        )}
                    </button>
                    <button
                        onClick={onAddShot}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                        <span className="material-icons-round text-sm">add</span>
                        Add Shot
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shots.map((shot, index) => (
                    <div
                        key={shot.id}
                        className="bg-slate-800/40 border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
                        onClick={() => onEditShot(shot)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-xs text-slate-500">Shot {index + 1}</span>
                                {shot.scene_number && (
                                    <span className="ml-2 text-xs text-primary">#{shot.scene_number}</span>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteShot(shot.id);
                                }}
                                className="text-red-400 hover:text-red-300"
                            >
                                <span className="material-icons-round text-sm">delete</span>
                            </button>
                        </div>
                        <h4 className="text-white font-medium mb-2">{shot.title || 'Untitled Shot'}</h4>
                        <p className="text-slate-400 text-xs mb-3 line-clamp-2">{shot.description || 'No description'}</p>

                        <div className="flex flex-wrap gap-1 mb-2">
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">{shot.framing}</span>
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{shot.camera_movement}</span>
                            {shot.duration && (
                                <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{shot.duration}s</span>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditShot(shot);
                            }}
                            className="w-full mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-all flex items-center justify-center gap-1"
                        >
                            <span className="material-icons-round text-xs">edit</span>
                            Bearbeiten
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                >
                    ← Back to Story
                </button>
                <button
                    onClick={onNext}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all"
                >
                    Continue to Review →
                </button>
            </div>
        </div>
    );
};
