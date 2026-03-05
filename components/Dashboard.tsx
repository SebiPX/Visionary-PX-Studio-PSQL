import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedImage, GeneratedVideo, GeneratedThumbnail, GeneratedSketch } from '../types';
import { AppView } from '../types';

type ContentItem = {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'THUMBNAIL' | 'SKETCH';
    url: string;
    title?: string;
    timestamp: string;
};

interface DashboardProps {
    setView?: (view: AppView) => void;
    navigateToItem?: (view: AppView, itemId: string) => void;
    isActive?: boolean;
}

export const RecentGenerations: React.FC<DashboardProps> = ({ setView, navigateToItem, isActive = true }) => {
    const { profile } = useAuth();
    const { loadHistory, loading } = useGeneratedContent();
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);

    useEffect(() => {
        if (isActive) {
            loadAllHistory();
        }
    }, [isActive]);

    const loadAllHistory = async () => {
        // Load all four types of content in parallel
        const [imagesResult, videosResult, thumbnailsResult, sketchesResult] = await Promise.all([
            loadHistory('image', 20),
            loadHistory('video', 20),
            loadHistory('thumbnail', 20),
            loadHistory('sketch', 20),
        ]);

        // Combine and format all content
        const allContent: ContentItem[] = [];

        // Add images
        if (imagesResult.success && imagesResult.data) {
            const images = (imagesResult.data as GeneratedImage[]).map(img => ({
                id: img.id,
                type: 'IMAGE' as const,
                url: img.image_url,
                title: img.prompt || undefined,
                timestamp: formatTimestamp(img.created_at),
            }));
            allContent.push(...images);
        }

        // Add videos
        if (videosResult.success && videosResult.data) {
            const videos = (videosResult.data as GeneratedVideo[]).map(vid => ({
                id: vid.id,
                type: 'VIDEO' as const,
                url: vid.thumbnail_url || vid.video_url,
                title: vid.prompt || undefined,
                timestamp: formatTimestamp(vid.created_at),
            }));
            allContent.push(...videos);
        }

        // Add thumbnails
        if (thumbnailsResult.success && thumbnailsResult.data) {
            const thumbnails = (thumbnailsResult.data as GeneratedThumbnail[]).map(thumb => ({
                id: thumb.id,
                type: 'THUMBNAIL' as const,
                url: thumb.image_url,
                title: thumb.prompt || undefined,
                timestamp: formatTimestamp(thumb.created_at),
            }));
            allContent.push(...thumbnails);
        }

        // Add sketches
        if (sketchesResult.success && sketchesResult.data) {
            const sketches = (sketchesResult.data as GeneratedSketch[])
                .filter(sketch => !!sketch.generated_image_url) // skip old failed saves
                .map(sketch => ({
                    id: sketch.id,
                    type: 'SKETCH' as const,
                    url: sketch.generated_image_url!,
                    title: `${sketch.context} - ${sketch.style}`,
                    timestamp: formatTimestamp(sketch.created_at),
                }));
            allContent.push(...sketches);
        }

        // Sort by timestamp (newest first)
        allContent.sort((a, b) => {
            // Extract date from timestamp string (e.g., "2 hours ago" -> compare original dates)
            // For now, we'll keep the order from the database query
            return 0;
        });

        setContentItems(allContent);
    };

    const formatTimestamp = (isoString: string): string => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="pt-6 pb-12 w-full">
            {/* Content */}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Generations</h2>
                {contentItems.length > 0 && (
                    <span className="text-slate-500 text-sm">
                        {contentItems.length} {contentItems.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#135bec] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading your creations...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && contentItems.length === 0 && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons-round text-4xl text-slate-600">auto_awesome</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No creations yet</h3>
                        <p className="text-slate-400 mb-6">
                            Start creating amazing content with our AI tools. Your generated images, videos, and thumbnails will appear here.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300">
                                <span className="material-icons-round text-xs align-middle mr-1">image</span>
                                Image Gen
                            </div>
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300">
                                <span className="material-icons-round text-xs align-middle mr-1">videocam</span>
                                Video Studio
                            </div>
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300">
                                <span className="material-icons-round text-xs align-middle mr-1">dashboard_customize</span>
                                Thumbnails
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Grid */}
            {!loading && contentItems.length > 0 && (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-20">
                    {contentItems.map((item) => {
                        const handleClick = () => {
                            // Map content type to corresponding view
                            const viewMap = {
                                'IMAGE': AppView.IMAGE_GEN,
                                'VIDEO': AppView.VIDEO_STUDIO,
                                'THUMBNAIL': AppView.THUMBNAIL_ENGINE,
                                'SKETCH': AppView.SKETCH_STUDIO
                            };

                            // Use navigateToItem if available, otherwise fall back to setView
                            if (navigateToItem) {
                                navigateToItem(viewMap[item.type], item.id);
                            } else if (setView) {
                                setView(viewMap[item.type]);
                            }
                        };

                        return (
                            <div
                                key={item.id}
                                onClick={handleClick}
                                className="break-inside-avoid relative group rounded-xl overflow-hidden glass-card hover:border-white/20 transition-all duration-300 cursor-pointer"
                            >
                                <div className="relative aspect-[4/5] md:aspect-square">
                                    {item.type === 'VIDEO' ? (
                                        <video
                                            src={item.url}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            muted
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={item.url}
                                            alt="Generation"
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    )}
                                    {item.type === 'VIDEO' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                                <span className="material-icons-round text-white">play_arrow</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 p-3 flex flex-col justify-end">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold uppercase tracking-wider ${item.type === 'VIDEO' ? 'bg-purple-600' :
                                                item.type === 'THUMBNAIL' ? 'bg-emerald-500' :
                                                item.type === 'SKETCH' ? 'bg-orange-500' : 'bg-primary'
                                                }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-[10px] text-white/60">{item.timestamp}</span>
                                        </div>
                                        {item.title && <p className="text-xs font-medium text-slate-200 mt-1 truncate">{item.title}</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
