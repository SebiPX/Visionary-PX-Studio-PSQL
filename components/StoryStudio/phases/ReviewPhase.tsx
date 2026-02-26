import React from 'react';
import { StoryShot } from '../../../types';

interface ReviewPhaseProps {
    sessionTitle: string;
    shots: StoryShot[];
    actorsCount: number;
    isGenerating: boolean;
    onEditShot: (shot: StoryShot) => void;
    onGenerateShotImage: (shot: StoryShot) => void;
    onBack: () => void;
    onSave: () => void;
}

export const ReviewPhase: React.FC<ReviewPhaseProps> = ({
    sessionTitle,
    shots,
    actorsCount,
    isGenerating,
    onEditShot,
    onGenerateShotImage,
    onBack,
    onSave,
}) => {
    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-slate-800/40 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Storyboard Übersicht</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-slate-500">Titel</p>
                        <p className="text-white font-medium">{sessionTitle}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Shots</p>
                        <p className="text-white font-medium">{shots.length}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Gesamtdauer</p>
                        <p className="text-white font-medium">{totalDuration}s</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Darsteller</p>
                        <p className="text-white font-medium">{actorsCount}</p>
                    </div>
                </div>
            </div>

            {/* Storyboard Shots - Linear View */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Storyboard</h3>

                {shots.length === 0 ? (
                    <div className="bg-slate-800/40 border border-white/10 rounded-xl p-12 text-center">
                        <span className="material-icons-round text-slate-600 text-5xl mb-4">movie_creation</span>
                        <p className="text-slate-400">Keine Shots vorhanden. Gehen Sie zurück zum Storyboard, um Shots hinzuzufügen.</p>
                    </div>
                ) : (
                    shots.map((shot, index) => (
                        <div key={shot.id} className="bg-slate-800/40 border border-white/10 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                                {/* Shot Image */}
                                <div className="md:col-span-1">
                                    <div className="aspect-video bg-slate-900/50 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {shot.image_url ? (
                                            <>
                                                <img src={shot.image_url} alt={shot.title} className="w-full h-full object-cover" />
                                                {/* Regenerate Overlay - appears on hover */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={() => onGenerateShotImage(shot)}
                                                        disabled={isGenerating}
                                                        className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                                                    >
                                                        {isGenerating ? (
                                                            <>
                                                                <span className="material-icons-round text-sm animate-spin">refresh</span>
                                                                Generiere...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-icons-round text-sm">refresh</span>
                                                                Neu generieren
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <span className="material-icons-round text-slate-600 text-4xl mb-2">image</span>
                                                <p className="text-slate-500 text-xs">Kein Bild generiert</p>
                                                <button
                                                    onClick={() => onGenerateShotImage(shot)}
                                                    disabled={isGenerating}
                                                    className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded transition-all flex items-center gap-1 mx-auto"
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <span className="material-icons-round text-xs animate-spin">refresh</span>
                                                            Generiere...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons-round text-xs">auto_awesome</span>
                                                            Bild generieren
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        Shot {index + 1} {shot.scene_number && `• Szene ${shot.scene_number}`}
                                    </div>
                                </div>

                                {/* Shot Details */}
                                <div className="md:col-span-2 space-y-4">
                                    {/* Title & Description */}
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-2">{shot.title}</h4>
                                        <p className="text-slate-300 text-sm">{shot.description}</p>
                                    </div>

                                    {/* Technical Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                        <div>
                                            <p className="text-slate-500 mb-1">Location</p>
                                            <p className="text-white">{shot.location || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Framing</p>
                                            <p className="text-white">{shot.framing}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Perspektive</p>
                                            <p className="text-white">{shot.camera_angle}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Bewegung</p>
                                            <p className="text-white">{shot.camera_movement}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Brennweite</p>
                                            <p className="text-white">{shot.focal_length}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Dauer</p>
                                            <p className="text-white">{shot.duration}s</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Licht</p>
                                            <p className="text-white">{shot.lighting}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Equipment</p>
                                            <p className="text-white">{shot.equipment || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Audio</p>
                                            <p className="text-white">{shot.audio_notes || '-'}</p>
                                        </div>
                                    </div>

                                    {/* Additional Notes */}
                                    {(shot.movement_notes || shot.vfx_notes || shot.notes) && (
                                        <div className="space-y-2 text-xs">
                                            {shot.movement_notes && (
                                                <div>
                                                    <p className="text-slate-500">Bewegungsnotizen:</p>
                                                    <p className="text-slate-300">{shot.movement_notes}</p>
                                                </div>
                                            )}
                                            {shot.vfx_notes && (
                                                <div>
                                                    <p className="text-slate-500">VFX:</p>
                                                    <p className="text-slate-300">{shot.vfx_notes}</p>
                                                </div>
                                            )}
                                            {shot.notes && (
                                                <div>
                                                    <p className="text-slate-500">Notizen:</p>
                                                    <p className="text-slate-300">{shot.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => onEditShot(shot)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-all flex items-center gap-1"
                                        >
                                            <span className="material-icons-round text-xs">edit</span>
                                            Bearbeiten
                                        </button>
                                        <button
                                            onClick={() => onGenerateShotImage(shot)}
                                            disabled={isGenerating}
                                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded transition-all flex items-center gap-1"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <span className="material-icons-round text-xs animate-spin">refresh</span>
                                                    Generiere...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons-round text-xs">{shot.image_url ? 'refresh' : 'auto_awesome'}</span>
                                                    {shot.image_url ? 'Neu generieren' : 'Bild generieren'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                >
                    ← Zurück zum Storyboard
                </button>
                <button
                    onClick={onSave}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                    <span className="material-icons-round text-sm">save</span>
                    Speichern
                </button>
            </div>
        </div>
    );
};
