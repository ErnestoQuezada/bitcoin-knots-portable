import React, { useState } from 'react';
import '../minimal.css';
import { addNode } from '../lib/api';

interface PeersDisplayProps {
    peers: number;
    peerInfo?: any[] | null;
    localAddresses?: any[];
}

const PeersDisplay: React.FC<PeersDisplayProps> = React.memo(({ peers, peerInfo, localAddresses }) => {
    const [newPeer, setNewPeer] = useState('');
    const [adding, setAdding] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // summarize Knots vs Core
    const knotsCount = peerInfo ? peerInfo.filter(p => p.subver && p.subver.toLowerCase().includes('knots')).length : 0;
    const coreCount = peerInfo ? peerInfo.filter(p => p.subver && p.subver.toLowerCase().includes('satoshi') && !p.subver.toLowerCase().includes('knots')).length : 0;

    // summarize Inbound vs Outbound
    const inboundCount = peerInfo ? peerInfo.filter(p => p.inbound).length : 0;
    const outboundCount = peerInfo ? peerInfo.filter(p => !p.inbound).length : 0;

    const onionAddrObj = localAddresses?.find(a => a.address?.endsWith('.onion'));
    const onionAddr = onionAddrObj ? `${onionAddrObj.address}:${onionAddrObj.port}` : null;

    const copyToClipboard = () => {
        if (onionAddr) {
            navigator.clipboard.writeText(onionAddr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAddNode = async () => {
        if (!newPeer.trim()) return;
        setAdding(true);
        try {
            await addNode(newPeer.trim());
            setNewPeer('');
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="card-label" style={{ marginBottom: 0 }}>Active Peers</span>
                <div className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'none' }}>
                    <span className="status-dot status-active"></span>
                    {peers} LIVE
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                {peerInfo && peerInfo.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                 <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{knotsCount}</div>
                                 <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>KNOTS</div>
                             </div>
                             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                 <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{coreCount}</div>
                                 <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>CORE</div>
                             </div>
                             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                 <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>{inboundCount}</div>
                                 <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>INBOUND</div>
                             </div>
                             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                 <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{outboundCount}</div>
                                 <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>OUTBOUND</div>
                             </div>
                        </div>

                        {/* List */}
                        {peerInfo.map((p, i) => {
                            const isKnots = p.subver && p.subver.toLowerCase().includes('knots');
                            return (
                                <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.addr}</span>
                                        <span style={{ 
                                            color: isKnots ? 'var(--accent)' : '#fff',
                                            fontWeight: isKnots ? 'bold' : 'normal',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>{(p.subver || 'Unknown').replace(/\//g, '')}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: p.inbound ? 'var(--success)' : 'var(--text-dim)' }}>
                                        {p.inbound ? 'INBOUND' : 'OUTBOUND'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Waiting for peer data...
                    </div>
                )}
            </div>

            {/* Add Peer Section */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
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
                
                <div className="search-wrapper">
                    <input 
                        type="text" 
                        className="minimal-input" 
                        placeholder="Add peer (onion/ip)..." 
                        value={newPeer}
                        onChange={(e) => setNewPeer(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
                    />
                    <button 
                        onClick={handleAddNode}
                        disabled={adding || !newPeer.trim()}
                        style={{ 
                            position: 'absolute', 
                            right: '5px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            opacity: (adding || !newPeer.trim()) ? 0.5 : 1
                        }}
                    >
                        {adding ? '...' : 'ADD'}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default PeersDisplay;
