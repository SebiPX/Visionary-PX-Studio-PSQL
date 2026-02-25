import { useState } from 'react';
import { uploadFile } from '../lib/apiClient';
import { StoryAsset } from '../lib/database.types';

interface UseAssetManagerProps {
    userId: string | undefined;
    sessionId: string | null;
}

export const useAssetManager = ({ userId, sessionId }: UseAssetManagerProps) => {
    const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
    const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const uploadAssetImage = async (file: File, assetId: string): Promise<string | null> => {
        if (!userId) return null;
        setUploadingAssetId(assetId);
        try {
            console.log('Uploading file to R2, assetId:', assetId);
            const url = await uploadFile(file, 'storyboard-assets');
            console.log('Upload successful! URL:', url);
            return url;
        } catch (err) {
            console.error('Upload error:', err);
            setError(`Fehler beim Hochladen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        } finally {
            setUploadingAssetId(null);
        }
    };

    const handleAssetUpload = async (
        file: File,
        assetId: string,
        updateCallback: (assetId: string, updates: Partial<StoryAsset>) => void
    ) => {
        console.log('handleAssetUpload called for asset:', assetId);
        const imageUrl = await uploadAssetImage(file, assetId);
        if (imageUrl) {
            updateCallback(assetId, { image_url: imageUrl, source: 'upload' });
        }
    };

    const handleAssetGenerate = async (
        asset: StoryAsset,
        generateCallback: (asset: StoryAsset, uploadCallback: (file: File, assetId: string) => Promise<string | null>) => Promise<string | null>,
        updateCallback: (assetId: string, updates: Partial<StoryAsset>) => void
    ) => {
        setGeneratingAssetId(asset.id);
        const imageUrl = await generateCallback(asset, uploadAssetImage);
        setGeneratingAssetId(null);
        if (imageUrl) {
            updateCallback(asset.id, { image_url: imageUrl, source: 'ai-generated' });
        }
    };

    return {
        uploadAssetImage,
        handleAssetUpload,
        handleAssetGenerate,
        uploadingAssetId,
        generatingAssetId,
        error,
        setError,
    };
};
