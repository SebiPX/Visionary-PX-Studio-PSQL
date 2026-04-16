import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { AppView } from '../types';
import toast from 'react-hot-toast';

export type ContentItem = {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'THUMBNAIL' | 'SKETCH' | '3D' | 'VOICE' | 'MUSIC' | 'TEXT' | 'I2AUDIO';
    url: string; // The URL to preview logic (image, video, or audio)
    rawUrl?: string; // Optional raw url if needed
    title?: string;
    timestamp: string;
    originalDate: Date;
    content?: string; // For texts
    model_url?: string; // For 3D
};

interface MyAssetsProps {
    setView: (view: AppView) => void;
    navigateToItem: (view: AppView, itemId: string) => void;
    isActive: boolean;
}

const TABS = ['All', 'Images', 'Videos', 'Audio', 'Thumbnails', 'Sketches', '3D', 'Texts'];

export const MyAssets: React.FC<MyAssetsProps> = ({ setView, navigateToItem, isActive }) => {
    const { profile } = useAuth();
    const { loadHistory, deleteContent, loading } = useGeneratedContent();
    const [items, setItems] = useState<ContentItem[]>([]);
    const [activeTab, setActiveTab] = useState('All');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

    useEffect(() => {
        if (isActive) {
            fetchAllContent();
        }
    }, [isActive, refreshTrigger]);

    const fetchAllContent = async () => {
        // Load all types in parallel
        const limit = 100; // Load up to 100 of each
        const results = await Promise.all([
            loadHistory('image', limit),
            loadHistory('video', limit),
            loadHistory('thumbnail', limit),
            loadHistory('sketch', limit),
            loadHistory('3d', limit),
            loadHistory('voice', limit),
            loadHistory('music', limit),
            loadHistory('i2audio', limit),
            loadHistory('text', limit)
        ]);

        const [imagesRes, videosRes, thumbsRes, sketchesRes, modelsRes, voicesRes, musicRes, i2audioRes, textsRes] = results;

        const allContent: ContentItem[] = [];

        if (imagesRes.success && imagesRes.data) {
            allContent.push(...imagesRes.data.map((i: any) => ({
                id: i.id, type: 'IMAGE' as const, url: i.image_url, title: i.prompt, timestamp: formatTimestamp(i.created_at), originalDate: new Date(i.created_at)
            })));
        }
        if (videosRes.success && videosRes.data) {
            allContent.push(...videosRes.data.map((v: any) => ({
                id: v.id, type: 'VIDEO' as const, url: v.video_url, rawUrl: v.thumbnail_url || v.video_url, title: v.prompt, timestamp: formatTimestamp(v.created_at), originalDate: new Date(v.created_at)
            })));
        }
        if (thumbsRes.success && thumbsRes.data) {
            allContent.push(...thumbsRes.data.map((t: any) => ({
                id: t.id, type: 'THUMBNAIL' as const, url: t.image_url, title: t.prompt, timestamp: formatTimestamp(t.created_at), originalDate: new Date(t.created_at)
            })));
        }
        if (sketchesRes.success && sketchesRes.data) {
            allContent.push(...sketchesRes.data.filter((s:any)=>!!s.generated_image_url).map((s: any) => ({
                id: s.id, type: 'SKETCH' as const, url: s.generated_image_url, title: `${s.context} - ${s.style}`, timestamp: formatTimestamp(s.created_at), originalDate: new Date(s.created_at)
            })));
        }
        if (modelsRes.success && modelsRes.data) {
            allContent.push(...modelsRes.data.map((m: any) => ({
                id: m.id, type: '3D' as const, url: m.image_url, model_url: m.model_url, title: '3D Model', timestamp: formatTimestamp(m.created_at), originalDate: new Date(m.created_at)
            })));
        }
        if (voicesRes.success && voicesRes.data) {
            allContent.push(...voicesRes.data.map((v: any) => ({
                id: v.id, type: 'VOICE' as const, url: v.audio_url, title: v.prompt || v.title, timestamp: formatTimestamp(v.created_at), originalDate: new Date(v.created_at)
            })));
        }
        if (musicRes.success && musicRes.data) {
            allContent.push(...musicRes.data.map((m: any) => ({
                id: m.id, type: 'MUSIC' as const, url: m.audio_url, title: m.prompt, timestamp: formatTimestamp(m.created_at), originalDate: new Date(m.created_at)
            })));
        }
        if (i2audioRes.success && i2audioRes.data) {
            allContent.push(...i2audioRes.data.map((a: any) => ({
                id: a.id, type: 'I2AUDIO' as const, url: a.video_url || a.audio_url, title: a.prompt, timestamp: formatTimestamp(a.created_at), originalDate: new Date(a.created_at)
            })));
        }
        if (textsRes.success && textsRes.data) {
            allContent.push(...textsRes.data.map((t: any) => ({
                id: t.id, type: 'TEXT' as const, url: '', content: t.content, title: t.topic || 'Text Generation', timestamp: formatTimestamp(t.created_at), originalDate: new Date(t.created_at)
            })));
        }

        // Sort by dates, newest first
        allContent.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
        setItems(allContent);
    };

    const formatTimestamp = (isoString: string): string => {
        return new Date(isoString).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Derived states
    const filteredItems = useMemo(() => {
        if (activeTab === 'All') return items;
        if (activeTab === 'Images') return items.filter(i => i.type === 'IMAGE');
        if (activeTab === 'Videos') return items.filter(i => i.type === 'VIDEO');
        if (activeTab === 'Audio') return items.filter(i => ['VOICE', 'MUSIC', 'I2AUDIO'].includes(i.type));
        if (activeTab === 'Thumbnails') return items.filter(i => i.type === 'THUMBNAIL');
        if (activeTab === 'Sketches') return items.filter(i => i.type === 'SKETCH');
        if (activeTab === '3D') return items.filter(i => i.type === '3D');
        if (activeTab === 'Texts') return items.filter(i => i.type === 'TEXT');
        return items;
    }, [items, activeTab]);

    const handleDelete = async (item: ContentItem) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        let typeParam = item.type.toLowerCase();
        if (['VOICE', 'MUSIC', 'I2AUDIO'].includes(item.type)) {
            typeParam = item.type.toLowerCase(); // matches useGeneratedContent types
        }
        
        const res = await deleteContent(item.id, typeParam as any);
        if (res.success) {
            toast.success('Asset deleted successfully');
            if (previewItem?.id === item.id) setPreviewItem(null);
            setRefreshTrigger(prev => prev + 1);
        } else {
            toast.error('Failed to delete asset');
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const toastId = toast.loading('Downloading...');
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.dismiss(toastId);
            toast.success('Download complete');
        } catch (error) {
            toast.error('Failed to download file');
            console.error(error);
        }
    };

    const getFilenameFromItem = (item: ContentItem) => {
        const ext = item.url.split('.').pop()?.split('?')[0] || 'file';
        const sanitizedTitle = (item.title || 'asset').substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        let extension = ext;
        if (['IMAGE', 'THUMBNAIL', 'SKETCH'].includes(item.type)) extension = 'png';
        if (item.type === 'VIDEO' || item.type === 'I2AUDIO') extension = 'mp4';
        if (['VOICE', 'MUSIC'].includes(item.type)) extension = 'mp3';
        if (item.type === '3D' && item.model_url) return `model_${item.id}.glb`;
        
        return `${item.type.toLowerCase()}_${sanitizedTitle}.${extension}`;
    };

    // Render Preview Modal
    const renderPreviewModal = () => {
        if (!previewItem) return null;

        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col backdrop-blur-sm animate-in fade-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-black">
                    <div className="flex items-center gap-3">
                        <span className="text-white/60 text-sm font-medium uppercase tracking-widest">{previewItem.type}</span>
                        <h3 className="text-white font-medium max-w-xl truncate">{previewItem.title || 'Untitled Generation'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {previewItem.type !== 'TEXT' && (
                            <button
                                onClick={() => handleDownload(previewItem.type === '3D' && previewItem.model_url ? previewItem.model_url : previewItem.url, getFilenameFromItem(previewItem))}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors text-sm font-medium"
                            >
                                <span className="material-icons-round text-[18px]">download</span>
                                Download
                            </button>
                        )}
                        <button
                            onClick={() => handleDelete(previewItem)}
                            className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors ml-2"
                            title="Delete Asset"
                        >
                            <span className="material-icons-round text-[20px]">delete</span>
                        </button>
                        <button
                            onClick={() => setPreviewItem(null)}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-4"
                        >
                            <span className="material-icons-round text-[24px]">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
                    {['IMAGE', 'THUMBNAIL', 'SKETCH', '3D'].includes(previewItem.type) && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img src={previewItem.url} alt={previewItem.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            {previewItem.type === '3D' && previewItem.model_url && (
                                <a href={previewItem.model_url} target="_blank" rel="noopener noreferrer" className="mt-4 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
                                    <span className="material-icons-round">open_in_new</span> Provide 3D Model source
                                </a>
                            )}
                        </div>
                    )}
                    {['VIDEO', 'I2AUDIO'].includes(previewItem.type) && (
                        <video src={previewItem.url} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl shadow-primary/20 bg-black" />
                    )}
                    {['VOICE', 'MUSIC'].includes(previewItem.type) && (
                        <div className="w-full max-w-2xl bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-icons-round text-5xl">{previewItem.type === 'MUSIC' ? 'music_note' : 'record_voice_over'}</span>
                            </div>
                            <audio src={previewItem.url} controls autoPlay className="w-full mt-4" />
                        </div>
                    )}
                    {previewItem.type === 'TEXT' && (
                        <div className="w-full max-w-4xl h-full bg-card border border-border rounded-xl p-8 overflow-y-auto custom-scrollbar">
                            <h2 className="text-2xl font-bold text-foreground mb-6">{previewItem.title}</h2>
                            <div className="prose prose-invert max-w-none text-foreground/80 whitespace-pre-wrap">
                                {previewItem.content}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col w-full bg-background relative overflow-hidden">
            
            {/* Header & Tabs */}
            <div className="flex-shrink-0 pt-8 px-8 pb-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-[1920px] mx-auto w-full flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                <span className="material-icons-round text-primary text-3xl">photo_library</span>
                                My Assets
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Manage, preview, and download all your AI-generated content.
                            </p>
                        </div>
                        <button 
                            onClick={fetchAllContent}
                            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-colors"
                        >
                            <span className="material-icons-round text-[18px]">refresh</span>
                            Refresh
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-[1920px] mx-auto">
                    
                    {loading && items.length === 0 ? (
                        <div className="flex items-center justify-center py-20 w-full h-64">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-muted-foreground font-medium">Loading your galaxy of creations...</p>
                            </div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex items-center justify-center py-20 h-64">
                            <div className="text-center max-w-md">
                                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                    <span className="material-icons-round text-4xl text-muted-foreground/50">sentiment_dissatisfied</span>
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">No assets found</h3>
                                <p className="text-muted-foreground/80">
                                    {activeTab === 'All' 
                                        ? 'You have not created any assets yet. Head over to the AI Studio tools to start generating!' 
                                        : `You don't have any ${activeTab.toLowerCase()} yet.`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredItems.map(item => (
                                <div 
                                    key={`${item.type}-${item.id}`} 
                                    className="group relative bg-card border border-border hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 flex flex-col h-full"
                                    onClick={() => setPreviewItem(item)}
                                >
                                    <div className="aspect-square w-full relative bg-muted flex-shrink-0 overflow-hidden flex flex-col justify-center items-center">
                                        {['IMAGE', 'THUMBNAIL', 'SKETCH', '3D'].includes(item.type) ? (
                                            <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                                        ) : ['VIDEO', 'I2AUDIO'].includes(item.type) ? (
                                            <>
                                                {item.rawUrl && item.rawUrl.endsWith('.mp4') ? (
                                                    <video src={item.rawUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" muted playsInline />
                                                ) : (
                                                    <img src={item.rawUrl || item.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform shadow-lg">
                                                        <span className="material-icons-round text-white text-2xl">play_arrow</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : ['VOICE', 'MUSIC'].includes(item.type) ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
                                                <div className="w-16 h-16 rounded-full bg-background/50 border border-border flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                                                    <span className="material-icons-round text-3xl text-primary">{item.type === 'MUSIC' ? 'music_note' : 'voicemail'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            // TEXT
                                            <div className="w-full h-full flex flex-col p-4 bg-background">
                                                <div className="flex items-center gap-2 text-primary mb-2 opacity-80">
                                                    <span className="material-icons-round text-lg">description</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-6 opacity-70 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">{item.content}</p>
                                            </div>
                                        )}

                                        {/* Overlay gradient inside asset */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                            <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                <button 
                                                    className="w-full py-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewItem(item);
                                                    }}
                                                >
                                                    <span className="material-icons-round text-[16px]">visibility</span>
                                                    Preview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 p-3 flex flex-col justify-between bg-card min-w-0">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold tracking-wider uppercase ${
                                                    item.type === 'VIDEO' ? 'bg-purple-600' :
                                                    item.type === 'THUMBNAIL' ? 'bg-emerald-500' :
                                                    item.type === 'SKETCH' ? 'bg-orange-500' :
                                                    item.type === 'MUSIC' ? 'bg-pink-500' :
                                                    item.type === 'VOICE' ? 'bg-cyan-600' :
                                                    item.type === 'TEXT' ? 'bg-slate-600' :
                                                    item.type === '3D' ? 'bg-amber-600' :
                                                    item.type === 'I2AUDIO' ? 'bg-indigo-500' :
                                                    'bg-blue-600'
                                                }`}>
                                                    {item.type}
                                                </span>
                                                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{item.timestamp}</span>
                                            </div>
                                            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight" title={item.title}>{item.title || 'Untitled'}</p>
                                        </div>
                                        
                                        {/* Actions Footer */}
                                        <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-border/50">
                                            {item.type !== 'TEXT' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownload(item.type === '3D' && item.model_url ? item.model_url : item.url, getFilenameFromItem(item));
                                                    }}
                                                    className="w-7 h-7 rounded-md bg-muted/50 hover:bg-primary/20 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                                                    title="Download"
                                                >
                                                    <span className="material-icons-round text-[16px]">download</span>
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item);
                                                }}
                                                className="w-7 h-7 rounded-md bg-muted/50 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center text-muted-foreground transition-colors"
                                                title="Delete"
                                            >
                                                <span className="material-icons-round text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {renderPreviewModal()}
        </div>
    );
};

export default MyAssets;
