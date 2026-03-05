import { useState, useCallback } from 'react';
import { socialAudit } from '../lib/apiClient';

export const useSocialAudit = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await socialAudit.getAccounts();
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const addAccount = async (platform: string, username: string, accessToken?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await socialAudit.addAccount({ platform, username, access_token: accessToken });
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const runMockSync = async (accountId: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await socialAudit.syncAccount(accountId);
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = useCallback(async (accountId: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await socialAudit.getPosts(accountId);
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const saveAnalysis = async (postId: number, sentiment: string, detectedPatterns: any, summaryText: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await socialAudit.saveAnalysis({
                post_id: postId,
                sentiment,
                detected_patterns: detectedPatterns,
                summary_text: summaryText
            });
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        loadAccounts,
        addAccount,
        runMockSync,
        loadPosts,
        saveAnalysis
    };
};
