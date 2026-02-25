import { useState } from 'react';
import { images, videos, thumbnails, texts, sketches, ApiImage, ApiVideo, ApiThumbnail, ApiText, ApiSketch } from '../lib/apiClient';

type ContentType = 'image' | 'video' | 'thumbnail' | 'text' | 'sketch';

interface SaveImageData {
    prompt: string;
    style?: string;
    image_url: string;
    config?: Record<string, any>;
}

interface SaveVideoData {
    prompt: string;
    model?: string;
    video_url: string;
    thumbnail_url?: string;
    config?: Record<string, any>;
}

interface SaveThumbnailData {
    prompt: string;
    platform?: string;
    image_url: string;
    config?: Record<string, any>;
}

interface SaveTextData {
    content: string;
    topic?: string;
    platform?: string;
    audience?: string;
    tone?: string;
    config?: Record<string, any>;
}

interface SaveSketchData {
    sketch_data: string;
    generated_image_url: string;
    context: string;
    style: string;
    edit_history?: any[];
}

// Chat session types (stub — labs-api /api/chats not yet implemented)
interface SaveChatData {
    title: string;
    bot_id: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const useGeneratedContent = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveImage = async (data: SaveImageData) => {
        setLoading(true); setError(null);
        try {
            await images.create({ prompt: data.prompt, style: data.style, image_url: data.image_url, config: data.config });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveVideo = async (data: SaveVideoData) => {
        setLoading(true); setError(null);
        try {
            await videos.create({ prompt: data.prompt, model: data.model, video_url: data.video_url, thumbnail_url: data.thumbnail_url, config: data.config });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveThumbnail = async (data: SaveThumbnailData) => {
        setLoading(true); setError(null);
        try {
            await thumbnails.create({ prompt: data.prompt, platform: data.platform, image_url: data.image_url, config: data.config });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveText = async (data: SaveTextData) => {
        setLoading(true); setError(null);
        try {
            await texts.create({
                content: data.content,
                prompt: data.topic,
                type: data.platform,
                config: { audience: data.audience, tone: data.tone, ...data.config },
            });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveSketch = async (data: SaveSketchData) => {
        setLoading(true); setError(null);
        try {
            await sketches.create({
                sketch_data: data.sketch_data,
                generated_image_url: data.generated_image_url,
                context: data.context,
                style: data.style,
                edit_history: data.edit_history || [],
            });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    // Chat sessions — not yet in labs-api, stub out gracefully
    const saveChat = async (_data: SaveChatData) => {
        console.warn('[useGeneratedContent] saveChat: chat sessions not yet migrated to labs-api');
        return { success: true };
    };

    const loadChatSessions = async (_limit = 50) => {
        console.warn('[useGeneratedContent] loadChatSessions: not yet migrated to labs-api');
        return { success: true, data: [] };
    };

    const loadHistory = async (type: ContentType, _limit = 50) => {
        setLoading(true); setError(null);
        try {
            let data: any[];
            if (type === 'image') data = await images.list();
            else if (type === 'video') data = await videos.list();
            else if (type === 'thumbnail') data = await thumbnails.list();
            else if (type === 'sketch') data = await sketches.list();
            else data = await texts.list();
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message, data: [] };
        } finally { setLoading(false); }
    };

    const loadSketchHistory = async (_limit = 20): Promise<ApiSketch[]> => {
        try {
            return await sketches.list();
        } catch (err: any) {
            console.error('Error loading sketch history:', err);
            return [];
        }
    };

    const deleteContent = async (id: string, type: ContentType) => {
        setLoading(true); setError(null);
        try {
            if (type === 'image') await images.delete(id);
            else if (type === 'video') await videos.delete(id);
            else if (type === 'thumbnail') await thumbnails.delete(id);
            else if (type === 'sketch') await sketches.delete(id);
            else await texts.delete(id);
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    return {
        loading,
        error,
        saveImage,
        saveVideo,
        saveThumbnail,
        saveText,
        saveChat,
        saveSketch,
        loadChatSessions,
        loadHistory,
        loadSketchHistory,
        deleteContent,
    };
};
