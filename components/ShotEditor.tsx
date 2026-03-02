import React, { useState } from 'react';
import { StoryShot, StoryAsset } from '../types';

interface ShotEditorProps {
    shot: StoryShot;
    actors: StoryAsset[];
    environment: StoryAsset | null;
    products: StoryAsset[];
    onSave: (shot: StoryShot) => void;
    onClose: () => void;
}

export const ShotEditor: React.FC<ShotEditorProps> = ({
    shot,
    actors,
    environment,
    products,
    onSave,
    onClose,
}) => {
    const [editedShot, setEditedShot] = useState<StoryShot>(shot);

    const handleSave = () => {
        onSave(editedShot);
        onClose();
    };

    const updateField = (field: keyof StoryShot, value: any) => {
        setEditedShot({ ...editedShot, [field]: value });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Edit Shot</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basis-Informationen */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">info</span>
                            Basis-Informationen
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Szene & Shot-Nummer</label>
                                <input
                                    type="text"
                                    value={editedShot.scene_number}
                                    onChange={(e) => updateField('scene_number', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="z.B. 4A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={editedShot.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="Innen/Außen, spezifischer Ort"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-2">Titel</label>
                                <input
                                    type="text"
                                    value={editedShot.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="Kurzbeschreibung"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-2">Beschreibung</label>
                                <textarea
                                    value={editedShot.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                                    rows={3}
                                    placeholder="Was passiert in diesem Moment?"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Dialog */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">record_voice_over</span>
                            Dialog / Gesprochener Text
                        </h3>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Format: <span className="text-white font-mono text-xs">ACTORNAME: Text</span>
                            </label>
                            <textarea
                                value={editedShot.dialog || ''}
                                onChange={(e) => updateField('dialog', e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white resize-none font-mono text-sm"
                                rows={4}
                                placeholder={"ACTOR1: Hallo, mein Freund! Wie geht's?\nACTOR2: Was geht dich das an?"}
                            />
                            <p className="text-xs text-slate-500 mt-1">Eine Zeile pro Sprechakt. Leer lassen wenn kein Dialog.</p>
                        </div>
                    </section>

                    {/* Visuelle Gestaltung */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">videocam</span>
                            Visuelle Gestaltung (Kamera & Bild)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Einstellungsgröße (Framing)</label>
                                <select
                                    value={editedShot.framing}
                                    onChange={(e) => updateField('framing', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="extreme-wide-shot">Extreme Wide Shot</option>
                                    <option value="wide-shot">Wide Shot / Totale</option>
                                    <option value="medium-shot">Medium Shot</option>
                                    <option value="close-up">Close-up</option>
                                    <option value="extreme-close-up">Extreme Close-up</option>
                                    <option value="establishing">Establishing Shot</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Kameraperspektive</label>
                                <select
                                    value={editedShot.camera_angle}
                                    onChange={(e) => updateField('camera_angle', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="eye-level">Augenhöhe (Eye-Level)</option>
                                    <option value="high-angle">Vogelperspektive (High Angle)</option>
                                    <option value="low-angle">Froschperspektive (Low Angle)</option>
                                    <option value="birds-eye">Bird's Eye View</option>
                                    <option value="dutch-angle">Dutch Angle</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Kamerabewegung</label>
                                <select
                                    value={editedShot.camera_movement}
                                    onChange={(e) => updateField('camera_movement', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="static">Statisch (Stativ)</option>
                                    <option value="pan">Pan (Schwenk)</option>
                                    <option value="tilt">Tilt (Neigen)</option>
                                    <option value="dolly">Dolly (Kamerafahrt)</option>
                                    <option value="zoom">Zoom</option>
                                    <option value="handheld">Handheld</option>
                                    <option value="gimbal">Gimbal</option>
                                    <option value="crane">Kran</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Objektiv/Brennweite</label>
                                <input
                                    type="text"
                                    value={editedShot.focal_length}
                                    onChange={(e) => updateField('focal_length', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="z.B. 24mm, 50mm, 85mm"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Technische & Logistische Details */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">settings</span>
                            Technische & Logistische Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Lichtstimmung</label>
                                <select
                                    value={editedShot.lighting}
                                    onChange={(e) => updateField('lighting', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="day">Tag</option>
                                    <option value="night">Nacht</option>
                                    <option value="natural">Natürliches Licht</option>
                                    <option value="artificial">Kunstlicht</option>
                                    <option value="mixed">Gemischt</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Voraussichtliche Dauer (Minuten)</label>
                                <input
                                    type="number"
                                    value={editedShot.estimated_duration}
                                    onChange={(e) => updateField('estimated_duration', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    min="0"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-2">Equipment</label>
                                <input
                                    type="text"
                                    value={editedShot.equipment}
                                    onChange={(e) => updateField('equipment', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="Gimbal, Kran, Filter, etc."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-2">Audio-Notizen</label>
                                <input
                                    type="text"
                                    value={editedShot.audio_notes}
                                    onChange={(e) => updateField('audio_notes', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="Dialog, MOS (Motor Only Shot), etc."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Storyboard-spezifisch */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">draw</span>
                            Storyboard-spezifisch
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Bewegungsnotizen</label>
                                <textarea
                                    value={editedShot.movement_notes}
                                    onChange={(e) => updateField('movement_notes', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                                    rows={2}
                                    placeholder="Pfeile für Bewegung (Kamera oder Schauspieler)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">VFX-Notizen</label>
                                <textarea
                                    value={editedShot.vfx_notes}
                                    onChange={(e) => updateField('vfx_notes', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                                    rows={2}
                                    placeholder="Green Screen, digitale Effekte, etc."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Shot-Dauer */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">schedule</span>
                            Shot-Dauer
                        </h3>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Dauer (Sekunden)</label>
                            <input
                                type="number"
                                value={editedShot.duration}
                                onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                                min="0"
                            />
                        </div>
                    </section>

                    {/* Zusätzliche Notizen */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-primary">note</span>
                            Zusätzliche Notizen
                        </h3>
                        <textarea
                            value={editedShot.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                            rows={3}
                            placeholder="Weitere Anmerkungen..."
                        />
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                        <span className="material-icons-round text-sm">save</span>
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
};
