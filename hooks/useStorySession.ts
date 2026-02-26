import { useState } from 'react';
import { useStoryboard } from './useStoryboard';
import { StoryboardSession, StoryAsset, StoryShot } from '../types';

export const useStorySession = () => {
    const { saveStoryboard, loadStoryboards } = useStoryboard();

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState('Untitled Storyboard');
    const [history, setHistory] = useState<StoryboardSession[]>([]);

    const loadHistory = async () => {
        const { data, error } = await loadStoryboards();
        if (!error && data) {
            setHistory(data);
        }
    };

    const saveSession = async (
        actors: StoryAsset[],
        environment: StoryAsset | null,
        product: StoryAsset | null,
        storyText: string,
        genre: string,
        mood: string,
        targetAudience: string,
        shots: StoryShot[]
    ) => {
        const allAssets = [...actors];
        if (environment) allAssets.push(environment);
        if (product) allAssets.push(product);

        const sessionData: Partial<StoryboardSession> = {
            id: sessionId || undefined,
            title: sessionTitle,
            config: {
                story_text: storyText,
                genre,
                mood,
                target_audience: targetAudience,
            },
            assets: allAssets,
            shots,
            num_shots: shots.length,
        };

        const { data, error } = await saveStoryboard(sessionData);
        if (!error && data) {
            setSessionId(data.id);
            await loadHistory();
        }
    };

    const loadSession = (
        session: StoryboardSession,
        setActors: (actors: StoryAsset[]) => void,
        setEnvironment: (env: StoryAsset | null) => void,
        setProduct: (prod: StoryAsset | null) => void,
        setStoryText: (text: string) => void,
        setGenre: (genre: string) => void,
        setMood: (mood: string) => void,
        setTargetAudience: (audience: string) => void,
        setShots: (shots: StoryShot[]) => void
    ) => {
        setSessionId(session.id);
        setSessionTitle(session.title || 'Untitled Storyboard');
        setStoryText(session.config.story_text || '');
        setGenre(session.config.genre || '');
        setMood(session.config.mood || '');
        setTargetAudience(session.config.target_audience || '');
        setShots(session.shots || []);

        // Load assets
        const loadedActors = session.assets?.filter(a => a.type === 'actor') || [];
        const loadedEnv = session.assets?.find(a => a.type === 'environment') || null;
        const loadedProd = session.assets?.find(a => a.type === 'product') || null;

        setActors(loadedActors);
        setEnvironment(loadedEnv);
        setProduct(loadedProd);
    };

    return {
        sessionId,
        sessionTitle,
        setSessionTitle,
        history,
        loadHistory,
        saveSession,
        loadSession,
    };
};
