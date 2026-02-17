import React, { useEffect, useState, useRef } from 'react';

// Custom hook for number interpolation
const useAnimatedNumber = (value: number, duration: number = 3000) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef<number>(value);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (value === displayValue) return;

        startValueRef.current = displayValue;
        startTimeRef.current = null;

        const animate = (time: number) => {
            if (startTimeRef.current === null) startTimeRef.current = time;
            const elapsed = time - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart: 1 - (1 - t)^4
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = startValueRef.current + (value - startValueRef.current) * ease;

            setDisplayValue(Math.floor(current));

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [value, duration]); // Removed displayValue from dependencies to avoid loop

    return displayValue;
};

interface SyncProgressProps {
    progress: string;
    blocks: number;
    headers: number;
}

const SyncProgress: React.FC<SyncProgressProps> = React.memo(({ progress, blocks, headers }) => {
    const animatedBlocks = useAnimatedNumber(blocks);
    const animatedHeaders = useAnimatedNumber(headers);
    const [highlight, setHighlight] = useState(false);

    useEffect(() => {
        if (blocks > 0) {
            setHighlight(true);
            const timer = setTimeout(() => setHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [blocks]);

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
                <span className={`sub-stat ${highlight ? 'highlight-pulse' : ''}`} style={{ transition: 'color 0.5s', color: highlight ? '#F7931A' : 'var(--text-dim)' }}>BLOCKS: {animatedBlocks.toLocaleString()}</span>
                <span className="sub-stat">HEADERS: {animatedHeaders.toLocaleString()}</span>
            </div>
        </div>
    );
});

export default SyncProgress;
