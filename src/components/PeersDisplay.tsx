import React from 'react';

interface PeersDisplayProps {
    peers: number;
}

const PeersDisplay: React.FC<PeersDisplayProps> = React.memo(({ peers }) => {
    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span className="card-label">Active Peers</span>
            <div className="big-stat" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{peers}</div>
            <div className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'none' }}>
                <span className="status-dot status-active"></span>
                LIVE NODES
            </div>
        </div>
    );
});

export default PeersDisplay;
