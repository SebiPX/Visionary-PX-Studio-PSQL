import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, getToken, setToken, clearToken, ApiUser } from '../lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────
// Using ApiUser as our "user" type — mirrors old Supabase User shape
// enough for all components that access user.id, user.email, etc.
export type Profile = ApiUser;

interface AuthContextType {
    user: ApiUser | null;
    profile: ApiUser | null;          // alias of user (same data)
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    // resetPassword / updatePassword
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount: restore session from localStorage token
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        auth.me()
            .then(userData => {
                setUser(userData);
            })
            .catch(() => {
                // Token invalid/expired — clear it
                clearToken();
            })
            .finally(() => setLoading(false));
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { token, user: userData } = await auth.login(email, password);
            setToken(token);
            setUser(userData);
            return { error: null };
        } catch (err: any) {
            return { error: new Error(err.message || 'Login failed') };
        }
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        try {
            const { token, user: userData } = await auth.register(email, password, fullName);
            setToken(token);
            setUser(userData);
            return { error: null };
        } catch (err: any) {
            return { error: new Error(err.message || 'Registration failed') };
        }
    };

    const signOut = async () => {
        clearToken();
        setUser(null);
        window.location.replace('/');
    };

    const refreshProfile = async () => {
        try {
            const userData = await auth.me();
            setUser(userData);
        } catch {
            // ignore
        }
    };

    // Not yet implemented in labs-api — return a stub error
    const resetPassword = async (_email: string) => ({
        error: new Error('Password reset via email is not yet available in this version.'),
    });

    const updatePassword = async (currentPassword: string, newPassword: string) => {
        try {
            await auth.updatePassword(currentPassword, newPassword);
            return { error: null };
        } catch (err: any) {
            return { error: new Error(err.message || 'Password update failed') };
        }
    };

    const value: AuthContextType = {
        user,
        profile: user,       // same object — components use both interchangeably
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        resetPassword,
        updatePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
