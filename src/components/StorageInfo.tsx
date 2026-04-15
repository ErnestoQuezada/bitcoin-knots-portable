import React, { useState } from 'react';

interface StorageInfoProps {
    diskSize: string;
    targetSize: string;
    pruned: boolean;
}

const StorageInfo: React.FC<StorageInfoProps> = React.memo(({ diskSize, targetSize, pruned }) => {
    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <span className="card-label">Storage Mode</span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.25rem' }}>
                <span className="sub-stat" style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>PRUNED NODE</span>
                <span style={{ color: pruned ? '#22C55E' : '#999', fontWeight: 600, fontSize: '0.75rem' }}>{pruned ? "YES" : "NO"}</span>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, padding: '0.75rem 0.5rem', background: '#090909', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>TARGET SIZE</div>
                    <div className="big-stat" style={{ fontSize: '1.1rem', color: 'var(--text-dim)' }}>{targetSize}</div>
                </div>
                <div style={{ flex: 1, padding: '0.75rem 0.5rem', background: '#090909', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>DISK USAGE</div>
                    <div className="big-stat" style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>{diskSize}</div>
                </div>
            </div>
        </div>
    );
});

export default StorageInfo;
