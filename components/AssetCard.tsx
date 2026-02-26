import React, { useRef } from 'react';
import { StoryAsset } from '../types';

interface AssetCardProps {
    asset: StoryAsset;
    onUpdate: (asset: StoryAsset) => void;
    onUpload: (file: File, assetId: string) => Promise<void>;
    onGenerate: (asset: StoryAsset) => Promise<void>;
    isUploading?: boolean;
    isGenerating?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({
    asset,
    onUpdate,
    onUpload,
    onGenerate,
    isUploading = false,
    isGenerating = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await onUpload(file, asset.id);
        }
    };

    return (
        <div className="bg-slate-800/40 border border-white/10 rounded-xl p-4">
            {/* Image Preview */}
            {asset.image_url && (
                <div className="mb-3 aspect-square rounded-lg overflow-hidden border border-white/10">
                    <img
                        src={asset.image_url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Name Input */}
            <input
                type="text"
                value={asset.name}
                onChange={(e) => onUpdate({ ...asset, name: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white mb-2"
                placeholder={`${asset.type === 'actor' ? 'Actor' : asset.type === 'environment' ? 'Environment' : 'Product'} name`}
            />

            {/* Description Input */}
            <textarea
                value={asset.description}
                onChange={(e) => onUpdate({ ...asset, description: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none mb-3"
                rows={2}
                placeholder="Description"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
                {/* Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isGenerating}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded transition-all flex items-center justify-center gap-1"
                >
                    {isUploading ? (
                        <>
                            <span className="material-icons-round text-xs animate-spin">refresh</span>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <span className="material-icons-round text-xs">upload</span>
                            Upload
                        </>
                    )}
                </button>

                {/* AI Generate Button */}
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
                            AI
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
            {asset.image_url && (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-icons-round text-xs">
                        {asset.source === 'ai-generated' ? 'auto_awesome' : 'upload'}
                    </span>
                    {asset.source === 'ai-generated' ? 'KI-generiert' : 'Hochgeladen'}
                </div>
            )}
        </div>
    );
};
