import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile, normalizeStorageUrl, downloadAsset, geminiProxy } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedVideo } from '../lib/database.types';

interface HistoryItem {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
}

interface VideoStudioProps {
    selectedItemId?: string | null;
    onItemLoaded?: () => void;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ selectedItemId, onItemLoaded }) => {
    // ========================================================================
    // STATE & REFS
    // ========================================================================

    const { saveVideo, loadHistory } = useGeneratedContent();
    const [isPlaying, setIsPlaying] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeMode, setActiveMode] = useState<'TEXT' | 'IMAGE'>('TEXT');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
    const [duration, setDuration] = useState<'2s' | '4s' | '8s'>('4s');
    const [cameraMotion, setCameraMotion] = useState('Pan');
    const [videoUri, setVideoUri] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuARKp7un_J6viDTzhW62zcaIX54n_gduphy8RFH1nb5LrOpPsFRtd3uFEWCD1AnQrvArVRpdsoDPdspjUMk2IMXcBWI-3mu8TpCO2o_4B71YZJVTZcOLHNPt8cyFXUNfAO4W6aTM9PgtX9BOOe9lQXTqdRyd-SmNOjI4Knd2Rtqpn4QXicuxXkfYFzplomomOUFkfiP6j-PSRevX9SzXraWGKTBqUVOfCuy_CYr9xbxbRY_wmpJ2vLGJMMK3mdJ5yDD4PiaKKN_ueJ6NZ');
    const [history, setHistory] = useState<GeneratedVideo[]>([]);

    // Upload State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video ref for playback control
    const videoRef = useRef<HTMLVideoElement>(null);

    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);

    // Load video history from database
    const loadVideoHistory = useCallback(async () => {
        const result = await loadHistory('video', 20);
        if (result.success && result.data) {
            setHistory(result.data as GeneratedVideo[]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only load once on mount

    useEffect(() => {
        loadVideoHistory();
    }, [loadVideoHistory]);

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

    // Video control handlers
    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleDownload = () => {
        downloadAsset(videoUri, `generated-video-${Date.now()}.mp4`);
    };

    const handlePreview = () => {
        setShowPreview(true);
    };

    const addToHistory = async (geminiUrl: string, usedPrompt: string) => {
        try {
            // 1. Download the video from Gemini as a blob
            const response = await fetch(geminiUrl);
            if (!response.ok) throw new Error('Failed to fetch video from Gemini');
            const blob = await response.blob();

            // 2. Upload blob to Cloudflare R2 via labs-api
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
            const videoFile = new File([blob], fileName, { type: 'video/mp4' });
            const permanentUrl = await uploadFile(videoFile, 'videos');

            // 4. Save permanent URL to DB
            await saveVideo({
                prompt: usedPrompt,
                model: 'veo-3.1-fast-generate-preview',
                video_url: permanentUrl,
                config: { aspectRatio, duration, cameraMotion, mode: activeMode },
            });

            // 5. Update player to use permanent URL
            setVideoUri(permanentUrl);
        } catch (err) {
            console.error('Video upload to Storage failed, saving Gemini URL as fallback:', err);
            // Fallback: save whatever URL we have
            await saveVideo({
                prompt: usedPrompt,
                model: 'veo-3.1-fast-generate-preview',
                video_url: geminiUrl,
                config: { aspectRatio, duration, cameraMotion, mode: activeMode },
            });
        }

        // Reload history
        loadVideoHistory();
    };

    // Auto-restore selected item from Dashboard
    useEffect(() => {
        if (selectedItemId && history.length > 0) {
            const selectedItem = history.find(item => item.id === selectedItemId);
            if (selectedItem) {
                setVideoUri(selectedItem.video_url);
                setPrompt(selectedItem.prompt || '');
                onItemLoaded?.();
            }
        }
    }, [selectedItemId, history]);

    const handleGenerate = async () => {
        if (!prompt) return;
        if (activeMode === 'IMAGE' && !uploadedImage) {
            alert("Please upload a source image for Image-to-Video.");
            return;
        }

        const aistudio = (window as any).aistudio;
        if (aistudio && aistudio.hasSelectedApiKey && aistudio.openSelectKey) {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await aistudio.openSelectKey();
            }
        }

        setIsGenerating(true);
        setIsPlaying(false);

        try {
            const response = await geminiProxy({
                action: 'generateVideos',
                model: 'veo-3.1-fast-generate-preview',
                prompt: `${prompt} (Camera Motion: ${cameraMotion})`,
                image: (activeMode === 'IMAGE' && uploadedImage) ? {
                    imageBytes: uploadedImage.split(',')[1],
                    mimeType: 'image/png'
                } : undefined,
                config: {
                    resolution: (activeMode === 'IMAGE' && uploadedImage) ? '720p' : '1080p',
                    aspectRatio: aspectRatio
                }
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            let operation = response;

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                const opResponse = await geminiProxy({
                    action: 'getVideosOperation',
                    operation: operation
                }) as any;

                if (opResponse?.error) {
                    throw new Error(JSON.stringify(opResponse.error));
                }

                operation = opResponse;
            }

            const googleUri =
                operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

            if (!googleUri) {
                console.warn('[VideoStudio] Unexpected response structure:', JSON.stringify(operation));
                throw new Error('Video generated but no download URL found in response.');
            }

            // 1. Download the video from Google Files API (needs the API key)
            const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '');
            const googleDownloadUrl = googleUri.includes('?')
                ? `${googleUri}&key=${apiKey}`
                : `${googleUri}?key=${apiKey}`;

            const videoBlob = await (await fetch(googleDownloadUrl)).blob();

            // 2. Upload to Cloudflare R2 for a permanent URL
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.mp4`;
            const videoFile = new File([videoBlob], fileName, { type: 'video/mp4' });
            const publicUrl = await uploadFile(videoFile, 'videos');
            // 3. Save to DB & update UI
            setVideoUri(publicUrl);
            setIsPlaying(true);
            await saveVideo({
                prompt,
                model: 'veo-3.1-fast-generate-preview',
                video_url: publicUrl,
                config: { mode: activeMode, duration, aspectRatio, cameraMotion },
            });
            loadVideoHistory();


        } catch (e) {
            console.error("Video generation failed", e);
            alert("Video generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#080c14] relative overflow-hidden">
            {/* Settings Sidebar */}
            <aside className="w-full md:w-80 bg-glass border-b md:border-b-0 md:border-r border-white/5 z-20 flex flex-col order-2 md:order-1 h-full">
                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8">

                    {/* Input Mode Switcher */}
                    <div className="bg-white/5 p-1 rounded-xl flex">
                        <button
                            onClick={() => { setActiveMode('TEXT'); setUploadedImage(null); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMode === 'TEXT' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Text to Video
                        </button>
                        <button
                            onClick={() => setActiveMode('IMAGE')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMode === 'IMAGE' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Image to Video
                        </button>
                    </div>

                    {/* Video Settings */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Settings</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Duration</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['2s', '4s', '8s'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d as '2s' | '4s' | '8s')}
                                        className={`py-2 rounded-lg border text-xs font-medium transition-colors ${duration === d ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Aspect Ratio</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setAspectRatio('16:9')}
                                    className={`py-2 px-3 rounded-lg border transition-all text-xs flex items-center justify-center gap-2 ${aspectRatio === '16:9' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <span className="material-icons text-sm">crop_16_9</span> 16:9
                                </button>
                                <button
                                    onClick={() => setAspectRatio('9:16')}
                                    className={`py-2 px-3 rounded-lg border transition-all text-xs flex items-center justify-center gap-2 ${aspectRatio === '9:16' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <span className="material-icons text-sm">crop_portrait</span> 9:16
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs text-slate-300">Motion Strength</label>
                                <span className="text-xs text-primary">High</span>
                            </div>
                            <input type="range" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
                        </div>
                    </div>

                    {/* Camera Control */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Camera</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {['Pan', 'Zoom', 'Tilt', 'Roll', 'Static', 'Orbit'].map((cam) => (
                                <button
                                    key={cam}
                                    onClick={() => setCameraMotion(cam)}
                                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${cameraMotion === cam ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 text-slate-500'}`}
                                >
                                    <span className={`material-icons-round text-lg ${cameraMotion === cam ? 'text-primary' : 'text-slate-400'}`}>videocam</span>
                                    <span className="text-[9px] uppercase">{cam}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* History Section */}
                    {history.length > 0 && (
                        <div className="w-full pt-4 border-t border-white/10">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-sm">history</span> Recent Videos
                            </h3>
                            <div className="flex flex-col gap-3">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setVideoUri(item.video_url); setPrompt(item.prompt || ''); }}
                                        className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex gap-3 group transition-all"
                                    >
                                        <div className="w-16 h-10 rounded bg-black flex-shrink-0 overflow-hidden relative">
                                            {item.video_url.includes('mp4') ? (
                                                <video src={item.video_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={item.video_url} className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <span className="material-icons-round text-white text-xs">play_arrow</span>
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-300 truncate">{item.prompt || 'Untitled'}</p>
                                            <p className="text-[9px] text-slate-500 mt-1">{new Date(item.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative order-1 md:order-2 overflow-hidden">
                {/* Header Actions */}
                <header className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto">
                        <div className="px-3 py-1.5 glass rounded-full flex items-center gap-2 border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Veo Model 3.1</span>
                        </div>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={!videoUri.includes('mp4')}
                        className="pointer-events-auto bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold backdrop-blur-md border border-white/10 transition-colors flex items-center gap-2"
                    >
                        <span className="material-icons text-sm">download</span> Export
                    </button>
                </header >

                {/* Scrollable Content Wrapper */}
                < div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col" >

                    {/* Preview Stage */}
                    < div className="flex-1 min-h-[400px] flex items-center justify-center p-4 md:p-8 relative" >
                        <div className={`relative w-full ${aspectRatio === '9:16' ? 'max-w-sm md:max-w-md aspect-[9/16]' : 'max-w-4xl aspect-video'} transition-all duration-500 bg-black rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/20 border border-white/10 group`}>

                            {(!isGenerating && videoUri && videoUri.includes('mp4')) ? (
                                <video
                                    ref={videoRef}
                                    src={videoUri}
                                    loop
                                    className={`w-full h-full object-cover`}
                                    controls={false}
                                />
                            ) : (
                                <img
                                    src={videoUri.includes('mp4') ? "https://lh3.googleusercontent.com/aida-public/AB6AXuARKp7un_J6viDTzhW62zcaIX54n_gduphy8RFH1nb5LrOpPsFRtd3uFEWCD1AnQrvArVRpdsoDPdspjUMk2IMXcBWI-3mu8TpCO2o_4B71YZJVTZcOLHNPt8cyFXUNfAO4W6aTM9PgtX9BOOe9lQXTqdRyd-SmNOjI4Knd2Rtqpn4QXicuxXkfYFzplomOUFkfiP6j-PSRevX9SzXraWGKTBqUVOfCuy_CYr9xbxbRY_wmpJ2vLGJMMK3mdJ5yDD4PiaKKN_ueJ6NZ" : videoUri}
                                    className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'scale-110 blur-md opacity-50' : 'scale-100 opacity-80'}`}
                                    alt="Preview"
                                />
                            )}

                            {/* Generation Loader */}
                            {isGenerating && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                                    <div className="w-16 h-16 relative">
                                        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-white font-bold tracking-widest text-sm animate-pulse">RENDERING FRAMES</p>
                                        <p className="text-slate-400 text-xs mt-1">Estimating physics (Veo)...</p>
                                    </div>
                                </div>
                            )}

                            {/* Play Button Overlay */}
                            {!isGenerating && videoUri.includes('mp4') && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer" onClick={togglePlayPause}>
                                    <div className={`w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 ${isPlaying ? 'scale-90 opacity-0 group-hover:opacity-100' : 'scale-100'}`}>
                                        <span className="material-icons-round text-white text-4xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Controls Overlay - Preview and Download */}
                            {!isGenerating && videoUri.includes('mp4') && (
                                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePreview();
                                        }}
                                        className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                        title="Fullscreen Preview"
                                    >
                                        <span className="material-icons-round">fullscreen</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload();
                                        }}
                                        className="p-2 glass rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                                        title="Download Video"
                                    >
                                        <span className="material-icons-round">download</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div >

                    {/* Prompt Area */}
                    < div className="p-4 md:p-6 z-30 bg-gradient-to-t from-[#080c14] via-[#080c14] to-transparent" >
                        <div className="max-w-3xl mx-auto">
                            {activeMode === 'IMAGE' && (
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
                                            className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <span className="material-icons-round text-3xl text-slate-500 group-hover:text-primary mb-2 transition-colors">add_photo_alternate</span>
                                            <p className="text-xs text-slate-400 font-medium">Upload source image</p>
                                        </div>
                                    ) : (
                                        <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/20">
                                            <img src={uploadedImage} alt="Video Source" className="w-full h-32 object-cover opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <button
                                                    onClick={() => setUploadedImage(null)}
                                                    className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold backdrop-blur flex items-center gap-2"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span> Remove
                                                </button>
                                            </div>
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white font-bold uppercase">
                                                Source Frame
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-2xl p-4 pr-32 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-primary focus:border-primary resize-none shadow-xl min-h-[80px]"
                                    placeholder={activeMode === 'TEXT' ? "Describe the video you want to generate (e.g., A cyberpunk street in rain, neon lights reflection, cinematic 4k)..." : "Describe how the image should move..."}
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || (!prompt && activeMode === 'TEXT')}
                                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                        ) : (
                                            <>
                                                <span className="material-icons-round text-sm">movie_filter</span>
                                                GENERATE
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div >
                </div >
            </main >

            {/* Fullscreen Preview Modal */}
            {showPreview && videoUri.includes('mp4') && (
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
                        title="Download Video"
                    >
                        <span className="material-icons-round">download</span>
                    </button>
                    <video
                        src={videoUri}
                        controls
                        autoPlay
                        loop
                        className="max-w-full max-h-full rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div >
    );
};