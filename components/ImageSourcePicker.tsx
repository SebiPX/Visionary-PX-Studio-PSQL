import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGeneratedContent } from '../hooks/useGeneratedContent';

interface ImageSourcePickerProps {
    onSelect: (dataUrl: string) => void;
    onClose: () => void;
    accept?: string;
    label?: string;
}

type Tab = 'upload' | 'webcam' | 'assets';

export const ImageSourcePicker: React.FC<ImageSourcePickerProps> = ({
    onSelect,
    onClose,
    accept = 'image/*',
    label = 'Bild auswählen',
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('upload');
    const [webcamActive, setWebcamActive] = useState(false);
    const [webcamError, setWebcamError] = useState<string | null>(null);
    const [assets, setAssets] = useState<{ id: string; url: string; label: string }[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { loadHistory } = useGeneratedContent();

    // ── Webcam ──────────────────────────────────────────────────────────────
    const startWebcam = useCallback(async () => {
        setWebcamError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setWebcamActive(true);
        } catch {
            setWebcamError('Kein Kamera-Zugriff. Bitte Berechtigung erteilen und erneut versuchen.');
        }
    }, []);

    const stopWebcam = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setWebcamActive(false);
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        stopWebcam();
        onSelect(dataUrl);
    };

    // ── Own Assets ───────────────────────────────────────────────────────────
    const loadAssets = useCallback(async () => {
        setLoadingAssets(true);
        const [imgResult, thumbResult] = await Promise.all([
            loadHistory('image', 50),
            loadHistory('thumbnail', 50),
        ]);
        const list: { id: string; url: string; label: string }[] = [];
        if (imgResult.success && imgResult.data) {
            imgResult.data.forEach((item: any) =>
                list.push({ id: item.id, url: item.image_url, label: item.prompt || 'Image' })
            );
        }
        if (thumbResult.success && thumbResult.data) {
            thumbResult.data.forEach((item: any) =>
                list.push({ id: item.id, url: item.image_url, label: item.prompt || 'Thumbnail' })
            );
        }
        setAssets(list);
        setLoadingAssets(false);
    }, [loadHistory]);

    const selectAsset = async (assetId: string, url: string) => {
        setLoadingAssetId(assetId);
        try {
            // Fetch via proxy to avoid CORS issues
            const token = localStorage.getItem('labs_token');
            const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';
            const proxyUrl = `${apiUrl}/api/proxy/download?url=${encodeURIComponent(url)}&filename=asset.png`;
            const res = await fetch(proxyUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('Fetch failed');
            const blob = await res.blob();
            const dataUrl = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            onSelect(dataUrl);
        } catch {
            // Fallback: just use the URL directly
            onSelect(url);
        } finally {
            setLoadingAssetId(null);
        }
    };

    // ── Tab switch effects ───────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'webcam') startWebcam();
        else stopWebcam();

        if (activeTab === 'assets') loadAssets();
    }, [activeTab]);

    // Cleanup on unmount
    useEffect(() => () => stopWebcam(), []);

    // ── File Upload ──────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => onSelect(reader.result as string);
        reader.readAsDataURL(file);
    };

    const tabs: { id: Tab; icon: string; label: string }[] = [
        { id: 'upload', icon: 'upload_file', label: 'Upload' },
        { id: 'webcam', icon: 'photo_camera', label: 'Webcam' },
        { id: 'assets', icon: 'perm_media', label: 'Eigene Assets' },
    ];

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0f1520] border border-white/10 rounded-2xl overflow-hidden w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-white font-bold">{label}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                                activeTab === tab.id
                                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <span className="material-icons-round text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">

                    {/* ── Upload Tab ── */}
                    {activeTab === 'upload' && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-12 flex flex-col items-center justify-center bg-white/3 hover:bg-white/6 hover:border-primary/40 transition-all cursor-pointer group"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-icons-round text-3xl text-primary">upload_file</span>
                            </div>
                            <p className="text-white font-semibold mb-1">Datei hochladen</p>
                            <p className="text-slate-500 text-xs">Klicken oder Datei hierher ziehen</p>
                            <p className="text-slate-600 text-xs mt-2">PNG, JPG, WEBP, AVIF</p>
                        </div>
                    )}

                    {/* ── Webcam Tab ── */}
                    {activeTab === 'webcam' && (
                        <div className="flex flex-col items-center gap-4">
                            {webcamError ? (
                                <div className="w-full bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
                                    <span className="material-icons-round text-red-400 text-4xl mb-3">videocam_off</span>
                                    <p className="text-red-300 text-sm">{webcamError}</p>
                                    <button
                                        onClick={startWebcam}
                                        className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                                    >
                                        Erneut versuchen
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                        {!webcamActive && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={capturePhoto}
                                        disabled={!webcamActive}
                                        className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
                                        title="Foto aufnehmen"
                                    >
                                        <span className="material-icons-round text-slate-800 text-2xl">photo_camera</span>
                                    </button>
                                    <p className="text-slate-500 text-xs">Klicke den Auslöser um ein Foto aufzunehmen</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Own Assets Tab ── */}
                    {activeTab === 'assets' && (
                        <div>
                            {loadingAssets ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="text-center py-16">
                                    <span className="material-icons-round text-slate-700 text-5xl mb-4">image_not_supported</span>
                                    <p className="text-slate-500 text-sm">Noch keine eigenen Assets.</p>
                                    <p className="text-slate-600 text-xs mt-1">Generiere erst Bilder oder Thumbnails.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-500 text-xs mb-4">{assets.length} Assets verfügbar — klicken zum Auswählen</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {assets.map(asset => (
                                            <button
                                                key={asset.id}
                                                onClick={() => selectAsset(asset.id, asset.url)}
                                                disabled={!!loadingAssetId}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-primary/60 transition-all group disabled:opacity-50"
                                                title={asset.label}
                                            >
                                                <img
                                                    src={asset.url}
                                                    alt={asset.label}
                                                    className="w-full h-full object-cover"
                                                />
                                                {loadingAssetId === asset.id ? (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="material-icons-round text-white text-2xl">check_circle</span>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] text-white/80 truncate">{asset.label}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
