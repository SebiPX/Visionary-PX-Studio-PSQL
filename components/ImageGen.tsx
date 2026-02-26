import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile, normalizeStorageUrl, downloadAsset, geminiProxy } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedImage } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface ImageGenProps {
    selectedItemId?: string | null;
    onItemLoaded?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ImageGen: React.FC<ImageGenProps> = ({ selectedItemId, onItemLoaded }) => {
    // ========================================================================
    // STATE & REFS
    // ========================================================================

    // Database hooks
    const { saveImage, loadHistory, loading } = useGeneratedContent();

    // Generation state
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentImage, setCurrentImage] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuBCq-OX_ftzyJeveBb5umMg9V7eJxPvIg3MSmcvx0tb1K7k_EPMGVNzdrqsElA3mV6tPwcrS9qmja8QRML_JEbjsXFKeR7fcRzyH_4onr7EpCgV1z1FKsEav4HOPoRSU37uLJbk4AocKgiln-4odJ6qYwLaQI4NDOAdqA9Afs0pIa11mp--glasl1uvFPgCmAroVdEPW9Zrt5gPwT_ZD6XWZbX193F9278i-0UsB1leuDZz0iZhdm-rwtSL-AsDsBrHhHZj9tAFtTxC');

    // Mode and settings
    const [activeMode, setActiveMode] = useState<'TEXT' | 'IMG2IMG' | 'EDIT'>('TEXT');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');

    // History
    const [history, setHistory] = useState<GeneratedImage[]>([]);

    // Upload state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI state
    const [showPreview, setShowPreview] = useState(false);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const loadImageHistory = useCallback(async () => {
        const result = await loadHistory('image', 20);
        if (result.success && result.data) {
            setHistory(result.data as GeneratedImage[]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only load once on mount

    const restoreFromHistory = (item: GeneratedImage) => {
        setCurrentImage(item.image_url);
        setPrompt(item.prompt || '');
    };

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Load history from database on mount only
    useEffect(() => {
        loadImageHistory();
    }, [loadImageHistory]);

    // Auto-restore selected item from Dashboard
    useEffect(() => {
        if (selectedItemId && history.length > 0) {
            const selectedItem = history.find(item => item.id === selectedItemId);
            if (selectedItem) {
                restoreFromHistory(selectedItem);
                onItemLoaded?.();
            }
        }
    }, [selectedItemId, history]);

    const handleGenerate = async () => {
        try {
            // Prepare contents
            const parts: any[] = [];

            // If Img2Img or Edit, add the uploaded image first
            if (activeMode !== 'TEXT' && uploadedImage) {
                const base64Data = uploadedImage.split(',')[1];
                parts.push({
                    inlineData: {
                        mimeType: 'image/png', // Simplified assumption
                        data: base64Data
                    }
                });
            }

            // Add Text Prompt
            parts.push({ text: prompt });

            // Using gemini-2.5-flash-image for standard generations
            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts: parts }],
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                    }
                }
            }) as any;

            if (response?.error) {
                console.error("Gemini API Error:", response.error);
                throw new Error(JSON.stringify(response.error));
            }

            // Parse response to find image part
            const respParts = response.candidates?.[0]?.content?.parts;
            if (respParts) {
                for (const part of respParts) {
                    if (part.inlineData) {
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        const ext = mimeType.split('/')[1] || 'png';

                        // Convert base64 → Blob → upload to Cloudflare R2
                        const dataUri = `data:${mimeType};base64,${part.inlineData.data}`;
                        const imageBlob = await (await fetch(dataUri)).blob();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                        const imageFile = new File([imageBlob], fileName, { type: mimeType });
                        const publicUrl = await uploadFile(imageFile, 'images');

                        setCurrentImage(publicUrl);
                        await saveImage({
                            prompt: prompt,
                            style: activeMode,
                            image_url: publicUrl,
                            config: { aspectRatio, mode: activeMode }
                        });
                        await loadImageHistory();
                        break;
                    }
                }
            }

        } catch (e) {
            console.error("Image generation failed", e);
            alert("Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        downloadAsset(currentImage, `generated-image-${Date.now()}.png`);
    };

    const handlePreview = () => {
        setShowPreview(true);
    };

    const getAspectClass = () => {
        switch (aspectRatio) {
            case '1:1': return 'aspect-square max-w-[500px]';
            case '9:16': return 'aspect-[9/16] max-w-[350px]';
            case '16:9': default: return 'aspect-video max-w-5xl';
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#080c14] relative overflow-hidden">
            {/* Sidebar Controls - Widened to match VideoStudio */}
            <aside className="w-full md:w-80 bg-glass z-20 flex flex-col border-b md:border-b-0 md:border-r border-white/5 order-2 md:order-1 flex-shrink-0 h-full">

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8">
                    {/* Mode Switcher */}
                    <div className="w-full space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Generation Mode</h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => { setActiveMode('TEXT'); setUploadedImage(null); }}
                                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${activeMode === 'TEXT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className="material-icons-round text-lg">description</span>
                                Text to Image
                            </button>
                            <button
                                onClick={() => setActiveMode('IMG2IMG')}
                                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${activeMode === 'IMG2IMG' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className="material-icons-round text-lg">add_photo_alternate</span>
                                Image to Image
                            </button>
                            <button
                                onClick={() => setActiveMode('EDIT')}
                                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${activeMode === 'EDIT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className="material-icons-round text-lg">brush</span>
                                Image Edit / Inpaint
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/10"></div>

                    {/* Settings Group */}
                    <div className="w-full space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Aspect Ratio</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setAspectRatio('1:1')}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${aspectRatio === '1:1' ? 'bg-primary border border-primary/50 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round">crop_square</span>
                                    <span className="text-[9px]">1:1</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('16:9')}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${aspectRatio === '16:9' ? 'bg-primary border border-primary/50 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round">crop_16_9</span>
                                    <span className="text-[9px]">16:9</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('9:16')}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${aspectRatio === '9:16' ? 'bg-primary border border-primary/50 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round">crop_portrait</span>
                                    <span className="text-[9px]">9:16</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="w-full pt-4 border-t border-white/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-sm">history</span>
                            Your Images ({history.length})
                        </h3>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : history.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto hide-scrollbar">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => restoreFromHistory(item)}
                                        className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group hover:border-primary/50 transition-all"
                                        title={item.prompt || 'Generated image'}
                                    >
                                        <img src={item.image_url} alt="History" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-icons-round text-white text-sm">restore</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[9px] text-white/80 truncate">{item.prompt}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <span className="material-icons-round text-3xl text-slate-700 mb-2">image</span>
                                <p className="text-xs text-slate-500">No images yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Area Wrapper */}
            <div className="flex-1 relative flex flex-col order-1 md:order-2 h-full min-w-0">

                {/* Fixed Header Overlay */}
                <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none">
                    <div className="pointer-events-auto flex gap-3">
                        <div className="px-4 py-2 glass rounded-full flex items-center gap-2 border border-white/10 shadow-lg backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs font-medium text-slate-200 uppercase tracking-wider">
                                {activeMode === 'TEXT' ? 'Gemini 2.5 Flash Image' : activeMode === 'IMG2IMG' ? 'Img2Img Mode' : 'Inpainting'}
                            </span>
                        </div>
                        <div className="hidden md:flex px-4 py-2 glass rounded-full items-center gap-2 border border-white/10 shadow-lg backdrop-blur-md">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ratio: {aspectRatio}</span>
                        </div>
                    </div>
                    <div className="pointer-events-auto flex gap-3">
                        <button className="px-5 py-2 bg-primary rounded-full text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
                            Export
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">

                    {/* Canvas Area */}
                    <div className="flex-1 flex items-center justify-center p-4 md:p-12 pt-20 relative min-h-[500px] shrink-0">
                        <div className={`relative w-full ${getAspectClass()} transition-all duration-500 rounded-2xl overflow-hidden shadow-2xl shadow-black border border-white/5 bg-[#101622] group`}>
                            {isGenerating && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-primary font-bold tracking-widest animate-pulse">GENERATING...</p>
                                </div>
                            )}

                            <img
                                src={currentImage}
                                alt="Generated output"
                                className={`w-full h-full object-cover transition-opacity duration-1000 ${isGenerating ? 'opacity-50' : 'opacity-100'}`}
                            />

                            {/* Controls Overlay */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={handlePreview}
                                    className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Fullscreen Preview"
                                >
                                    <span className="material-icons-round">fullscreen</span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Download Image"
                                >
                                    <span className="material-icons-round">download</span>
                                </button>
                            </div>

                            {/* Loading Bar */}
                            {isGenerating && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                    <div className="h-full bg-primary w-full shadow-[0_0_15px_#135bec] animate-[loading_2s_ease-in-out_infinite]"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Input Area */}
                    <div className="p-4 md:p-6 lg:px-12 pb-8 z-30 shrink-0 bg-gradient-to-t from-[#080c14] to-transparent">
                        <div className="max-w-4xl mx-auto">

                            {/* Source Image Upload Area - Visible only in Img2Img or Edit mode */}
                            {activeMode !== 'TEXT' && (
                                <div className="mb-4">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    {!uploadedImage ? (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <span className="material-icons-round text-2xl text-slate-400 group-hover:text-primary">
                                                    {activeMode === 'EDIT' ? 'brush' : 'add_photo_alternate'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300 font-medium">
                                                {activeMode === 'EDIT' ? 'Upload image to edit' : 'Upload reference image'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Drag & drop or click to browse</p>
                                        </div>
                                    ) : (
                                        <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/20">
                                            <img src={uploadedImage} alt="Reference" className="w-full h-32 object-cover opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <button
                                                    onClick={() => setUploadedImage(null)}
                                                    className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold backdrop-blur flex items-center gap-2"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span> Remove
                                                </button>
                                            </div>
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white font-bold uppercase">
                                                Reference Image
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Style Pills (Only text mode usually needs these prominent, but keeping for all for quick styling) */}
                            {activeMode === 'TEXT' && (
                                <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2">
                                    {['Cinematic', '3D Render', 'Anime', 'Cyberpunk', 'Oil Painting'].map((style, i) => (
                                        <button key={style} onClick={() => setPrompt(prev => prev + `, ${style} style`)} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${i === 0 ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Bar */}
                            <div className="relative flex items-end gap-2 bg-[#1a1f2e] border border-white/10 rounded-2xl p-2 pl-4 shadow-xl">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-500 py-3 resize-none max-h-32"
                                    placeholder={
                                        activeMode === 'TEXT' ? "Describe a futuristic city with neon lights..." :
                                            activeMode === 'IMG2IMG' ? "Describe how to transform the reference image..." :
                                                "Describe what to edit in the image (e.g., remove the car, add a hat)..."
                                    }
                                    rows={1}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || (activeMode === 'TEXT' && !prompt)}
                                    className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 flex-shrink-0 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    <span className="material-icons-round">{isGenerating ? 'hourglass_empty' : 'send'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Fullscreen Preview Modal */}
            {showPreview && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setShowPreview(false)}
                >
                    <button
                        onClick={() => setShowPreview(false)}
                        className="absolute top-4 right-4 p-3 glass rounded-lg text-white hover:bg-white/10 transition-colors z-10"
                        title="Close Preview"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className="absolute top-4 right-20 p-3 glass rounded-lg text-white hover:bg-white/10 transition-colors z-10"
                        title="Download Image"
                    >
                        <span className="material-icons-round">download</span>
                    </button>
                    <img
                        src={currentImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};