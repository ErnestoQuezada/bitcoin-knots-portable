import React from 'react';

interface FeeDisplayProps {
    estimates: Record<string, number> | null;
}

const FeeDisplay: React.FC<FeeDisplayProps> = React.memo(({ estimates }) => {
    return (
        <div className="premium-card">
            <span className="card-label">Transaction Fees</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginBottom: '0.4rem' }}>LOW</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--text-main)' }}>{estimates ? estimates["144"] : "--"} <span style={{ fontSize: '0.6rem' }}>sat/vB</span></div>
                </div>
                <div style={{ width: '1px', height: '2rem', background: 'var(--border-subtle)' }}></div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginBottom: '0.4rem' }}>MED</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>{estimates ? estimates["6"] : "--"} <span style={{ fontSize: '0.6rem' }}>sat/vB</span></div>
                </div>
                <div style={{ width: '1px', height: '2rem', background: 'var(--border-subtle)' }}></div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'var(--accent)', fontSize: '0.65rem', marginBottom: '0.4rem', fontWeight: 700 }}>HIGH</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 700 }}>{estimates ? estimates["2"] : "--"} <span style={{ fontSize: '0.6rem' }}>sat/vB</span></div>
                </div>
            </div>
        </div>
    );
});

export default FeeDisplay;
