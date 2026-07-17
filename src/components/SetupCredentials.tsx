import { useState } from 'react';
import { saveInitialConfig, closeWindow, minimizeWindow, maximizeWindow } from '../lib/api';
import { useMemo } from 'react';

interface SetupCredentialsProps {
    onSetupComplete: () => void;
}

export default function SetupCredentials({ onSetupComplete }: SetupCredentialsProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [prune, setPrune] = useState(true);
    const [pruneSizeGb, setPruneSizeGb] = useState<number>(5);

    const isDesktop = useMemo(() => !navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Mobi'), []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent, skipRpc: boolean) => {
        e.preventDefault();
        setError(null);

        let user = null;
        let pass = null;

        if (!skipRpc) {
            user = username.trim();
            pass = password.trim();

            if (!user && !pass) {
                // If both are empty, just continue without RPC credentials.
                user = null;
                pass = null;
            } else if (!user || !pass) {
                setError('Both username and password are required if you want to set up RPC.');
                return;
            }
        }

        if (prune && pruneSizeGb < 2) {
            setError('Pruned node size must be at least 2 GB.');
            return;
        }

        setLoading(true);
        try {
            await saveInitialConfig(user, pass, prune, Math.round(pruneSizeGb * 1024));
            onSetupComplete();
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {isDesktop && (
                <div className="top-bar">
                    <div className="window-controls">
                        <div className="control-btn" onClick={minimizeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6" /></svg>
                        </div>
                        <div className="control-btn" onClick={maximizeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M3,3v6h6V3H3z M8,8H4V4h4V8z" /></svg>
                        </div>
                        <div className="control-btn btn-close" onClick={closeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M10.7,1.3l-0.7-0.7L6,4.6L2,0.6L1.3,1.3l4,4l-4,4l0.7,0.7l4-4l4,4l0.7-0.7l-4-4L10.7,1.3z" /></svg>
                        </div>
                    </div>
                </div>
            )}
            <div className="setup-container" style={{ padding: '1rem', flex: 1 }}>
                <div className="setup-card custom-scrollbar" style={{ maxWidth: '450px', maxHeight: '100%', overflowY: 'auto' }}>
                    <div className="setup-header" style={{ marginBottom: '1.5rem' }}>
                        <div className="setup-logo" style={{ marginBottom: '1rem' }}>
                            <img src="/knots-logo.svg" alt="Bitcoin Knots" style={{ height: '56px' }} />
                        </div>
                        <h2 className="setup-title" style={{ fontSize: '1.3rem' }}>Initial Setup</h2>
                        <p className="setup-subtitle">
                            Configure storage and RPC access for your portable node. These can be changed later in <code>bitcoin.conf</code>.
                        </p>
                    </div>

                    <form className="setup-form">
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

                        <div className="form-group" style={{ marginBottom: '1rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px' }}>
                            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage Mode</h3>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={prune} 
                                    onChange={(e) => setPrune(e.target.checked)}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                <span>Enable Pruning (Discard old blocks to save space)</span>
                            </label>
                            
                            {prune && (
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                    <label className="form-label">Target Size (GB)</label>
                                    <input
                                        type="number"
                                        min="2"
                                        className="minimal-input"
                                        value={pruneSizeGb}
                                        onChange={(e) => setPruneSizeGb(Number(e.target.value))}
                                        disabled={loading}
                                        style={{ padding: '0.6rem 1rem' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Minimum recommended is 5 GB.</p>
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px' }}>
                            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RPC Credentials (Optional)</h3>
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
                                    style={{ padding: '0.6rem 1rem' }}
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
                                        style={{ padding: '0.6rem 1rem' }}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, true)}
                                className="btn-action btn-stop"
                                style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem' }}
                                disabled={loading}
                            >
                                Skip RPC
                            </button>
                            <button
                                type="submit"
                                onClick={(e) => handleSubmit(e, false)}
                                className="btn-setup-submit"
                                style={{ flex: 2, marginTop: 0 }}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
