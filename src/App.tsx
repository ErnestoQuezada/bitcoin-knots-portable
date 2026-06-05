import { startNode, stopNode, fetchBlockchainInfo, fetchNetworkInfo, fetchPeerInfo, closeWindow, minimizeWindow, maximizeWindow, getNodeLog, checkRpcCredentialsSet } from './lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './minimal.css';

import SyncProgress from './components/SyncProgress';
import SystemLog from './components/SystemLog';
import PeersDisplay from './components/PeersDisplay';
import StorageInfo from './components/StorageInfo';
import SetupCredentials from './components/SetupCredentials';


interface NodeData {
    chainInfo: any;
    netInfo: any;
    peerInfo: any[] | null;
}

function App() {
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorInfo, setErrorInfo] = useState<string | null>(null);
    const [nodeData, setNodeData] = useState<NodeData>({ chainInfo: null, netInfo: null, peerInfo: null });
    const [isVisible, setIsVisible] = useState(true);
    const [logContent, setLogContent] = useState<string | null>(null);
    const [credentialsSet, setCredentialsSet] = useState<boolean | null>(null);

    const isDesktop = useMemo(() => !navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Mobi'), []);

    // Lifecycle to check if RPC credentials are set
    useEffect(() => {
        const checkCredentials = async () => {
            try {
                const isSet = await checkRpcCredentialsSet();
                setCredentialsSet(isSet);
            } catch (e) {
                console.error("Failed to check RPC credentials:", e);
                setCredentialsSet(false);
            }
        };
        checkCredentials();
    }, []);

    // Lifecycle
    useEffect(() => {
        const handleVisibility = () => setIsVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // Polling
    useEffect(() => {
        if (!running || !isVisible) return;

        const poll = async () => {
            try {
                // Fetch data independently to prevent one failure from blocking all updates
                const net = await fetchNetworkInfo().catch(() => null);
                const chain = await fetchBlockchainInfo().catch(() => null);
                const peers = await fetchPeerInfo().catch(() => null);

                setNodeData(prev => ({
                    netInfo: net || prev.netInfo,
                    chainInfo: chain || prev.chainInfo,
                    peerInfo: peers || prev.peerInfo
                }));

                // Only show error if core connectivity is missing
                if (!net && !chain) {
                    setErrorInfo("Node Connecting...");
                } else {
                    setErrorInfo(null);
                }
            } catch (e: any) {
                if (running) setErrorInfo(`Node Busy: ${e.message || 'Connecting...'}`);
            }
        };

        const timer = setInterval(poll, 5000);
        poll();
        return () => clearInterval(timer);
    }, [running, isVisible]);

    const handleStart = async () => {
        setLoading(true);
        setErrorInfo(null);
        try {
            await startNode();
            setRunning(true);
        } catch (e: any) {
            setErrorInfo(`Error: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await stopNode();
            setRunning(false);
            setNodeData({ chainInfo: null, netInfo: null, peerInfo: null });
        } catch (e: any) {
            setErrorInfo(`Error: ${e}`);
        } finally {
            setLoading(false);
        }
    };



    const handleViewLog = async () => {
        try {
            const log = await getNodeLog();
            setLogContent(log);
        } catch (e: any) {
            setLogContent(`Failed to fetch log: ${e}`);
        }
    };

    const handleClearLog = () => setLogContent(null);

    // Memoized computations to prevent unnecessary recalculations
    const syncProgressStr = useMemo(() =>
        nodeData.chainInfo ? (nodeData.chainInfo.verificationprogress * 100).toFixed(2) : "0.00"
        , [nodeData.chainInfo]);

    const diskSize = useMemo(() => {
        if (!nodeData.chainInfo?.size_on_disk) return "--";
        const gb = nodeData.chainInfo.size_on_disk / (1024 * 1024 * 1024);
        return gb.toFixed(2) + " GB";
    }, [nodeData.chainInfo]);

    const targetSize = useMemo(() => {
        if (!nodeData.chainInfo?.prune_target_size) return "--";
        const gb = nodeData.chainInfo.prune_target_size / (1024 * 1024 * 1024);
        return gb.toFixed(2) + " GB";
    }, [nodeData.chainInfo]);

    if (credentialsSet === null) {
        return (
            <div className="setup-container">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <img src="/knots-logo.svg" style={{ height: '48px', animation: 'pulse 1.5s infinite' }} alt="Loading" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>INITIALIZING NODE CONTROLLER...</span>
                </div>
            </div>
        );
    }

    if (!credentialsSet) {
        return <SetupCredentials onSetupComplete={() => setCredentialsSet(true)} />;
    }

    return (
        <div className="app-container">
            {isDesktop && (
                <div className="top-bar">
                    <div className="window-controls">
                        <div className="control-btn" onClick={minimizeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6" /></svg>
                        </div>
                        <div className="control-btn" onClick={maximizeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M3,3v6h6V3H3z M8,8H4V4h4V8z" /></svg>
                        </div>
                        <div className="control-btn btn-close" onClick={closeWindow}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M10.7,1.3l-0.7-0.7L6,4.6L2,0.6L1.3,1.3l4,4l-4,4l0.7,0.7l4-4l4,4l0.7-0.7l-4-4L10.7,1.3z" /></svg>
                        </div>
                    </div>
                </div>
            )}

            <header className="header" style={{ padding: '0.25rem 1.5rem', background: 'transparent', backdropFilter: 'none', borderBottom: 'none' }}>
                <div className="header-logo">
                    <div className="logo-box">
                        <img src="/knots-logo.svg" className="object-contain" style={{ height: '48px' }} alt="Bitcoin Node" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.1 }}>Bitcoin Node</h1>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>MAINNET</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="status-badge">
                        <span className={`status-dot ${running ? 'status-active' : 'status-inactive'}`}></span>
                        {loading ? (running ? "STOPPING..." : "STARTING...") : (running ? "NODE ONLINE" : "NODE OFFLINE")}
                    </div>
                    <button
                        onClick={running ? handleStop : handleStart}
                        disabled={loading}
                        className={`btn-action ${running ? "btn-stop" : "btn-start"}`}
                    >
                        {running ? "STOP NODE" : "START NODE"}
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="desktop-layout">
                    {/* Column 1: Sync, Node Info & Logs */}
                    <div className="trinity-stack">
                        <SyncProgress progress={syncProgressStr} blocks={nodeData.chainInfo?.blocks ?? 0} headers={nodeData.chainInfo?.headers ?? 0} />
                        <StorageInfo diskSize={diskSize} targetSize={targetSize} pruned={nodeData.chainInfo?.pruned ?? false} />
                        <SystemLog
                            errorInfo={errorInfo}
                            running={running}
                            chainInfo={nodeData.chainInfo}
                            blocks={nodeData.chainInfo?.blocks ?? 0}
                            logContent={logContent}
                            onClearLog={handleClearLog}
                        />
                    </div>

                    {/* Column 2: Active Peers */}
                    <div className="trinity-stack">
                        <PeersDisplay 
                            peers={nodeData.netInfo?.connections ?? 0} 
                            peerInfo={nodeData.peerInfo} 
                            localAddresses={nodeData.netInfo?.localaddresses}
                        />
                    </div>
                </div>
            </main>

            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-version-label">v0.3.1</span>
                </div>
                <div className="footer-right">
                    Portable Bitcoin Node
                </div>
            </footer>
        </div>
    );
}

export default App;
