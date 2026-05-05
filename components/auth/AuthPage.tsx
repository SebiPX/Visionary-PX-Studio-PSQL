import React, { useState, useEffect } from 'react';
import { Login } from './Login';
import { ResetPassword } from './ResetPassword';

export const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Check for password reset token
    useEffect(() => {
        // First check URL hash for recovery type (before Supabase processes it)
        const checkUrlHash = () => {
            const hash = window.location.hash;
            if (hash.includes('type=recovery') || hash.includes('type%3Drecovery')) {
                console.log('Recovery token detected in URL');
                sessionStorage.setItem('password_recovery', 'true');
                setIsResettingPassword(true);
                return true;
            }
            return false;
        };

        // Check URL hash immediately
        if (checkUrlHash()) {
            return;
        }

        // Also check sessionStorage (in case we already detected it)
        const isRecovery = sessionStorage.getItem('password_recovery');
        if (isRecovery === 'true') {
            setIsResettingPassword(true);
        }
    }, []);

    // Handle password reset completion
    const handleResetComplete = () => {
        setIsResettingPassword(false);
        setIsLogin(true);
        // Clear the recovery flag
        sessionStorage.removeItem('password_recovery');
        // Clear URL hash
        window.history.replaceState(null, '', window.location.pathname);
    };

    if (isResettingPassword) {
        return <ResetPassword onComplete={handleResetComplete} />;
    }

    return <Login />;
};
