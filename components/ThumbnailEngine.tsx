import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile, normalizeStorageUrl, downloadAsset, geminiProxy } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedThumbnail } from '../types';
import { BackgroundTool } from './ThumbnailEngine/components/BackgroundTool';
import { ElementsTool } from './ThumbnailEngine/components/ElementsTool';
import { TextTool } from './ThumbnailEngine/components/TextTool';
import { ImageSourcePicker } from './ImageSourcePicker';

interface HistoryItem {
    id: string;
    url: string;
    topic: string;
    bgPrompt: string;
    elementPrompt: string;
    text: string;
    timestamp: Date;
}

interface ThumbnailEngineProps {
    selectedItemId?: string | null;
    onItemLoaded?: () => void;
}

export const ThumbnailEngine: React.FC<ThumbnailEngineProps> = ({ selectedItemId, onItemLoaded }) => {
    const { saveThumbnail, loadHistory } = useGeneratedContent();
    const [activeTool, setActiveTool] = useState<'BACKGROUND' | 'ELEMENTS' | 'TEXT'>('BACKGROUND');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Composition State
    const [videoTopic, setVideoTopic] = useState('');
    const [bgPrompt, setBgPrompt] = useState('');
    const [bgImage, setBgImage] = useState<string | null>(null); // Base64

    const [elementPrompt, setElementPrompt] = useState('');
    const [elementImage, setElementImage] = useState<string | null>(null); // Base64

    const [textContent, setTextContent] = useState('');
    const [textStyle, setTextStyle] = useState('Bold & Modern');

    const [history, setHistory] = useState<GeneratedThumbnail[]>([]);

    // Specific loading states for idea generation buttons
    const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showBgPicker, setShowBgPicker] = useState(false);
    const [showElPicker, setShowElPicker] = useState(false);

    // Refs for file inputs
    const bgFileInputRef = useRef<HTMLInputElement>(null);
    const elementFileInputRef = useRef<HTMLInputElement>(null);

    // Load thumbnail history from database
    const loadThumbnailHistory = useCallback(async () => {
        const result = await loadHistory('thumbnail', 20);
        if (result.success && result.data) {
            setHistory(result.data as GeneratedThumbnail[]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only load once on mount

    useEffect(() => {
        loadThumbnailHistory();
    }, [loadThumbnailHistory]);

    // Helper: Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'BACKGROUND' | 'ELEMENT') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (type === 'BACKGROUND') setBgImage(base64String);
                else setElementImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const addToHistory = async (url: string) => {
        // Save to database
        await saveThumbnail({
            prompt: videoTopic || 'Untitled Thumbnail',
            platform: 'YouTube',
            image_url: url,
            config: {
                aspectRatio,
                background: bgPrompt,
                mainElement: elementPrompt,
                textOverlay: textContent,
                textStyle,
            },
        });

        // Reload history
        loadThumbnailHistory();
    };

    const restoreFromHistory = (item: GeneratedThumbnail) => {
        setGeneratedImage(item.image_url);
        setVideoTopic(item.prompt || '');
        setBgPrompt(item.config?.background || '');
        setElementPrompt(item.config?.mainElement || '');
        setTextContent(item.config?.textOverlay || '');
        setTextStyle(item.config?.textStyle || 'Bold & Modern');
        // Restore the aspect ratio that was used when this thumbnail was generated
        if (item.config?.aspectRatio) {
            setAspectRatio(item.config.aspectRatio as '16:9' | '9:16' | '1:1');
        }
    };

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

    const handleDownload = () => {
        if (!generatedImage) return;
        downloadAsset(generatedImage, `thumbnail-${Date.now()}.png`);
    };

    const handlePreview = () => {
        if (generatedImage) {
            setShowPreview(true);
        }
    };

    // Helper to generate text ideas using Gemini Text Model
    const generateTextIdea = async () => {
        if (!process.env.API_KEY) return alert("API Key missing");
        if (!videoTopic) return alert("Please enter a Video Topic in the 'Content Context' field above first.");

        setIsGeneratingIdea(true);
        try {
            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: `Write a very short, catchy, 2-3 word thumbnail text overlay for a video about: "${videoTopic}". RETURN ONLY THE TEXT. No quotes.` }] }]
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            const textResult = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (textResult) {
                setTextContent(textResult.trim());
            }
        } catch (e) {
            console.error(e);
            alert("Could not generate text idea.");
        } finally {
            setIsGeneratingIdea(false);
        }
    };

    // Helper to generate image description ideas
    const generateVisualIdea = async (type: 'BACKGROUND' | 'ELEMENT') => {
        if (!process.env.API_KEY) return alert("API Key missing");
        if (!videoTopic) return alert("Please enter a Video Topic in the 'Content Context' field above first.");

        setIsGeneratingIdea(true);
        try {
            const promptText = type === 'BACKGROUND'
                ? `Describe a visually striking background for a youtube thumbnail about: "${videoTopic}". Keep it concise, visual, and descriptive (no text description).`
                : `Describe a main subject/character/element for a youtube thumbnail about: "${videoTopic}". Keep it concise (no text description).`;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: promptText }] }]
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }
            const visualResult = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (visualResult) {
                if (type === 'BACKGROUND') setBgPrompt(visualResult.trim());
                else setElementPrompt(visualResult.trim());
            }
        } catch (e) {
            console.error(e);
            alert("Could not generate visual idea.");
        } finally {
            setIsGeneratingIdea(false);
        }
    };

    // Main Generation Function
    const handleFinalGeneration = async () => {
        if (!process.env.API_KEY) return alert("API Key missing");
        if (!bgPrompt && !elementPrompt && !bgImage && !elementImage) return alert("Please define content (text or image) for background or elements.");

        setIsGenerating(true);
        setGeneratedImage(null);

        try {

            // Construct a composite prompt
            let finalPrompt = `Create a high-quality, professional YouTube thumbnail. Aspect Ratio ${aspectRatio}.`;

            if (bgPrompt) finalPrompt += `\nBackground Context: ${bgPrompt}.`;
            if (bgImage) finalPrompt += `\n(Use the first provided image as a visual reference/style for the background).`;

            if (elementPrompt) finalPrompt += `\nForeground Element/Subject Context: ${elementPrompt}.`;
            if (elementImage) finalPrompt += `\n(Use the second provided image as the main subject/element).`;

            if (textContent) {
                finalPrompt += `\nText Overlay: The image MUST include the text "${textContent}" clearly written in a ${textStyle} font style. The text should be legible, high-contrast, and integrated into the composition.`;
            }

            // Build parts array (Images + Text)
            const parts: any[] = [];

            // Add images if they exist. Important: Model treats order as context.
            // We push BG image first, then Element image if they exist.
            if (bgImage) {
                parts.push({
                    inlineData: {
                        mimeType: 'image/png', // Assuming png/jpeg from FileReader, generic mime is okay usually or parse it
                        data: bgImage.split(',')[1]
                    }
                });
            }
            if (elementImage) {
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: elementImage.split(',')[1]
                    }
                });
            }

            // Add text prompt last
            parts.push({ text: finalPrompt });

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts: parts }],
                config: {
                    imageConfig: { aspectRatio: aspectRatio }
                }
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

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
                        const publicUrl = await uploadFile(imageFile, 'thumbnails');

                        setGeneratedImage(publicUrl);
                        addToHistory(publicUrl);
                        break;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            alert("Thumbnail generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const getAspectClass = () => {
        switch (aspectRatio) {
            case '1:1': return 'aspect-square max-w-[500px]';
            case '9:16': return 'aspect-[9/16] max-w-[350px]';
            case '16:9': default: return 'aspect-video max-w-5xl';
        }
    };

    const tools = [
        { id: 'BACKGROUND', icon: 'image', label: 'Background' },
        { id: 'ELEMENTS', icon: 'category', label: 'Elements' },
        { id: 'TEXT', icon: 'title', label: 'Text' },
    ];

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#080c14] overflow-hidden">

            {/* Sidebar Navigation */}
            <aside className="w-20 md:w-24 bg-glass z-20 flex flex-col items-center py-6 gap-6 border-r border-white/5 flex-shrink-0">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as any)}
                        className="flex flex-col items-center gap-2 group w-full px-2"
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeTool === tool.id ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'}`}>
                            <span className="material-icons-round text-xl">{tool.icon}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${activeTool === tool.id ? 'text-white' : 'text-slate-500'}`}>{tool.label}</span>
                    </button>
                ))}
            </aside>

            {/* Control Panel (Dynamic based on selection) */}
            <div className="w-full md:w-80 bg-[#101622] border-r border-white/5 p-6 flex flex-col overflow-y-auto z-10">

                {/* Global Context Input */}
                <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <span className="material-icons-round text-sm text-primary">topic</span>
                        Content Context
                    </label>
                    <input
                        type="text"
                        value={videoTopic}
                        onChange={(e) => setVideoTopic(e.target.value)}
                        placeholder="e.g. Minecraft Survival Ep. 1"
                        className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                    />
                    <p className="text-[9px] text-slate-500 mt-2">Enter your video topic here to power the AI suggestions below.</p>
                </div>

                {/* Dynamic Controls Section */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-primary">
                            {tools.find(t => t.id === activeTool)?.icon}
                        </span>
                        {activeTool === 'BACKGROUND' && 'Compose Background'}
                        {activeTool === 'ELEMENTS' && 'Add Subjects'}
                        {activeTool === 'TEXT' && 'Typography'}
                    </h2>

                    {/* BACKGROUND CONTROLS */}
                    {activeTool === 'BACKGROUND' && (
                        <div className="space-y-6 animate-[float_0.3s_ease-out]">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                <textarea
                                    className="w-full h-32 bg-[#0a0e17] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="e.g., A futuristic cyberpunk city street at night with neon signs and rain..."
                                    value={bgPrompt}
                                    onChange={(e) => setBgPrompt(e.target.value)}
                                />
                                <button
                                    onClick={() => generateVisualIdea('BACKGROUND')}
                                    disabled={isGeneratingIdea}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-icons-round text-sm ${isGeneratingIdea ? 'animate-spin' : ''}`}>{isGeneratingIdea ? 'autorenew' : 'auto_awesome'}</span>
                                    {isGeneratingIdea ? 'Thinking...' : 'Generate Idea from Topic'}
                                </button>
                            </div>

                            {/* Background Upload */}
                            <div>
                                {!bgImage ? (
                                    <div
                                        onClick={() => setShowBgPicker(true)}
                                        className="p-4 rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <span className="material-icons-round text-slate-500 mb-2">upload_file</span>
                                        <p className="text-xs text-slate-300 font-bold">Referenz auswählen</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Upload · Webcam · Eigene Assets</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                                        <img src={bgImage} alt="Bg Ref" className="w-full h-32 object-cover opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
                                            <button onClick={() => setShowBgPicker(true)} className="px-2 py-1 bg-primary/80 hover:bg-primary text-white rounded text-[10px] font-bold">
                                                Ändern
                                            </button>
                                            <span className="text-xs font-bold text-white">BG geladen</span>
                                        </div>
                                        <button
                                            onClick={() => setBgImage(null)}
                                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500"
                                        >
                                            <span className="material-icons-round text-xs">close</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ELEMENTS CONTROLS */}
                    {activeTool === 'ELEMENTS' && (
                        <div className="space-y-6 animate-[float_0.3s_ease-out]">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Main Subject</label>
                                <textarea
                                    className="w-full h-32 bg-[#0a0e17] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="e.g., A surprised young man holding a glowing smartphone looking at the camera..."
                                    value={elementPrompt}
                                    onChange={(e) => setElementPrompt(e.target.value)}
                                />
                                <button
                                    onClick={() => generateVisualIdea('ELEMENT')}
                                    disabled={isGeneratingIdea}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-icons-round text-sm ${isGeneratingIdea ? 'animate-spin' : ''}`}>{isGeneratingIdea ? 'autorenew' : 'auto_awesome'}</span>
                                    {isGeneratingIdea ? 'Thinking...' : 'Generate Idea from Topic'}
                                </button>
                            </div>

                            {/* Element Upload */}
                            <div>
                                {!elementImage ? (
                                    <div
                                        onClick={() => setShowElPicker(true)}
                                        className="p-4 rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <span className="material-icons-round text-slate-500 mb-2">person_add</span>
                                        <p className="text-xs text-slate-300 font-bold">Subject wählen</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Upload · Webcam · Eigene Assets</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                                        <img src={elementImage} alt="El Ref" className="w-full h-32 object-cover opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
                                            <button onClick={() => setShowElPicker(true)} className="px-2 py-1 bg-primary/80 hover:bg-primary text-white rounded text-[10px] font-bold">
                                                Ändern
                                            </button>
                                            <span className="text-xs font-bold text-white">Subject geladen</span>
                                        </div>
                                        <button
                                            onClick={() => setElementImage(null)}
                                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500"
                                        >
                                            <span className="material-icons-round text-xs">close</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TEXT CONTROLS */}
                    {activeTool === 'TEXT' && (
                        <div className="space-y-6 animate-[float_0.3s_ease-out]">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Thumbnail Text</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-primary"
                                    placeholder="e.g., AI IS CRAZY!"
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                />
                                <button
                                    onClick={generateTextIdea}
                                    disabled={isGeneratingIdea}
                                    className="w-full py-2 bg-gradient-to-r from-purple-500/20 to-primary/20 hover:from-purple-500/30 hover:to-primary/30 border border-purple-500/30 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-icons-round text-sm ${isGeneratingIdea ? 'animate-spin' : ''}`}>{isGeneratingIdea ? 'autorenew' : 'psychology'}</span>
                                    {isGeneratingIdea ? 'Writing...' : 'AI Magic Writer'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Font Style</label>
                                <select
                                    value={textStyle}
                                    onChange={(e) => setTextStyle(e.target.value)}
                                    className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:ring-1 focus:ring-primary outline-none appearance-none"
                                >
                                    <option>Bold & Modern</option>
                                    <option>Neon & Glowing</option>
                                    <option>Handwritten / Marker</option>
                                    <option>3D Metallic</option>
                                    <option>Minimalist</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className="w-full pt-6 mt-6 border-t border-white/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-sm">history</span> Recent Thumbnails
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {history.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => restoreFromHistory(item)}
                                    className={`relative overflow-hidden rounded-lg border border-white/10 group hover:border-primary/50 transition-all ${
                                        item.config?.aspectRatio === '9:16' ? 'aspect-[9/16]' :
                                        item.config?.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
                                    }`}
                                >
                                    <img src={item.image_url} alt="History" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="material-icons-round text-white text-sm">restore</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col relative min-w-0">

                {/* Top Bar: Ratio */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0e17]/50 backdrop-blur">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aspect Ratio:</span>
                        <div className="flex bg-white/5 rounded-lg p-1">
                            {['16:9', '9:16', '1:1'].map((ratio) => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio as any)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${aspectRatio === ratio ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleFinalGeneration}
                        disabled={isGenerating}
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-[0_0_20px_rgba(19,91,236,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating ? <span className="material-icons-round animate-spin text-sm">autorenew</span> : <span className="material-icons-round text-sm">stars</span>}
                        GENERATE THUMBNAIL
                    </button>
                </div>

                {/* Canvas Preview */}
                <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                    <div className={`relative w-full ${getAspectClass()} bg-[#0f1219] rounded-xl border border-white/10 shadow-2xl overflow-hidden group transition-all duration-500`}>

                        {generatedImage ? (
                            <>
                                <img src={generatedImage} alt="Generated Thumbnail" className="w-full h-full object-cover" />

                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={handlePreview}
                                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                                        title="Fullscreen Preview"
                                    >
                                        <span className="material-icons-round text-white">fullscreen</span>
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                                        title="Download"
                                    >
                                        <span className="material-icons-round text-white">download</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            // CONCEPT PREVIEW (Visualizes the prompt components)
                            <div className="w-full h-full relative p-8 flex flex-col items-center justify-center text-center">

                                {/* Background Placeholder */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1022] to-[#080c14] -z-10"></div>

                                {(bgPrompt || bgImage) && (
                                    <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                                        <p className="text-white/10 text-4xl font-black uppercase tracking-widest rotate-12 select-none">
                                            {bgImage ? "Image Background" : "Background"}
                                        </p>
                                    </div>
                                )}

                                {/* Elements Placeholder */}
                                <div className="z-10 relative">
                                    {(elementPrompt || elementImage) ? (
                                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 mx-auto animate-pulse overflow-hidden">
                                            {elementImage ? <img src={elementImage} className="w-full h-full object-cover opacity-50" /> : <span className="material-icons-round text-4xl text-slate-500">person</span>}
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-4 mx-auto opacity-50">
                                            <span className="text-[10px] text-slate-500">No Subject</span>
                                        </div>
                                    )}
                                </div>

                                {/* Text Placeholder */}
                                <div className="z-20 relative max-w-full">
                                    {textContent ? (
                                        <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,1)] uppercase leading-tight tracking-tight break-words">
                                            {textContent}
                                        </h1>
                                    ) : (
                                        <h1 className="text-2xl font-bold text-white/20 uppercase tracking-widest border-2 border-dashed border-white/10 px-4 py-2 rounded-lg inline-block">
                                            Text Overlay
                                        </h1>
                                    )}
                                </div>

                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {isGenerating ? "AI IS COMPOSING..." : "COMPOSITION PREVIEW"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Loading Overlay */}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                                <p className="text-primary font-bold tracking-[0.2em] animate-pulse">RENDERING PIXELS</p>
                                <p className="text-slate-500 text-xs mt-2">Merging layers & typography...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prompt Summary Footer */}
                <div className="h-16 bg-[#0a0e17] border-t border-white/5 px-6 flex items-center gap-4 text-xs text-slate-400">
                    <span className="material-icons-round text-sm text-primary">info</span>
                    <p className="truncate flex-1">
                        <span className="font-bold text-slate-300">Prompt Preview: </span>
                        {(bgPrompt || bgImage) ? `BG: [${bgImage ? 'Image' : 'Prompt'}]` : 'BG: N/A'} +
                        {(elementPrompt || elementImage) ? ` Subj: [${elementImage ? 'Image' : 'Prompt'}]` : ' Subj: N/A'} +
                        {textContent ? ` Text: "${textContent}"` : ' Text: N/A'}
                    </p>
                </div>
            </div>

            {/* Fullscreen Preview Modal */}
            {showPreview && generatedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setShowPreview(false)}
                >
                    <button
                        onClick={() => setShowPreview(false)}
                        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10"
                    >
                        <span className="material-icons-round text-white">close</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className="absolute top-4 right-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10"
                    >
                        <span className="material-icons-round text-white">download</span>
                    </button>
                    <img
                        src={generatedImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Background Image Picker */}
            {showBgPicker && (
                <ImageSourcePicker
                    label="Hintergrundbild auswählen"
                    onSelect={(dataUrl) => { setBgImage(dataUrl); setShowBgPicker(false); }}
                    onClose={() => setShowBgPicker(false)}
                />
            )}

            {/* Element Image Picker */}
            {showElPicker && (
                <ImageSourcePicker
                    label="Subject / Element auswählen"
                    onSelect={(dataUrl) => { setElementImage(dataUrl); setShowElPicker(false); }}
                    onClose={() => setShowElPicker(false)}
                />
            )}
        </div>
    );
};