import React, { useState, useEffect } from 'react';
import { fal } from '@fal-ai/client';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { Sparkles, Trash2, Download, PlayCircle, Loader2 } from 'lucide-react';
import { uploadFile } from '../lib/apiClient';

interface I2AudioStudioProps {
    isActive?: boolean;
}

const I2AudioStudio: React.FC<I2AudioStudioProps> = ({ isActive = true }) => {
    const [prompt, setPrompt] = useState('4K studio interview, medium close-up (shoulders-up crop). Solid light-grey seamless backdrop, uniform soft key-light—no lighting change. Presenter faces lens, steady eye-contact. Hands remain below frame, body perfectly still. Ultra-sharp.');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentVideo, setCurrentVideo] = useState<string | null>(null);

    const { history = [], loadHistory = () => {}, saveI2Audio = async () => {}, deleteContent = async () => {}, loading: historyLoading = false } = useGeneratedContent() as any;

    useEffect(() => {
        if (isActive) {
            loadHistory('i2audio');
        }
    }, [isActive]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'AUDIO') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (type === 'IMAGE') setImageUrl(base64String);
                else setAudioUrl(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setLogs([]);
        setCurrentVideo(null);

        try {
            setLogs(prev => [...prev, "Starte Generierung mit creatify/aurora..."]);

            const result = await fal.subscribe("fal-ai/creatify/aurora", {
                input: {
                    image_url: imageUrl,
                    audio_url: audioUrl,
                    prompt: prompt,
                    guidance_scale: 1,
                    audio_guidance_scale: 2,
                    resolution: "720p"
                },
                logs: true,
                pollInterval: 5000,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        const newLogs = update.logs.map((log) => log.message);
                        if (newLogs.length > 0) {
                            setLogs(prev => [...prev, ...newLogs]);
                        }
                    }
                },
            });

            const creatifyData = result.data as any;
            if (creatifyData && creatifyData.video?.url) {
                const falVideoUrl = creatifyData.video.url;
                setCurrentVideo(falVideoUrl);

                setLogs(prev => [...prev, "Spiele Datei ab, sichere Kopie im R2 Storage..."]);
                
                try {
                    const response = await fetch(falVideoUrl);
                    const blob = await response.blob();
                    const fileName = `i2audio-${Date.now()}.mp4`;
                    const file = new File([blob], fileName, { type: 'video/mp4' });
                    
                    const publicUrl = await uploadFile(file, 'i2audio');
                    
                    await saveI2Audio({
                        prompt: "I2Audio Generation: " + prompt.substring(0, 50),
                        video_url: publicUrl,
                        config: { original_image: imageUrl, original_audio: audioUrl }
                    });
                    setLogs(prev => [...prev, "Erfolgreich gespeichert."]);
                    loadHistory('i2audio');
                } catch (err) {
                    console.error("Speichern fehlgeschlagen, nutze orginal URL", err);
                    await saveI2Audio({
                        prompt: "I2Audio Generation: " + prompt.substring(0, 50),
                        video_url: falVideoUrl,
                        config: { original_image: imageUrl, original_audio: audioUrl }
                    });
                    loadHistory('i2audio');
                }
            } else {
                throw new Error("No video URL returned from Fal.ai.");
            }
        } catch (err: any) {
            console.error(err);
            setLogs(prev => [...prev, `Fehler: ${err.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this video entirely?')) {
            await deleteContent(id, 'i2audio');
            loadHistory('i2audio');
        }
    };

    const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
        e.stopPropagation();
        
        if (!url) return;
        
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename || 'download.mp4';
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                }, 100);
            })
            .catch(err => {
                console.error("Download failed:", err);
                window.open(url, '_blank');
            });
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-background relative overflow-hidden">
            <div className="w-[400px] border-r border-[#1E293B] bg-card flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">i2Audio Studio</h2>
                        <p className="text-xs text-muted-foreground">Animate Image with Audio</p>
                    </div>
                </div>

                <form onSubmit={handleGenerate} className="flex-1 flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium text-foreground/90 mb-2">Reference Image</label>
                        {imageUrl ? (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#334155] mb-2 group">
                                <img src={imageUrl} alt="Upload preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImageUrl(null)}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-6 h-6 text-foreground" />
                                </button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'IMAGE')}
                                className="w-full bg-card border border-[#334155] rounded-xl px-4 py-3 text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-foreground hover:file:bg-indigo-500 cursor-pointer"
                            />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Ein Portrait-Bild (16:9, 1:1 oder 9:16)</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-foreground/90 mb-2">Voice Audio File</label>
                        {audioUrl ? (
                            <div className="flex items-center justify-between bg-card border border-[#334155] rounded-xl px-4 py-3">
                                <span className="text-indigo-400 text-sm truncate max-w-[200px]">Audio wurde geladen</span>
                                <button type="button" onClick={() => setAudioUrl(null)} className="text-muted-foreground hover:text-red-400">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleFileUpload(e, 'AUDIO')}
                                className="w-full bg-card border border-[#334155] rounded-xl px-4 py-3 text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-foreground hover:file:bg-indigo-500 cursor-pointer"
                            />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Upload an audio file (MP3, WAV)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/90 mb-2">Prompt Setup</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe how the speaker should act..."
                            className="w-full min-h-40 max-h-[60vh] bg-card border border-[#334155] rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                        />
                    </div>

                    <div className="mt-auto">
                        <button
                            type="submit"
                            disabled={isGenerating || !imageUrl || !audioUrl}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generiere...
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-5 h-5" />
                                    Erstellen
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 overflow-y-auto">
                    {/* Video Player Area */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {currentVideo ? (
                            <div className="w-full max-w-2xl bg-card rounded-2xl p-4 shadow-xl border border-border flex flex-col gap-4">
                                <video controls src={currentVideo} className="w-full rounded-lg bg-black" />
                                <button
                                    onClick={(e) => handleDownload(e, currentVideo, 'animated.mp4')}
                                    className="px-4 py-2 bg-secondary hover:bg-muted-foreground/20 text-foreground text-sm rounded-lg flex items-center justify-center gap-2 transition-colors mx-auto"
                                >
                                    <Download className="w-4 h-4" />
                                    Video Herunterladen
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Bereit das Video zu generieren</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Status Console Area */}
                    <div className="w-full lg:w-80 bg-card rounded-2xl border border-border p-4 shadow-xl flex flex-col h-[400px]">
                         <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Status Logs</p>
                         <div className="flex-1 overflow-y-auto flex flex-col-reverse space-y-1 space-y-reverse text-xs text-foreground/90 font-mono">
                             {logs.map((log, idx) => (
                                 <div key={idx} className="opacity-80">&gt; {log}</div>
                             ))}
                         </div>
                    </div>
                </div>

                {/* History Bar */}
                <div className="h-64 border-t border-[#1E293B] bg-card p-6 overflow-x-auto flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <PlayCircle className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Erstellte Videos</h3>
                    </div>

                    {historyLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Lade Historie...</span>
                        </div>
                    ) : (
                        <div className="flex gap-4 pb-2">
                            {history.length > 0 ? history.map((item: any) => (
                                <div key={item.id} className="min-w-[300px] w-[300px] bg-card rounded-xl p-4 border border-[#334155] flex flex-col hover:border-indigo-500/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-indigo-400">
                                            <PlayCircle className="w-4 h-4" />
                                            <span className="text-xs font-semibold">{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500 hover:text-foreground transition-opacity opacity-0 group-hover:opacity-100"
                                            title="Delete track"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-foreground/90 line-clamp-2 italic flex-1 mb-3">"{item.prompt}"</p>
                                    <video src={item.video_url} className="h-16 w-full object-cover rounded bg-black mb-3 cursor-pointer" onClick={() => setCurrentVideo(item.video_url)} />
                                    
                                    <button
                                        onClick={(e) => handleDownload(e, item.video_url, 'i2audio-video.mp4')}
                                        className="w-full py-1.5 bg-[#334155] hover:bg-indigo-500 text-foreground text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download className="w-3 h-3" /> Herunterladen
                                    </button>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground italic">Noch keine Videos generiert.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default I2AudioStudio;
