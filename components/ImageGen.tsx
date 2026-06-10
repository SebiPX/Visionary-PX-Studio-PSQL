import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile, normalizeStorageUrl, downloadAsset, geminiProxy, openRouterProxy } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedImage } from '../types';
import { ImageSourcePicker } from './ImageSourcePicker';
import { fal } from '@fal-ai/client';

fal.config({ 
    proxyUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/proxy/fal`
});

const OPENROUTER_IMAGE_MODELS = [
    { id: 'sourceful/riverflow-v2-fast', name: 'Riverflow v2 Fast' },
    { id: 'sourceful/riverflow-v2-fast-preview', name: 'Riverflow v2 Fast Preview' },
    { id: 'black-forest-labs/flux.2-klein-4b', name: 'FLUX.2 Klein 4B' },
    { id: 'openai/gpt-5-image-mini', name: 'GPT-5 Image Mini' }
];

// ============================================================================
// TYPES
// ============================================================================

interface ImageGenProps {
    selectedItemId?: string | null;
    onItemLoaded?: () => void;
    isActive?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ImageGen: React.FC<ImageGenProps> = ({ selectedItemId, onItemLoaded, isActive = true }) => {
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
    const [activeMode, setActiveMode] = useState<'TEXT' | 'IMG2IMG' | 'EDIT' | 'UPSCALE'>('TEXT');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:5' | 'none'>('16:9');
    const [aiModel, setAiModel] = useState<'GEMINI' | 'FAL_QWEN' | 'OPENROUTER'>('GEMINI');
    const [openRouterModel, setOpenRouterModel] = useState<string>('sourceful/riverflow-v2-fast');

    // History
    const [history, setHistory] = useState<GeneratedImage[]>([]);

    // Upload state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI state
    const [showPreview, setShowPreview] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Canvas & Drawing State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(10);
    const [brushColor, setBrushColor] = useState('#FFFFFF');

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
        // Restore the aspect ratio that was used when this image was generated
        if (item.config?.aspectRatio) {
            setAspectRatio(item.config.aspectRatio as '1:1' | '16:9' | '9:16' | '4:5' | 'none');
        }
    };

    // ========================================================================
    // CANVAS HANDLERS
    // ========================================================================

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.closePath();
        }
        setIsDrawing(false);
    };
    
    const clearCanvas = useCallback(() => {
        if (activeMode === 'EDIT' && uploadedImage && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = uploadedImage;
            }
        }
    }, [activeMode, uploadedImage]);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Load history from database when component becomes active
    useEffect(() => {
        if (isActive) {
            loadImageHistory();
        }
    }, [isActive, loadImageHistory]);

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

    // Load canvas background when mode changes or image uploads
    useEffect(() => {
        if (activeMode === 'EDIT' && uploadedImage && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                };
                img.src = uploadedImage;
            }
        }
    }, [activeMode, uploadedImage]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let finalImageUrl = "";

            if (activeMode === 'UPSCALE') {
                if (!uploadedImage) throw new Error("Bitte wähle ein Startbild zum Hochskalieren aus.");

                const result = await fal.subscribe("fal-ai/topaz/upscale/image", {
                    input: {
                        model: "Standard V2",
                        upscale_factor: 2,
                        image_url: uploadedImage,
                        output_format: "jpeg",
                        subject_detection: "All",
                        face_enhancement: true,
                        face_enhancement_strength: 0.8
                    },
                    pollInterval: 5000,
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === "IN_PROGRESS") {
                            console.log('[Fal.ai Upscale]', update.logs?.map((l: any) => l.message).join(' '));
                        }
                    },
                });

                if (!result.data || !(result.data as any).image?.url) {
                    throw new Error("Fal.ai hat kein skaliertes Bild zurückgegeben.");
                }
                
                const falImageUrl = (result.data as any).image.url;
                const imageBlob = await (await fetch(falImageUrl)).blob();
                const fileName = `${Date.now()}_upscale_${Math.random().toString(36).substr(2, 6)}.jpeg`;
                const imageFile = new File([imageBlob], fileName, { type: 'image/jpeg' });
                finalImageUrl = await uploadFile(imageFile, 'images');

            } else if (aiModel === 'FAL_QWEN') {
                let result;
                if (activeMode === 'TEXT') {
                    // Map aspect ratio string to dimensions
                    let imgSize = { width: 2048, height: 1152 }; // defaults to 16:9 roughly
                    if (aspectRatio === '1:1') imgSize = { width: 2048, height: 2048 };
                    else if (aspectRatio === '9:16') imgSize = { width: 1152, height: 2048 };
                    else if (aspectRatio === '4:5') imgSize = { width: 1638, height: 2048 };
                    else if (aspectRatio === 'none') {
                        const effRatio = getEffectiveAspectRatio();
                        const parts = effRatio.split(':').map(Number);
                        if (parts.length === 2 && parts[0] && parts[1]) {
                            const scale = 2048 / Math.max(parts[0], parts[1]);
                            imgSize = { width: Math.round(parts[0] * scale), height: Math.round(parts[1] * scale) };
                        }
                    }

                    result = await fal.subscribe("fal-ai/qwen-image-2/text-to-image", {
                        input: {
                            prompt: prompt,
                            negative_prompt: "low resolution, error, worst quality, low quality, deformed, ugly",
                            image_size: imgSize,
                            enable_prompt_expansion: true,
                            enable_safety_checker: true,
                            num_images: 1,
                            output_format: "png",
                        },
                        pollInterval: 5000,
                        logs: true,
                        onQueueUpdate: (update) => {
                            if (update.status === "IN_PROGRESS") {
                                console.log('[Fal.ai]', update.logs?.map((l: any) => l.message).join(' '));
                            }
                        },
                    });
                } else {
                    if (!uploadedImage) throw new Error("Bitte wähle ein Startbild aus.");
                    
                    result = await fal.subscribe("fal-ai/qwen-image-2/edit", {
                        input: {
                            prompt: prompt || "Enhance image",
                            negative_prompt: "low resolution, error, worst quality, low quality, deformed, ugly",
                            enable_prompt_expansion: true,
                            enable_safety_checker: true,
                            num_images: 1,
                            output_format: "png",
                            image_urls: [uploadedImage]
                        },
                        logs: true,
                        onQueueUpdate: (update) => {
                            if (update.status === "IN_PROGRESS") {
                                console.log('[Fal.ai]', update.logs?.map((l: any) => l.message).join(' '));
                            }
                        },
                    });
                }

                if (!result.data || !result.data.images || result.data.images.length === 0) {
                    throw new Error("Fal.ai hat kein Bild zurückgegeben.");
                }
                
                const falImageUrl = result.data.images[0].url;
                const imageBlob = await (await fetch(falImageUrl)).blob();
                const fileName = `${Date.now()}_fal_${Math.random().toString(36).substr(2, 6)}.png`;
                const imageFile = new File([imageBlob], fileName, { type: 'image/png' });
                finalImageUrl = await uploadFile(imageFile, 'images');            } else if (aiModel === 'OPENROUTER') {
                // OPENROUTER
                const parts: any[] = [];
                if (activeMode !== 'TEXT') {
                    if (activeMode === 'EDIT' && canvasRef.current) {
                        const canvasDataUrl = canvasRef.current.toDataURL('image/png');
                        const base64Data = canvasDataUrl.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: base64Data
                            }
                        });
                    } else if (uploadedImage) {
                        const base64Data = uploadedImage.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: base64Data
                            }
                        });
                    }
                }
                parts.push({ text: prompt });

                const generateSingleImage = async () => {
                    const response = await openRouterProxy({
                        action: 'generateContent',
                        model: openRouterModel,
                        contents: [{ role: 'user', parts: parts }]
                    }) as any;

                    if (response?.error) {
                        console.error("OpenRouter API Error:", response.error);
                        throw new Error(JSON.stringify(response.error));
                    }

                    if (!response.candidates || response.candidates.length === 0) {
                        throw new Error("Die Bild-KI hat keine Antwort geliefert. Bitte versuche es noch einmal.");
                    }

                    const candidate = response.candidates[0];
                    const respParts = candidate.content?.parts;
                    if (respParts) {
                        for (const part of respParts) {
                            if (part.inlineData) {
                                const mimeType = part.inlineData.mimeType || 'image/png';
                                const ext = mimeType.split('/')[1] || 'png';
                                const dataUri = `data:${mimeType};base64,${part.inlineData.data}`;
                                const imageBlob = await (await fetch(dataUri)).blob();
                                const fileName = `${Date.now()}_or_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                                const imageFile = new File([imageBlob], fileName, { type: mimeType });
                                return await uploadFile(imageFile, 'images');
                            }
                        }
                        const textPart = respParts.find((p: any) => p.text);
                        if (textPart) {
                            throw new Error(`Die KI hat mit Text statt einem Bild geantwortet: "${textPart.text}"`);
                        }
                    }
                    throw new Error("Fehler: Die Antwort der OpenRouter Bild-KI war ungültig (fehlende Daten).");
                };

                const url = await generateSingleImage();
                await saveImage({
                    prompt: prompt,
                    style: activeMode,
                    image_url: url,
                    config: { aspectRatio, effectiveAspectRatio: getEffectiveAspectRatio(), mode: activeMode, model: aiModel, openRouterModel }
                });
                finalImageUrl = url;

            } else {
                // GEMINI
                const parts: any[] = [];
                if (activeMode !== 'TEXT') {
                    if (activeMode === 'EDIT' && canvasRef.current) {
                        // Get modified canvas as base64
                        const canvasDataUrl = canvasRef.current.toDataURL('image/png');
                        const base64Data = canvasDataUrl.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: base64Data
                            }
                        });
                    } else if (uploadedImage) {
                        const base64Data = uploadedImage.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: base64Data
                            }
                        });
                    }
                }
                parts.push({ text: prompt });

                const generateSingleImage = async () => {
                    const response = await geminiProxy({
                        action: 'generateContent',
                        model: 'gemini-3.1-flash-image-preview',
                        contents: [{ role: 'user', parts: parts }],
                        config: {
                            imageConfig: {
                                aspectRatio: getEffectiveAspectRatio(),
                            }
                        }
                    }) as any;

                    if (response?.error) {
                        console.error("Gemini API Error:", response.error);
                        throw new Error(JSON.stringify(response.error));
                    }
                    
                    if (response.promptFeedback?.blockReason) {
                        throw new Error(`Generierung blockiert: Die Google KI hat diesen Prompt oder das Referenzbild aus Sicherheitsgründen abgelehnt. (${response.promptFeedback.blockReason})`);
                    }

                    if (!response.candidates || response.candidates.length === 0) {
                        throw new Error("Die Bild-KI hat keine Antwort geliefert. Bitte versuche es noch einmal.");
                    }

                    const candidate = response.candidates[0];
                    if (candidate.finishReason === 'IMAGE_OTHER' || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
                        throw new Error("Generierung abgelehnt: Die Google KI weigert sich dieses Bild aufgrund ihrer strengen Sicherheitsrichtlinien zu generieren.");
                    }

                    const respParts = candidate.content?.parts;
                    if (respParts) {
                        for (const part of respParts) {
                            if (part.inlineData) {
                                const mimeType = part.inlineData.mimeType || 'image/png';
                                const ext = mimeType.split('/')[1] || 'png';
                                const dataUri = `data:${mimeType};base64,${part.inlineData.data}`;
                                const imageBlob = await (await fetch(dataUri)).blob();
                                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                                const imageFile = new File([imageBlob], fileName, { type: mimeType });
                                return await uploadFile(imageFile, 'images');
                            }
                        }
                        const textPart = respParts.find((p: any) => p.text);
                        if (textPart) {
                            throw new Error(`Die KI hat mit Text statt einem Bild geantwortet: "${textPart.text}"`);
                        }
                    }
                    throw new Error("Fehler: Die Antwort der Google KI war ungültig (fehlende Daten).");
                };

                // Request 2 images in parallel
                const uploadedUrls = await Promise.all([generateSingleImage(), generateSingleImage()]);
                
                // Save both to history
                for (const url of uploadedUrls) {
                    await saveImage({
                        prompt: prompt,
                        style: activeMode,
                        image_url: url,
                        config: { aspectRatio, effectiveAspectRatio: getEffectiveAspectRatio(), mode: activeMode, model: aiModel }
                    });
                }
                
                // Set the first one as the active main image
                finalImageUrl = uploadedUrls[0];
            }

            setCurrentImage(finalImageUrl);
            await loadImageHistory();

        } catch (e: any) {
            console.error("Image generation failed", e);
            alert(e.message || "Generation failed. Please try again.");
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
            case '4:5': return 'aspect-[4/5] max-w-[420px]';
            case 'none': {
                // Derive display ratio from prompt if possible
                const match = prompt.match(/(\d+):(\d+)/);
                if (match) {
                    const w = parseInt(match[1]);
                    const h = parseInt(match[2]);
                    if (w > h) return 'aspect-video max-w-5xl';
                    if (w === h) return 'aspect-square max-w-[500px]';
                    return 'aspect-[9/16] max-w-[350px]';
                }
                return 'aspect-video max-w-5xl';
            }
            case '16:9': default: return 'aspect-video max-w-5xl';
        }
    };

    /** Extracts the aspect ratio to send to the API. For 'none', reads it from the prompt. */
    const getEffectiveAspectRatio = (): string => {
        if (aspectRatio !== 'none') return aspectRatio;
        const match = prompt.match(/(\d+):(\d+)/);
        return match ? `${match[1]}:${match[2]}` : '16:9';
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-background relative overflow-hidden">
            {/* Sidebar Controls - Widened to match VideoStudio */}
            <aside className="w-full md:w-80 bg-card border-r border-border z-20 flex flex-col border-b md:border-b-0 md:border-r border-border/50 order-2 md:order-1 flex-shrink-0 h-full">

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8">
                    {/* Input Mode Switcher */}
                    <div className="bg-white/5 p-1 rounded-xl grid grid-cols-2 gap-1">
                        <button
                            onClick={() => { setActiveMode('TEXT'); setUploadedImage(null); }}
                            className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeMode === 'TEXT' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Text to Image
                        </button>
                        <button
                            onClick={() => setActiveMode('IMG2IMG')}
                            className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeMode === 'IMG2IMG' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Image to Image
                        </button>
                        <button
                            onClick={() => setActiveMode('EDIT')}
                            className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeMode === 'EDIT' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Inpaint / Edit
                        </button>
                        <button
                            onClick={() => setActiveMode('UPSCALE')}
                            className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeMode === 'UPSCALE' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            AI Upscale
                        </button>
                    </div>

                    {/* Settings Group */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Settings</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-foreground/90">AI Engine</label>
                            <div className="grid grid-cols-3 gap-1">
                                <button
                                    onClick={() => setAiModel('GEMINI')}
                                    className={`py-2 px-1 rounded-lg border transition-all text-[9px] sm:text-[10px] flex items-center justify-center gap-1 font-bold ${aiModel === 'GEMINI' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    Gemini
                                </button>
                                <button
                                    onClick={() => setAiModel('FAL_QWEN')}
                                    className={`py-2 px-1 rounded-lg border transition-all text-[9px] sm:text-[10px] flex items-center justify-center gap-1 font-bold ${aiModel === 'FAL_QWEN' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    Fal.ai
                                </button>
                                <button
                                    onClick={() => setAiModel('OPENROUTER')}
                                    className={`py-2 px-1 rounded-lg border transition-all text-[9px] sm:text-[10px] flex items-center justify-center gap-1 font-bold ${aiModel === 'OPENROUTER' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    OpenRouter
                                </button>
                            </div>
                        </div>

                        {aiModel === 'OPENROUTER' && (
                            <div className="space-y-2 animate-in fade-in duration-300">
                                <label className="text-xs text-foreground/90">OpenRouter Model</label>
                                <select
                                    value={openRouterModel}
                                    onChange={(e) => setOpenRouterModel(e.target.value)}
                                    className="w-full bg-white/5 border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                                >
                                    {OPENROUTER_IMAGE_MODELS.map(model => (
                                        <option key={model.id} value={model.id} className="bg-[#0b0f19] text-foreground">
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs text-foreground/90">Aspect Ratio</label>
                            <div className="grid grid-cols-5 gap-1">
                                <button
                                    onClick={() => setAspectRatio('1:1')}
                                    className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${aspectRatio === '1:1' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-xs">crop_square</span>
                                    <span className="text-[8px] font-semibold">1:1</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('16:9')}
                                    className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${aspectRatio === '16:9' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-xs">crop_16_9</span>
                                    <span className="text-[8px] font-semibold">16:9</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('9:16')}
                                    className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${aspectRatio === '9:16' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-xs">crop_portrait</span>
                                    <span className="text-[8px] font-semibold">9:16</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('4:5')}
                                    className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${aspectRatio === '4:5' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-xs">crop_5_4</span>
                                    <span className="text-[8px] font-semibold">4:5</span>
                                </button>
                                <button
                                    onClick={() => setAspectRatio('none')}
                                    className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${aspectRatio === 'none' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                    title="Aspect Ratio wird aus dem Prompt gelesen (z.B. '9:16')"
                                >
                                    <span className="material-icons-round text-xs">text_fields</span>
                                    <span className="text-[8px] font-semibold">none</span>
                                </button>
                            </div>
                            {aspectRatio === 'none' && (
                                <p className="text-[9px] text-muted-foreground/70 leading-tight">
                                    Ratio aus Prompt lesen (z.B. <span className="text-primary/80">9:16</span> im Text)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="w-full pt-4 border-t border-border">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
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
                                        className={`relative overflow-hidden rounded-lg border border-border group hover:border-primary/50 transition-all ${
                                            item.config?.aspectRatio === '9:16' ? 'aspect-[9/16]' :
                                            item.config?.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
                                        }`}
                                        title={item.prompt || 'Generated image'}
                                    >
                                        <img src={item.image_url} alt="History" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-icons-round text-foreground text-sm">restore</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[9px] text-foreground/80 truncate">{item.prompt}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <span className="material-icons-round text-3xl text-slate-700 mb-2">image</span>
                                <p className="text-xs text-muted-foreground">No images yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Area Wrapper */}
            <div className="flex-1 relative flex flex-col order-1 md:order-2 h-full min-w-0">



                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">

                    {/* Canvas Area */}
                    <div className="flex-1 flex items-center justify-center p-4 md:p-12 pt-20 relative min-h-[500px] shrink-0">
                        <div className={`relative w-full ${getAspectClass()} transition-all duration-500 rounded-2xl overflow-hidden shadow-2xl shadow-black border border-border/50 bg-background group`}>
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
                                    className="p-2 glass rounded-lg text-foreground/80 hover:bg-white/10 hover:text-foreground transition-colors"
                                    title="Fullscreen Preview"
                                >
                                    <span className="material-icons-round">fullscreen</span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2 glass rounded-lg text-foreground/80 hover:bg-white/10 hover:text-foreground transition-colors"
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
                                    {!uploadedImage ? (
                                        <div
                                            onClick={() => setShowPicker(true)}
                                            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <span className="material-icons-round text-2xl text-muted-foreground group-hover:text-primary">
                                                    {activeMode === 'EDIT' ? 'brush' : activeMode === 'UPSCALE' ? 'high_quality' : 'add_photo_alternate'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/90 font-medium">
                                                {activeMode === 'EDIT' ? 'Bild zum Bearbeiten wählen' : activeMode === 'UPSCALE' ? 'Bild zum Skalieren wählen' : 'Referenzbild wählen'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">Upload · Webcam · Eigene Assets</p>
                                        </div>
                                    ) : (
                                        <div className="relative border border-border rounded-xl overflow-hidden bg-black/20 flex flex-col items-center">
                                            {activeMode === 'EDIT' ? (
                                                <div className="w-full relative">
                                                    <div className="absolute top-2 right-2 z-20 flex gap-2">
                                                        <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" title="Brush Color" />
                                                        <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24 cursor-pointer" title="Brush Size" />
                                                        <button onClick={clearCanvas} className="bg-red-500/80 hover:bg-red-500 text-foreground rounded p-1.5 backdrop-blur aspect-square flex items-center justify-center">
                                                            <span className="material-icons-round text-sm">clear</span>
                                                        </button>
                                                    </div>
                                                    <canvas
                                                        ref={canvasRef}
                                                        onMouseDown={startDrawing}
                                                        onMouseMove={draw}
                                                        onMouseUp={stopDrawing}
                                                        onMouseOut={stopDrawing}
                                                        onTouchStart={startDrawing}
                                                        onTouchMove={draw}
                                                        onTouchEnd={stopDrawing}
                                                        className="w-full h-auto max-h-[400px] object-contain cursor-crosshair touch-none"
                                                    />
                                                </div>
                                            ) : (
                                                <img src={uploadedImage} alt="Reference" className="w-full h-32 object-cover opacity-60" />
                                            )}
                                            
                                            <div className="absolute bottom-2 right-2 z-20 flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setShowPicker(true)}
                                                    className="px-3 py-1.5 bg-primary/80 hover:bg-primary text-primary-foreground rounded-lg text-xs font-bold backdrop-blur flex items-center gap-1"
                                                >
                                                    <span className="material-icons-round text-xs">swap_horiz</span> Ändern
                                                </button>
                                                <button
                                                    onClick={() => { setUploadedImage(null); if (activeMode==='EDIT') clearCanvas(); }}
                                                    className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-foreground rounded-lg text-xs font-bold backdrop-blur flex items-center gap-2"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span> Remove
                                                </button>
                                            </div>

                                            {activeMode !== 'EDIT' && (
                                                <div className="absolute top-2 left-2 z-20 px-2 py-1 bg-black/50 rounded text-[10px] text-foreground font-bold uppercase pointer-events-none">
                                                    Reference Image
                                                </div>
                                            )}
                                            {activeMode === 'EDIT' && (
                                                <div className="absolute top-2 left-2 z-20 px-2 py-1 bg-primary/80 rounded text-[10px] text-foreground font-bold uppercase pointer-events-none shadow">
                                                    Canvas Active (Draw!)
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Style Pills (Only text mode usually needs these prominent, but keeping for all for quick styling) */}
                            {activeMode === 'TEXT' && (
                                <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2">
                                    {['Cinematic', '3D Render', 'Anime', 'Cyberpunk', 'Oil Painting'].map((style, i) => (
                                        <button key={style} onClick={() => setPrompt(prev => prev + `, ${style} style`)} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${i === 0 ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-white/5 border border-border text-muted-foreground hover:bg-white/10'}`}>
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Bar */}
                            <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 pl-4 shadow-xl">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    disabled={activeMode === 'UPSCALE'}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-foreground placeholder-muted-foreground py-3 resize-none max-h-[60vh] disabled:opacity-50"
                                    placeholder={
                                        activeMode === 'TEXT' ? "Describe a futuristic city with neon lights..." :
                                            activeMode === 'IMG2IMG' ? "Describe how to transform the reference image..." :
                                                activeMode === 'UPSCALE' ? "Prompt is ignored for upscale" :
                                                    "Describe what to edit in the image (e.g., remove the car, add a hat)..."
                                    }
                                    rows={1}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || (activeMode === 'TEXT' && !prompt) || (activeMode === 'UPSCALE' && !uploadedImage)}
                                    className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 flex-shrink-0 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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
                        className="absolute top-4 right-4 p-3 glass rounded-lg text-foreground hover:bg-white/10 transition-colors z-10"
                        title="Close Preview"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className="absolute top-4 right-20 p-3 glass rounded-lg text-foreground hover:bg-white/10 transition-colors z-10"
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

            {/* Image Source Picker */}
            {showPicker && (
                <ImageSourcePicker
                    label="Bild auswählen"
                    onSelect={(dataUrl) => { setUploadedImage(dataUrl); setShowPicker(false); }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};