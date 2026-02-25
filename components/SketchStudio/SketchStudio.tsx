import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas, { CanvasRef } from './DrawingCanvas';
import ControlPanel from './ControlPanel';
import ResultView from './ResultView';
import { AppState, ContextOption, StyleOption } from './types';
import { generateImageFromSketch, editGeneratedImage } from '../../services/sketchService';
import { useGeneratedContent } from '../../hooks/useGeneratedContent';
import { GeneratedSketch } from '../../lib/database.types';
import { uploadFile as apiUploadFile } from '../../lib/apiClient';

export const SketchStudio: React.FC = () => {
    // ========================================================================
    // STATE
    // ========================================================================

    const [appState, setAppState] = useState<AppState>(AppState.DRAWING);
    const [context, setContext] = useState<ContextOption>(ContextOption.HUMAN);
    const [style, setStyle] = useState<StyleOption>(StyleOption.CINEMATIC);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
    const [sketchData, setSketchData] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState<GeneratedSketch[]>([]);

    const canvasRef = useRef<CanvasRef>(null);
    const { saveSketch, loadSketchHistory, loading } = useGeneratedContent();

    // ========================================================================
    // EFFECTS
    // ========================================================================

    useEffect(() => {
        const loadHistory = async () => {
            const sketches = await loadSketchHistory(20);
            setHistory(sketches as any);
        };
        loadHistory();
    }, []);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleGenerate = async () => {
        if (!canvasRef.current) return;

        try {
            setError(null);
            const snapshot = canvasRef.current.getSnapshot();
            setSketchData(snapshot);
            setAppState(AppState.GENERATING);

            // Generate image (returns a base64 data-URL)
            const result = await generateImageFromSketch(snapshot, context, style, aspectRatio);
            setGeneratedImage(result);
            setAppState(AppState.RESULT);

            // Upload BOTH images to Supabase Storage in parallel
            const ts = Date.now();
            const rand = () => Math.random().toString(36).substr(2, 6);

            const [generatedBlob, sketchBlob] = await Promise.all([
                (await fetch(result)).blob(),
                (await fetch(snapshot)).blob(),
            ]);

            const uploadToR2 = async (blob: Blob, folder: string): Promise<string> => {
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
                const fileObj = new File([blob], fileName, { type: 'image/png' });
                return await apiUploadFile(fileObj, folder);
            };

            const [imageUrl, sketchUrl] = await Promise.all([
                uploadToR2(generatedBlob, 'sketches'),
                uploadToR2(sketchBlob, 'sketches/originals'),
            ]);

            console.log('[SketchStudio] Generated:', imageUrl);
            console.log('[SketchStudio] Original sketch:', sketchUrl);

            // Save to database — both as Storage URLs (no base64 in DB)
            const saveResult = await saveSketch({
                sketch_data: sketchUrl || snapshot,        // URL or base64 fallback
                generated_image_url: imageUrl || result,   // URL or base64 fallback
                context,
                style,
                edit_history: [],
            });
            if (!saveResult?.success) {
                console.error('[SketchStudio] DB save failed:', saveResult?.error);
            }

            // Reload history
            const sketches = await loadSketchHistory(20);
            setHistory(sketches as any);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate image. Please try again.');
            setAppState(AppState.DRAWING);
        }
    };

    const processEdit = async (instruction: string) => {
        if (!generatedImage) return;
        setIsProcessing(true);
        try {
            const result = await editGeneratedImage(generatedImage, instruction);
            setGeneratedImage(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to edit image.");
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setAppState(AppState.DRAWING);
        setSketchData(null);
        setGeneratedImage(null);
        setError(null);
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="flex h-screen w-full bg-[#101622] text-slate-200 overflow-hidden">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#135bec]/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#135bec]/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative w-full h-full flex flex-col max-w-[1600px] mx-auto p-4 md:p-6 gap-6">

                {/* Header */}
                <header className="flex items-center justify-between shrink-0 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-[#135bec] to-[#0d4bb8] p-2.5 rounded-lg shadow-lg shadow-[#135bec]/50">
                            <span className="material-icons-round text-white text-2xl">brush</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Sketch Studio</h1>
                            <p className="text-xs text-slate-400 font-medium">Sketch to Image AI</p>
                        </div>
                    </div>
                    {appState !== AppState.DRAWING && (
                        <button
                            onClick={reset}
                            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Start New Sketch
                        </button>
                    )}
                </header>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <span className="material-icons-round text-lg">error</span>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto hover:text-white">&times;</button>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 min-h-0 flex gap-6 relative">

                    {appState === AppState.RESULT ? (
                        <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500">
                            <ResultView
                                originalSketch={sketchData!}
                                generatedImage={generatedImage!}
                                context={context}
                                style={style}
                                onBack={() => setAppState(AppState.DRAWING)}
                                onEdit={processEdit}
                                isEditing={isProcessing}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Left Column: History */}
                            <div className="w-64 shrink-0 flex flex-col h-full bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800/50 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">history</span>
                                    Your Sketches ({history.length})
                                </h3>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-8 h-8 border-2 border-[#135bec] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : history.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 overflow-y-auto hide-scrollbar">
                                        {history.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSketchData(item.sketch_data);
                                                    setGeneratedImage(item.generated_image_url);
                                                    setContext(item.context as ContextOption);
                                                    setStyle(item.style as StyleOption);
                                                    setAppState(AppState.RESULT);
                                                }}
                                                className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group hover:border-[#135bec]/50 transition-all"
                                                title={`${item.context} - ${item.style}`}
                                            >
                                                <img src={item.generated_image_url || item.sketch_data} alt="History" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="material-icons-round text-white text-sm">restore</span>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] text-white/80 truncate">{item.context}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className="material-icons-round text-3xl text-slate-700 mb-2">brush</span>
                                        <p className="text-xs text-slate-500">No sketches yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Middle Column: Canvas */}
                            <div className={`flex-1 flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800/50 p-1 relative overflow-hidden transition-all duration-500 ${appState === AppState.GENERATING ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                <DrawingCanvas
                                    ref={canvasRef}
                                    onCanvasReady={() => { }}
                                />
                            </div>

                            {/* Right Column: Controls */}
                            <div className="w-80 md:w-96 shrink-0 flex flex-col h-full">
                                <ControlPanel
                                    context={context}
                                    setContext={setContext}
                                    style={style}
                                    setStyle={setStyle}
                                    aspectRatio={aspectRatio}
                                    setAspectRatio={setAspectRatio}
                                    onGenerate={handleGenerate}
                                    isGenerating={appState === AppState.GENERATING}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SketchStudio;
