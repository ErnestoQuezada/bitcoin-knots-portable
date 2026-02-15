import React from 'react';

interface MempoolSearchProps {
    query: string;
    setQuery: (q: string) => void;
    onSearch: () => void;
    result: string | null;
    loading: boolean;
    running: boolean;
}

const MempoolSearch: React.FC<MempoolSearchProps> = React.memo(({ query, setQuery, onSearch, result, loading, running }) => {
    return (
        <div className="premium-card">
            <span className="card-label">Mempool & Block Explorer</span>
            <div className="search-wrapper">
                <input
                    type="text"
                    placeholder="TxID, Block Hash or Height..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    className="minimal-input"
                />
                <button
                    onClick={onSearch}
                    disabled={loading || !running}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        opacity: (loading || !running) ? 0.3 : 1
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            </div>
            <div
                className="custom-scrollbar"
                style={{
                    marginTop: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    minHeight: '60px',
                    maxHeight: '150px',
                    overflowY: 'auto'
                }}
            >
                {result ? (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
                        {result}
                    </div>
                ) : (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', opacity: 0.5 }}>
                        NO RESULTS
                    </div>
                )}
            </div>
        </div>
    );
});

export default MempoolSearch;
