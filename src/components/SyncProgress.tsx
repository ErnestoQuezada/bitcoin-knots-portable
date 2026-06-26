import React from 'react';

interface SyncProgressProps {
    progress: string;
    blocks: number;
    headers: number;
}

const SyncProgress: React.FC<SyncProgressProps> = React.memo(({ progress, blocks, headers }) => {
    const isHeaderSync = headers > blocks + 10 && parseFloat(progress) < 0.1;
    
    // Estimate total headers if we don't have them (current network is ~840k)
    const estimatedTotalHeaders = Math.max(headers, 840000);
    const headerProgress = Math.min((headers / estimatedTotalHeaders) * 100, 99.9);
    
    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.75rem' }}>
            <span className="card-label" style={{ marginBottom: '0.5rem', fontSize: '0.7rem' }}>Synchronization</span>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {isHeaderSync ? (
                    <>
                        <span className="big-stat" style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>HEADER SYNC</span>
                        <span className="sub-stat" style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>{headers.toLocaleString()}</span>
                    </>
                ) : (
                    <>
                        <span className="big-stat" style={{ fontSize: '1.5rem' }}>{progress}%</span>
                        <span className="sub-stat" style={{ fontSize: '0.7rem' }}>PROCESSED</span>
                    </>
                )}
            </div>

            <div style={{ width: '100%', background: '#090909', borderRadius: '10px', height: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div
                    style={{
                        width: isHeaderSync ? `${headerProgress}%` : `${progress}%`,
                        background: isHeaderSync 
                            ? 'linear-gradient(90deg, #94A3B8 0%, #FFFFFF 100%)' 
                            : 'linear-gradient(90deg, #F7931A 0%, #FFAD42 100%)',
                        height: '100%',
                        borderRadius: '10px',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isHeaderSync ? 0.5 : 1
                    }}
                ></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>BLOCKS</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{blocks.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>HEADERS</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{headers.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
});

export default SyncProgress;
