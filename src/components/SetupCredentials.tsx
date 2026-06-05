import { useState } from 'react';
import { setRpcCredentials } from '../lib/api';

interface SetupCredentialsProps {
    onSetupComplete: () => void;
}

export default function SetupCredentials({ onSetupComplete }: SetupCredentialsProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedUser = username.trim();
        const trimmedPass = password.trim();

        if (!trimmedUser || !trimmedPass) {
            setError('Both username and password are required.');
            return;
        }

        setLoading(true);
        try {
            await setRpcCredentials(trimmedUser, trimmedPass);
            onSetupComplete();
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-container">
            <div className="setup-card">
                <div className="setup-header">
                    <div className="setup-logo">
                        <img src="/knots-logo.svg" alt="Bitcoin Knots" />
                    </div>
                    <h2 className="setup-title">RPC Credentials Setup</h2>
                    <p className="setup-subtitle">
                        Configure a username and password to secure RPC access to your node. These credentials will be stored locally in <code>bitcoin.conf</code>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    {error && (
                        <div className="setup-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="rpc-user">RPC Username</label>
                        <input
                            id="rpc-user"
                            type="text"
                            className="minimal-input"
                            placeholder="Enter RPC username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rpc-pass">RPC Password</label>
                        <div className="input-container">
                            <input
                                id="rpc-pass"
                                type={showPassword ? 'text' : 'password'}
                                className="minimal-input"
                                placeholder="Enter RPC password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-setup-submit"
                        disabled={loading || !username.trim() || !password.trim()}
                    >
                        {loading ? 'Saving credentials...' : 'Save & Continue'}
                    </button>
                </form>

                <div className="setup-footer-note">
                    Note: Stored in data/bitcoin.conf (portable)
                </div>
            </div>
        </div>
    );
}
