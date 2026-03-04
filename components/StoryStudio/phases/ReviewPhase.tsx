import React, { useState } from 'react';
import { StoryShot } from '../../../types';

interface ReviewPhaseProps {
    sessionTitle: string;
    shots: StoryShot[];
    actorsCount: number;
    isGenerating: boolean;
    onEditShot: (shot: StoryShot) => void;
    onGenerateShotImage: (shot: StoryShot) => void;
    onGenerateShotVideo: (shot: StoryShot) => void;
    onUpdateShot: (shot: StoryShot) => void;
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
    onGenerateShotVideo,
    onUpdateShot,
    onBack,
    onSave,
}) => {
    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
    const [previewShot, setPreviewShot] = useState<StoryShot | null>(null);

    const handleDownload = async (shot: StoryShot) => {
        if (!shot.image_url) return;
        try {
            const res = await fetch(shot.image_url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shot-${shot.scene_number || shot.order + 1}-${shot.title.replace(/\s+/g, '-')}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Fallback: open in new tab
            window.open(shot.image_url, '_blank');
        }
    };

    const handleVideoDownload = async (shot: StoryShot) => {
        if (!shot.video_url) return;
        try {
            const res = await fetch(shot.video_url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shot-${shot.scene_number || shot.order + 1}-${shot.title.replace(/\\s+/g, '-')}.mp4`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(shot.video_url, '_blank');
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Preview Modal ─────────────────────────────────────────────── */}
            {previewShot && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewShot(null)}
                >
                    <div
                        className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div>
                                <p className="text-xs text-slate-500">Shot {previewShot.scene_number}</p>
                                <h3 className="text-white font-bold text-lg">{previewShot.title}</h3>
                            </div>
                            <button
                                onClick={() => setPreviewShot(null)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>

                        {/* Image */}
                        <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/40 min-h-0">
                            <img
                                src={previewShot.image_url!}
                                alt={previewShot.title}
                                className="max-w-full max-h-[60vh] object-contain"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
                            <p className="text-slate-400 text-sm line-clamp-1">{previewShot.description}</p>
                            <div className="flex gap-3 shrink-0">
                                {/* Neu generieren */}
                                <button
                                    onClick={() => {
                                        onGenerateShotImage(previewShot);
                                        setPreviewShot(null);
                                    }}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                                >
                                    <span className="material-icons-round text-sm">refresh</span>
                                    Neu generieren
                                </button>
                                {/* Download */}
                                <button
                                    onClick={() => handleDownload(previewShot)}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                                >
                                    <span className="material-icons-round text-sm">download</span>
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                {/* Shot Image & Video */}
                                <div className="md:col-span-1 space-y-4">
                                    <div className="aspect-video bg-slate-900/50 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {shot.image_url ? (
                                            <>
                                                {/* Click → open preview modal */}
                                                <img
                                                    src={shot.image_url}
                                                    alt={shot.title}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    onClick={() => setPreviewShot(shot)}
                                                />
                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setPreviewShot(shot)}
                                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition-all flex items-center gap-1"
                                                    >
                                                        <span className="material-icons-round text-xs">fullscreen</span>
                                                        Vorschau
                                                    </button>
                                                    <button
                                                        onClick={() => onGenerateShotImage(shot)}
                                                        disabled={isGenerating}
                                                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <span className={`material-icons-round text-xs ${isGenerating ? 'animate-spin' : ''}`}>refresh</span>
                                                        {isGenerating ? 'Generiere...' : 'Neu'}
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

                                    {/* Shot Video */}
                                    {shot.video_url && (
                                        <div className="aspect-video bg-slate-900/50 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                                            <video 
                                                src={shot.video_url} 
                                                controls 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

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

                                    {/* Dialog */}
                                    {shot.dialog && (
                                        <div className="bg-slate-900/60 border border-white/5 rounded-lg px-4 py-3">
                                            <div className="flex items-center gap-1 mb-2">
                                                <span className="material-icons-round text-xs text-primary">record_voice_over</span>
                                                <span className="text-xs text-slate-500 font-medium">Dialog</span>
                                            </div>
                                            {shot.dialog.split('\n').map((line, i) => (
                                                <p key={i} className="text-sm text-slate-200 font-mono">{line}</p>
                                            ))}
                                        </div>
                                    )}

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
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <select
                                            value={shot.ai_model || 'GEMINI'}
                                            onChange={(e) => onUpdateShot({ ...shot, ai_model: e.target.value as 'GEMINI' | 'FAL_QWEN' })}
                                            className="px-2 py-1.5 bg-slate-800 border border-white/10 rounded text-xs text-white outline-none"
                                            title="AI Modell für Bildgenerierung"
                                        >
                                            <option value="GEMINI">Google Gemini</option>
                                            <option value="FAL_QWEN">Fal.ai (Qwen)</option>
                                        </select>
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
                                                    Bild...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons-round text-xs">{shot.image_url ? 'refresh' : 'image'}</span>
                                                    {shot.image_url ? 'Bild neu' : 'Bild gen.'}
                                                </>
                                            )}
                                        </button>
                                        {shot.image_url && (
                                            <button
                                                onClick={() => onGenerateShotVideo(shot)}
                                                disabled={isGenerating}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded transition-all flex items-center gap-1"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <span className="material-icons-round text-xs animate-spin">refresh</span>
                                                        Video...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-icons-round text-xs">{shot.video_url ? 'refresh' : 'movie'}</span>
                                                        {shot.video_url ? 'Video neu' : 'Video (i2v)'}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {shot.image_url && (
                                            <button
                                                onClick={() => handleDownload(shot)}
                                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-all flex items-center gap-1"
                                                title="Bild herunterladen"
                                            >
                                                <span className="material-icons-round text-xs">download</span>
                                                Bild
                                            </button>
                                        )}
                                        {shot.video_url && (
                                            <button
                                                onClick={() => handleVideoDownload(shot)}
                                                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-all flex items-center gap-1"
                                                title="Video herunterladen"
                                            >
                                                <span className="material-icons-round text-xs">download</span>
                                                Video
                                            </button>
                                        )}
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
