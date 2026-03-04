import { useState, useEffect } from 'react';
import { fal } from '@fal-ai/client';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { Sparkles, Trash2, Download, PlayCircle } from 'lucide-react';
import { uploadFile } from '../lib/apiClient';

interface MusicStudioProps {
    isActive: boolean;
}

export default function MusicStudio({ isActive }: MusicStudioProps) {
    const [lyrics, setLyrics] = useState('[verse]\nStaring at the sunset, colors paint the sky\nThoughts of you keep swirling, can\'t deny\n\n[chorus]\nEvery road you take, I\'ll be one step behind');
    const [genres, setGenres] = useState('inspiring female uplifting pop');
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);

    const { history = [], loadHistory = () => {}, saveMusic = async () => {}, deleteContent = async () => {}, loading: historyLoading = false } = useGeneratedContent() as any;

    useEffect(() => {
        if (isActive) {
            loadHistory('music');
        }
    }, [isActive]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lyrics.trim() || !genres.trim()) return;

        setIsGenerating(true);
        setLogs([]);
        setCurrentAudio(null);

        try {
            const result = await fal.subscribe("fal-ai/yue", {
                input: {
                    lyrics: lyrics,
                    genres: genres
                },
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        const newLogs = update.logs.map((log) => log.message);
                        setLogs(prev => [...prev, ...newLogs]);
                    }
                },
            });

            const yueData = result.data as any;
            if (yueData && yueData.audio_url) {
                const falAudioUrl = yueData.audio_url;
                setCurrentAudio(falAudioUrl);

                // Option: Upload to R2 to keep our own copy, 
                // but since the user hasn't explicitly answered, we'll try to fetch and upload it
                setLogs(prev => [...prev, "Uploading to R2 Storage..."]);
                try {
                    const audioResponse = await fetch(falAudioUrl);
                    if (audioResponse.ok) {
                        const blob = await audioResponse.blob();
                        const file = new File([blob], `music_${Date.now()}.mp3`, { type: 'audio/mpeg' });
                        const r2Url = await uploadFile(file, 'music');
                        
                        await saveMusic({
                            prompt: lyrics,
                            audio_url: r2Url,
                            config: { genres }
                        });
                        setLogs(prev => [...prev, "Saved successfully."]);
                        loadHistory('music');
                    } else {
                        throw new Error("Failed to fetch audio from Fal.ai for Proxy");
                    }
                } catch (err: any) {
                    console.error("R2 Upload failed, saving fal URL as fallback.", err);
                    await saveMusic({
                        prompt: lyrics,
                        audio_url: falAudioUrl,
                        config: { genres }
                    });
                    loadHistory('music');
                }
            }
        } catch (err: any) {
            console.error("Error generating music:", err);
            setLogs(prev => [...prev, `Error: ${err.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this track entirely?')) {
            await deleteContent(id, 'music');
            loadHistory('music');
        }
    };

    const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0A0F1C]">
            {/* Sidebar Settings */}
            <div className="w-[400px] border-r border-[#1E293B] bg-[#0F172A] flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-200">Music Studio</h2>
                        <p className="text-sm text-slate-400">Fal.ai Yue Music Generation</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Genres & Modifiers
                        </label>
                        <input
                            type="text"
                            value={genres}
                            onChange={(e) => setGenres(e.target.value)}
                            className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="e.g. inspiring female uplifting pop"
                        />
                        <p className="text-xs text-slate-500 mt-2">Space-separated genre tags.</p>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative bg-[#0A0F1C]">
                {/* Generation Area */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
                    <form onSubmit={handleGenerate} className="w-full max-w-3xl space-y-4">
                        <label className="block text-sm font-medium text-slate-300">
                            Song Lyrics (Use [verse] and [chorus] tags)
                        </label>
                        <div className="relative">
                            <textarea
                                value={lyrics}
                                onChange={(e) => setLyrics(e.target.value)}
                                placeholder="[verse]\nYour lyrics here..."
                                className="w-full h-48 bg-[#1E293B] border border-[#334155] rounded-xl pl-4 pr-32 py-4 text-slate-200 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={isGenerating || !lyrics.trim() || !genres.trim()}
                                className="absolute bottom-4 right-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg flex items-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Rendern...
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

                    {/* Progress Logs */}
                    {isGenerating && logs.length > 0 && (
                        <div className="mt-8 w-full max-w-3xl p-4 bg-[#1E293B]/50 rounded-xl border border-[#334155]">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Status Logs</p>
                            <div className="h-32 overflow-y-auto flex flex-col-reverse space-y-1 space-y-reverse text-xs text-slate-300 font-mono">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="opacity-80">&gt; {log}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current generated audio */}
                    {currentAudio && !isGenerating && (
                        <div className="mt-8 w-full max-w-3xl p-6 bg-[#162032] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center gap-4 animate-fade-in-up">
                            <h3 className="text-lg font-bold text-white">Generierter Song</h3>
                            <audio src={currentAudio} controls className="w-full" autoPlay />
                            <button
                                onClick={(e) => handleDownload(e, currentAudio, 'music.mp3')}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Herunterladen
                            </button>
                        </div>
                    )}
                </div>

                {/* History Bar */}
                <div className="h-64 border-t border-[#1E293B] bg-[#0F172A] p-6 overflow-x-auto flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <PlayCircle className="w-5 h-5 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Deine Songs</h3>
                    </div>

                    {historyLoading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex-1 flex justify-center items-center text-slate-500 text-sm">
                            Noch keine Songs generiert.
                        </div>
                    ) : (
                        <div className="flex gap-4 pb-2">
                            {history.map((item: any) => (
                                <div key={item.id} className="min-w-[300px] w-[300px] bg-[#1E293B] rounded-xl p-4 border border-[#334155] flex flex-col hover:border-indigo-500/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-indigo-400">
                                            <PlayCircle className="w-4 h-4" />
                                            <span className="text-xs font-semibold">{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100"
                                            title="Delete track"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-300 line-clamp-2 italic flex-1 mb-3">"{item.prompt}"</p>
                                    <div className="text-xs text-slate-500 mb-2 truncate">Genres: {item.config?.genres || 'N/A'}</div>
                                    <audio src={item.audio_url} controls className="w-full h-8" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
