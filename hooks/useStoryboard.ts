import { useAuth } from '../contexts/AuthContext';
import { storyboards } from '../lib/apiClient';

export const useStoryboard = () => {
    const { user } = useAuth();

    const saveStoryboard = async (session: any) => {
        if (!user) return { error: new Error('User not authenticated') };

        try {
            const sessionData = {
                title: session.title || 'Untitled Storyboard',
                concept: session.concept || null,
                target_duration: session.target_duration || null,
                num_shots: session.num_shots || 0,
                config: session.config || {},
                assets: session.assets || [],
                shots: session.shots || [],
            };

            if (session.id) {
                const data = await storyboards.update(session.id, sessionData);
                return { data, error: null };
            } else {
                const data = await storyboards.create(sessionData);
                return { data, error: null };
            }
        } catch (error: any) {
            return { data: null, error };
        }
    };

    const loadStoryboards = async () => {
        if (!user) return { data: [], error: new Error('User not authenticated') };
        try {
            const data = await storyboards.list();
            return { data, error: null };
        } catch (error: any) {
            return { data: [], error };
        }
    };

    const deleteStoryboard = async (id: string) => {
        if (!user) return { error: new Error('User not authenticated') };
        try {
            await storyboards.delete(id);
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    return { saveStoryboard, loadStoryboards, deleteStoryboard };
};
