import React, { useState } from 'react';
import '../minimal.css';
import { addNode, executeRpcCommand } from '../lib/api';

interface PeersDisplayProps {
    peers: number;
    peerInfo?: any[] | null;
    localAddresses?: any[];
}

const renderHighlightedJson = (jsonStr: string) => {
    if (jsonStr.startsWith('Error:')) return <span style={{color: 'var(--danger)'}}>{jsonStr}</span>;
    const formatted = jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        
        let color = '#fff';
        if (cls === 'key') color = 'var(--accent)'; 
        if (cls === 'string') color = '#22C55E'; 
        if (cls === 'number') color = '#3B82F6'; 
        if (cls === 'boolean') color = '#EAB308'; 
        if (cls === 'null') color = 'var(--text-dim)';
        
        return `<span style="color: ${color}">${match}</span>`;
    });
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

const PeersDisplay: React.FC<PeersDisplayProps> = React.memo(({ peers, peerInfo, localAddresses }) => {
    const [activeTab, setActiveTab] = useState<'peers' | 'rpc'>('peers');
    
    // Peer States
    const [newPeer, setNewPeer] = useState('');
    const [adding, setAdding] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // RPC States
    const [rpcCommand, setRpcCommand] = useState('');
    const [rpcOutput, setRpcOutput] = useState<string | null>(null);
    const [isExecutingRpc, setIsExecutingRpc] = useState(false);
    
    const knotsCount = peerInfo ? peerInfo.filter(p => p.subver && p.subver.toLowerCase().includes('knots')).length : 0;
    const coreCount = peerInfo ? peerInfo.filter(p => p.subver && p.subver.toLowerCase().includes('satoshi') && !p.subver.toLowerCase().includes('knots')).length : 0;
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

    const handleExecuteRpc = async () => {
        if (!rpcCommand.trim()) return;
        setIsExecutingRpc(true);
        setRpcOutput(null);
        try {
            const parts = rpcCommand.trim().split(/\s+/);
            const method = parts[0];
            const params = parts.slice(1).map(p => {
                if (p === 'true') return true;
                if (p === 'false') return false;
                if (!isNaN(Number(p))) return Number(p);
                return p.replace(/^["']|["']$/g, ''); 
            });
            const res = await executeRpcCommand(method, params);
            setRpcOutput(JSON.stringify(res, null, 2));
        } catch (e: any) {
            setRpcOutput(`Error: ${e.toString()}`);
        } finally {
            setIsExecutingRpc(false);
        }
    };

    return (
        <div className="premium-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: '8px', gap: '0.2rem' }}>
                    <div 
                        onClick={() => setActiveTab('peers')}
                        style={{ 
                            cursor: 'pointer', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            background: activeTab === 'peers' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'peers' ? '#fff' : 'var(--text-dim)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Active Peers
                    </div>
                    <div 
                        onClick={() => setActiveTab('rpc')}
                        style={{ 
                            cursor: 'pointer', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            background: activeTab === 'rpc' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'rpc' ? '#fff' : 'var(--text-dim)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        RPC Console
                    </div>
                </div>
                
                {activeTab === 'peers' && (
                    <div className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'none' }}>
                        <span className="status-dot status-active"></span>
                        {peers} LIVE
                    </div>
                )}
            </div>

            {activeTab === 'peers' ? (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                        {peerInfo && peerInfo.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                                    position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px',
                                    padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                                    opacity: (adding || !newPeer.trim()) ? 0.5 : 1
                                }}
                            >
                                {adding ? '...' : 'ADD'}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem' }}>
                    <div style={{ flex: 1, background: '#090909', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.5rem', overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }} className="custom-scrollbar">
                        {rpcOutput ? (
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {renderHighlightedJson(rpcOutput)}
                            </pre>
                        ) : (
                            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Enter a command (e.g. getblockchaininfo)</div>
                        )}
                    </div>
                    <div className="search-wrapper" style={{ marginTop: 'auto' }}>
                        <input 
                            type="text" 
                            className="minimal-input" 
                            placeholder="e.g. getblockhash 0" 
                            value={rpcCommand}
                            onChange={(e) => setRpcCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExecuteRpc()}
                        />
                        <button 
                            onClick={handleExecuteRpc}
                            disabled={isExecutingRpc || !rpcCommand.trim()}
                            style={{ 
                                position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px',
                                padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                                opacity: (isExecutingRpc || !rpcCommand.trim()) ? 0.5 : 1
                            }}
                        >
                            {isExecutingRpc ? '...' : 'EXEC'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PeersDisplay;
