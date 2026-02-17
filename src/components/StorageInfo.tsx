import React from 'react';

interface StorageInfoProps {
    diskSize: string;
    pruned: boolean;
}

const StorageInfo: React.FC<StorageInfoProps> = React.memo(({ diskSize, pruned }) => {
    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="card-label">Storage Info</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="sub-stat" style={{ color: 'var(--text-dim)' }}>PRUNED MODE</span>
                <span style={{ color: pruned ? '#22C55E' : '#999', fontWeight: 600, fontSize: '0.75rem' }}>{pruned ? "YES" : "NO"}</span>
            </div>
            <div style={{ padding: '0.75rem', background: '#090909', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>DISK USAGE</div>
                <div className="big-stat" style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>{diskSize}</div>
            </div>
        </div>
    );
});

export default StorageInfo;
