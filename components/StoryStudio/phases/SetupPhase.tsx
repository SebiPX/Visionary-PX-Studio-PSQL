import React from 'react';
import { StoryAsset } from '../../../types';
import { AssetCard } from '../../AssetCard';

interface SetupPhaseProps {
    actors: StoryAsset[];
    environment: StoryAsset | null;
    product: StoryAsset | null;
    onUpdateActor: (index: number, actor: StoryAsset) => void;
    onUpdateEnvironment: (env: StoryAsset) => void;
    onUpdateProduct: (prod: StoryAsset) => void;
    onAssetUpload: (file: File, assetId: string) => void;
    onAssetGenerate: (asset: StoryAsset) => void;
    uploadingAssetId: string | null;
    generatingAssetId: string | null;
    onNext: () => void;
}

export const SetupPhase: React.FC<SetupPhaseProps> = ({
    actors,
    environment,
    product,
    onUpdateActor,
    onUpdateEnvironment,
    onUpdateProduct,
    onAssetUpload,
    onAssetGenerate,
    uploadingAssetId,
    generatingAssetId,
    onNext,
}) => {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Actors ({actors.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {actors.map((actor, index) => (
                        <AssetCard
                            key={actor.id}
                            asset={actor}
                            onUpdate={(updatedActor) => onUpdateActor(index, updatedActor)}
                            onUpload={onAssetUpload}
                            onGenerate={onAssetGenerate}
                            isUploading={uploadingAssetId === actor.id}
                            isGenerating={generatingAssetId === actor.id}
                        />
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4">Environment</h3>
                {environment && (
                    <div className="max-w-md">
                        <AssetCard
                            asset={environment}
                            onUpdate={onUpdateEnvironment}
                            onUpload={onAssetUpload}
                            onGenerate={onAssetGenerate}
                            isUploading={uploadingAssetId === environment.id}
                            isGenerating={generatingAssetId === environment.id}
                        />
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4">Product</h3>
                {product && (
                    <div className="max-w-md">
                        <AssetCard
                            asset={product}
                            onUpdate={onUpdateProduct}
                            onUpload={onAssetUpload}
                            onGenerate={onAssetGenerate}
                            isUploading={uploadingAssetId === product.id}
                            isGenerating={generatingAssetId === product.id}
                        />
                    </div>
                )}
            </div>

            <button
                onClick={onNext}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all"
            >
                Continue to Story →
            </button>
        </div>
    );
};
