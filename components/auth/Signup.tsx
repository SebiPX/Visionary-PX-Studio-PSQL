import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SignupProps {
    onSwitchToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSwitchToLogin }) => {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Basic validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        const { error: signUpError } = await signUp(email, password, fullName);

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Auto-switch to login after 2 seconds
            setTimeout(() => {
                onSwitchToLogin();
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#135bec] to-[#4a90ff] bg-clip-text text-transparent mb-2">
                        Visionary PX Studio
                    </h1>
                    <p className="text-muted-foreground">Create the Future</p>
                </div>

                {/* Signup Card */}
                <div className="bg-muted/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl shadow-[#135bec]/10">
                    <h2 className="text-2xl font-semibold text-foreground mb-6">Create Account</h2>

                    {success ? (
                        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-center">
                            <p className="font-medium mb-1">Account created successfully!</p>
                            <p className="text-sm">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Full Name Input */}
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-foreground/90 mb-2">
                                    Full Name
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-card/50 border border-border/80/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                />
                            </div>

                            {/* Email Input */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-foreground/90 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-card/50 border border-border/80/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground/90 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-card/50 border border-border/80/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-[#135bec] to-[#4a90ff] text-foreground font-semibold rounded-lg shadow-lg shadow-[#135bec]/30 hover:shadow-[#135bec]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>
                    )}

                    {/* Switch to Login */}
                    {!success && (
                        <div className="mt-6 text-center">
                            <p className="text-muted-foreground text-sm">
                                Already have an account?{' '}
                                <button
                                    onClick={onSwitchToLogin}
                                    className="text-[#135bec] hover:text-[#4a90ff] font-medium transition-colors"
                                >
                                    Sign In
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
