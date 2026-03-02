import React, { useRef } from 'react';
import { StoryAsset } from '../types';

interface AssetCardProps {
    asset: StoryAsset;
    onUpdate: (asset: StoryAsset) => void;
    onUpload: (file: File, assetId: string) => Promise<void>;
    onGenerate: (asset: StoryAsset) => Promise<void>;
    onPreview?: (url: string) => void;
    isUploading?: boolean;
    isGenerating?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({
    asset,
    onUpdate,
    onUpload,
    onGenerate,
    onPreview,
    isUploading = false,
    isGenerating = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await onUpload(file, asset.id);
            // Reset input so the same file can be re-uploaded
            e.target.value = '';
        }
    };

    const handleDownload = async (url: string, name: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-asset.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(url, '_blank');
        }
    };

    const isActor = asset.type === 'actor';
    const hasGenerated = !!asset.image_url;
    const hasRef = !!asset.ref_image_url;

    const placeholderLabel = asset.type === 'actor' ? 'Actor' : asset.type === 'environment' ? 'Environment' : 'Product';

    return (
        <div className="bg-slate-800/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3">

            {/* ── Generated Image Preview ── */}
            {hasGenerated ? (
                <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-slate-900/50"
                    style={{ aspectRatio: asset.type === 'environment' ? '16/9' : '4/3' }}>
                    <img
                        src={asset.image_url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Overlay actions on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        {/* Expand / Lightbox */}
                        {onPreview && (
                            <button
                                onClick={() => onPreview(asset.image_url)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all"
                                title="Großes Vorschau"
                            >
                                <span className="material-icons-round text-sm">open_in_full</span>
                            </button>
                        )}
                        {/* Download */}
                        <button
                            onClick={() => handleDownload(asset.image_url, asset.name || placeholderLabel)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all"
                            title="Herunterladen"
                        >
                            <span className="material-icons-round text-sm">download</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* Empty placeholder */
                <div
                    className="rounded-lg border-2 border-dashed border-white/10 bg-slate-900/30 flex flex-col items-center justify-center text-slate-600 gap-1"
                    style={{ aspectRatio: asset.type === 'environment' ? '16/9' : '4/3' }}
                >
                    <span className="material-icons-round text-3xl">image</span>
                    <span className="text-xs">Kein Bild</span>
                </div>
            )}

            {/* ── Reference image thumb + wardrobe toggle (actors only when ref exists) ── */}
            {hasRef && (
                <div className="flex items-center gap-2">
                    {/* Small ref thumb */}
                    <div className="w-10 h-10 rounded overflow-hidden border border-white/20 flex-shrink-0">
                        <img src={asset.ref_image_url} alt="Referenz" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">Referenzfoto hochgeladen</p>
                        {isActor && (
                            <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!asset.is_character_sheet}
                                    onChange={(e) => onUpdate({ ...asset, is_character_sheet: e.target.checked })}
                                    className="w-3 h-3 accent-primary"
                                />
                                <span className="text-xs text-slate-400">Ist bereits ein Character Sheet</span>
                            </label>
                        )}
                    </div>
                    {/* Replace ref button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isGenerating}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-all disabled:opacity-40"
                        title="Referenzfoto ersetzen"
                    >
                        <span className="material-icons-round text-xs">photo_camera</span>
                    </button>
                </div>
            )}

            {/* ── Name Input ── */}
            <input
                type="text"
                value={asset.name}
                onChange={(e) => onUpdate({ ...asset, name: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder={`${placeholderLabel} name`}
            />

            {/* ── Description ── */}
            <textarea
                value={asset.description}
                onChange={(e) => onUpdate({ ...asset, description: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
                rows={2}
                placeholder={
                    asset.is_character_sheet
                        ? 'Neue Kleidung / Outfit beschreiben...'
                        : asset.type === 'actor'
                        ? 'Beschreibung: Aussehen, Kostüm, Stil...'
                        : 'Beschreibung'
                }
            />

            {/* ── Action Buttons ── */}
            <div className="flex gap-2">
                {/* Upload / Replace button — only show if no ref yet */}
                {!hasRef && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isGenerating}
                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded transition-all flex items-center justify-center gap-1"
                    >
                        {isUploading ? (
                            <>
                                <span className="material-icons-round text-xs animate-spin">refresh</span>
                                Lädt hoch...
                            </>
                        ) : (
                            <>
                                <span className="material-icons-round text-xs">upload</span>
                                Referenz hochladen
                            </>
                        )}
                    </button>
                )}

                {/* AI Generate / Regenerate */}
                <button
                    onClick={() => onGenerate(asset)}
                    disabled={isUploading || isGenerating || !asset.description}
                    className="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded transition-all flex items-center justify-center gap-1"
                    title={!asset.description ? 'Bitte erst eine Beschreibung eingeben' : ''}
                >
                    {isGenerating ? (
                        <>
                            <span className="material-icons-round text-xs animate-spin">refresh</span>
                            Generiere...
                        </>
                    ) : (
                        <>
                            <span className="material-icons-round text-xs">auto_awesome</span>
                            {hasGenerated ? 'Neu generieren' : 'KI generieren'}
                        </>
                    )}
                </button>
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Source Badge */}
            {hasGenerated && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-icons-round text-xs">
                        {asset.source === 'ai-generated' ? 'auto_awesome' : 'upload'}
                    </span>
                    {asset.source === 'ai-generated' ? 'KI-generiert' : 'Hochgeladen'}
                    {asset.is_character_sheet && (
                        <span className="ml-2 text-primary/70">· Garderoben-Modus</span>
                    )}
                </div>
            )}
        </div>
    );
};
