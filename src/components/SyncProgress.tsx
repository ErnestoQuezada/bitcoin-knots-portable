import React from 'react';

interface SyncProgressProps {
    progress: string;
    blocks: number;
    headers: number;
}

const SyncProgress: React.FC<SyncProgressProps> = React.memo(({ progress, blocks, headers }) => {
    return (
        <div className="premium-card">
            <span className="card-label">Synchronization</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span className="big-stat">{progress}%</span>
                <span className="sub-stat">PROCESSED</span>
            </div>

            <div style={{ width: '100%', background: '#090909', borderRadius: '10px', height: '6px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div
                    style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #F7931A 0%, #FFAD42 100%)',
                        height: '100%',
                        borderRadius: '10px',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="sub-stat">BLOCKS: {blocks.toLocaleString()}</span>
                <span className="sub-stat">HEADERS: {headers.toLocaleString()}</span>
            </div>
        </div>
    );
});

export default SyncProgress;
