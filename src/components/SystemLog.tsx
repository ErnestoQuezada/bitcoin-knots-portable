import React from 'react';

interface SystemLogProps {
    errorInfo: string | null;
    running: boolean;
    chainInfo: any;
    blocks: number;
    onViewLog?: () => Promise<void>;
    logContent?: string | null;
    onClearLog?: () => void;
}

const SystemLog: React.FC<SystemLogProps> = React.memo(({ errorInfo, running, chainInfo, blocks, onViewLog, logContent, onClearLog }) => {
    return (
        <div
            className="custom-scrollbar"
            style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                fontFamily: 'JetBrains Mono',
                height: '100%',
                overflowY: 'auto',
                position: 'relative'
            }}
        >
            <div style={{ position: 'absolute', top: '10px', right: '15px', color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em' }}>LOGS</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logContent ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Node Log:</span>
                            <div className="control-btn" onClick={onClearLog} style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-card)', fontSize: '0.6rem' }}>BACK</div>
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                            {logContent}
                        </pre>
                    </>
                ) : (
                    <>
                        {errorInfo && (
                            <div style={{
                                color: errorInfo.includes('Busy') || errorInfo.includes('Connecting') ? 'var(--accent)' : 'var(--danger)',
                                background: errorInfo.includes('Busy') || errorInfo.includes('Connecting') ? 'rgba(247, 147, 26, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                borderLeft: `2px solid ${errorInfo.includes('Busy') || errorInfo.includes('Connecting') ? 'var(--accent)' : 'var(--danger)'}`
                            }}>
                                [{errorInfo.includes('Busy') || errorInfo.includes('Connecting') ? 'INFO' : 'ERROR'}] {errorInfo}
                            </div>
                        )}
                        {!running && (
                            <div style={{ color: 'var(--text-dim)' }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>&gt;</span> System idle. Waiting for node initialization...
                            </div>
                        )}
                        {running && !errorInfo && !chainInfo && (
                            <div style={{ color: 'var(--accent)' }}>
                                <span style={{ color: 'var(--accent)', opacity: 0.5 }}>&gt;</span> Spawning bitcoind process...
                            </div>
                        )}
                        {chainInfo && (
                            <>
                                <div style={{ color: 'var(--success)' }}>
                                    <span style={{ opacity: 0.5 }}>&gt;</span> Node online. Height: {blocks}
                                </div>
                                {chainInfo.initialblockdownload && (
                                    <div style={{ color: '#F7931A', background: 'rgba(247, 147, 26, 0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                        [INFO] Initial Block Download active. Results may be delayed.
                                    </div>
                                )}
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                                    &gt; Verification progress: {(chainInfo.verificationprogress * 100).toFixed(4)}%
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.6rem' }}>
                                    TIMESTAMP: {new Date().toLocaleTimeString()}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export default SystemLog;
