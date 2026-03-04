import { useState } from 'react';
import { images, videos, thumbnails, texts, sketches, chats, models3d, voices, music, ApiImage, ApiVideo, ApiThumbnail, ApiText, ApiSketch } from '../lib/apiClient';

type ContentType = 'image' | 'video' | 'thumbnail' | 'text' | 'sketch' | '3d' | 'voice' | 'music';

interface Save3DData {
    image_url: string;
    model_url: string;
    config?: Record<string, any>;
}

interface SaveVoiceData {
    title?: string;
    prompt: string;
    audio_url: string;
    config?: Record<string, any>;
}

interface SaveMusicData {
    prompt: string;
    audio_url: string;
    config?: Record<string, any>;
}

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

export interface GeneratedContent {
    image_url: string;
    model_url: string;
    config?: Record<string, any>;
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

    const save3D = async (data: Save3DData) => {
        setLoading(true); setError(null);
        try {
            await models3d.create(data);
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveVoice = async (data: SaveVoiceData) => {
        setLoading(true); setError(null);
        try {
            await voices.create(data);
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const saveMusic = async (data: SaveMusicData) => {
        setLoading(true); setError(null);
        try {
            await music.create(data);
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

    // Chat sessions
    const saveChat = async (data: SaveChatData) => {
        setLoading(true); setError(null);
        try {
            await chats.save({
                title: data.title,
                bot_id: data.bot_id,
                messages: data.messages,
            });
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    };

    const loadChatSessions = async (_limit = 50) => {
        try {
            const data = await chats.list();
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message, data: [] };
        }
    };

    const loadHistory = async (type: ContentType, _limit = 50) => {
        setLoading(true); setError(null);
        try {
            let data: any[];
            switch (type) {
                case 'image':
                    data = await images.list();
                    break;
                case 'video':
                    data = await videos.list();
                    break;
                case 'thumbnail':
                    data = await thumbnails.list();
                    break;
                case 'sketch':
                    data = await sketches.list();
                    break;
                case '3d':
                    data = await models3d.list();
                    break;
                case 'voice':
                    data = await voices.list();
                    break;
                case 'music':
                    data = await music.list();
                    break;
                default:
                    data = await texts.list();
                    break;
            }
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
            let result;
            switch (type) {
                case 'image':
                    result = await images.delete(id);
                    break;
                case 'video':
                    result = await videos.delete(id);
                    break;
                case 'thumbnail':
                    result = await thumbnails.delete(id);
                    break;
                case 'sketch':
                    result = await sketches.delete(id);
                    break;
                case '3d':
                    result = await models3d.delete(id);
                    break;
                case 'voice':
                    result = await voices.delete(id);
                    break;
                case 'music':
                    result = await music.delete(id);
                    break;
                default:
                    result = await texts.delete(id);
                    break;
            }
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
        save3D,
        saveVoice,
        saveMusic,
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
