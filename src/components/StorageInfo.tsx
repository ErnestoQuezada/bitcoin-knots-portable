import React, { useState } from 'react';

interface StorageInfoProps {
    diskSize: string;
    pruned: boolean;
    localAddresses?: any[];
}

const StorageInfo: React.FC<StorageInfoProps> = React.memo(({ diskSize, pruned, localAddresses }) => {
    const [copied, setCopied] = useState(false);

    const onionAddrObj = localAddresses?.find(a => a.address?.endsWith('.onion'));
    const onionAddr = onionAddrObj ? `${onionAddrObj.address}:${onionAddrObj.port}` : null;

    const copyToClipboard = () => {
        if (onionAddr) {
            navigator.clipboard.writeText(onionAddr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="card-label">Node Info</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="sub-stat" style={{ color: 'var(--text-dim)' }}>PRUNED MODE</span>
                <span style={{ color: pruned ? '#22C55E' : '#999', fontWeight: 600, fontSize: '0.75rem' }}>{pruned ? "YES" : "NO"}</span>
            </div>
            
            {onionAddr && (
                <div style={{ marginBottom: '0.75rem', background: 'rgba(247, 147, 26, 0.05)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(247, 147, 26, 0.2)' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>ONION NETWORK ADDRESS</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {onionAddr}
                        </div>
                        <button onClick={copyToClipboard} style={{ background: 'none', border: 'none', color: copied ? 'var(--success)' : 'var(--text-dim)', cursor: 'pointer', padding: '2px' }} title="Copy Onion Address">
                            {copied ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ padding: '0.75rem', background: '#090909', borderRadius: '12px', textAlign: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>DISK USAGE</div>
                <div className="big-stat" style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>{diskSize}</div>
            </div>
        </div>
    );
});

export default StorageInfo;
