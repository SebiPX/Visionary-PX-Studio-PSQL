import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
    onSwitchToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
    const { signIn, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
        }
        // If successful, AuthContext will handle the state update
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError(null);
        setResetLoading(true);

        const { error } = await resetPassword(resetEmail);

        if (error) {
            setResetError(error.message);
            setResetLoading(false);
        } else {
            setResetSuccess(true);
            setResetLoading(false);
            // Auto-close after 3 seconds
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetSuccess(false);
                setResetEmail('');
            }, 3000);
        }
    };

  return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-2xl border border-border">
                {/* Logo/Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-2">Visionary PX Studio</h1>
                    <p className="text-muted-foreground">Create the Future</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-input placeholder-gray-500 text-foreground bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="text-xs text-primary hover:text-blue-300 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-input placeholder-gray-500 text-foreground bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    {/* Switch to Signup */}
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={onSwitchToSignup}
                            className="text-sm text-primary hover:text-blue-300 transition-colors"
                        >
                            Don't have an account? Create one
                        </button>
                    </div>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-muted border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-foreground">Reset Password</h3>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetError(null);
                                    setResetSuccess(false);
                                    setResetEmail('');
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>

                        {resetSuccess ? (
                            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-center">
                                <span className="material-icons-round text-green-400 text-4xl mb-2">check_circle</span>
                                <p className="text-green-400 font-medium">Password reset email sent!</p>
                                <p className="text-muted-foreground text-sm mt-2">Check your inbox for the reset link.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <p className="text-foreground/90 text-sm">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>

                                <div>
                                    <label htmlFor="reset-email" className="block text-sm font-medium text-foreground/90 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        id="reset-email"
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-card/50 border border-border/80/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                {resetError && (
                                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                                        {resetError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    className="w-full py-3 bg-gradient-to-r from-[#135bec] to-[#4a90ff] text-foreground font-semibold rounded-lg shadow-lg shadow-[#135bec]/30 hover:shadow-[#135bec]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
