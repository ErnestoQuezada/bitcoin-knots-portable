import { startNode, stopNode, fetchBlockchainInfo, fetchNetworkInfo, checkMempool, closeWindow, minimizeWindow, maximizeWindow, fetchFeeEstimates } from './lib/api';
import { useState, useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import './index.css';

function App() {
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorInfo, setErrorInfo] = useState<string | null>(null);
    const [chainInfo, setChainInfo] = useState<any>(null);
    const [netInfo, setNetInfo] = useState<any>(null);
    const [feeEstimates, setFeeEstimates] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<string | null>(null);
    const [showMalwarePrompt, setShowMalwarePrompt] = useState(false);

    // Polling Effect
    useEffect(() => {
        let interval: any;
        if (running) {
            interval = setInterval(async () => {
                try {
                    const chain = await fetchBlockchainInfo();
                    setChainInfo(chain);
                    const net = await fetchNetworkInfo();
                    setNetInfo(net);
                    const fees = await fetchFeeEstimates();
                    setFeeEstimates(fees);
                    setErrorInfo(null);
                } catch (e: any) {
                    console.error("Polling error:", e);
                    // Only show error if we expected it to be running
                    if (running) setErrorInfo("Connection lost: " + (e.message || e));
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [running]);

    const handleStart = async () => {
        setLoading(true);
        setErrorInfo(null);
        try {
            const res = await startNode();
            setRunning(true);
            // Initial fetch
            setTimeout(async () => {
                try {
                    const c = await fetchBlockchainInfo();
                    setChainInfo(c);
                } catch (e) { }
            }, 5000); // Give bitcoind time to spin up RPC
        } catch (e: any) {
            if (e === "MALWARE_DETECTED") {
                setShowMalwarePrompt(true);
            } else {
                setErrorInfo("Start failed: " + e);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await stopNode();
            setRunning(false);
            setChainInfo(null);
            setNetInfo(null);
            setFeeEstimates(null);
        } catch (e: any) {
            setErrorInfo("Stop failed: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        try {
            const res = await checkMempool(searchQuery);
            setSearchResult(res);
        } catch (e: any) {
            setSearchResult("Error: " + e);
        } finally {
            setLoading(false);
        }
    };

    const exitApp = () => {
        closeWindow();
    };

    // Status computation
    const syncProgress = chainInfo ? (chainInfo.verificationprogress * 100).toFixed(2) : "0.00";
    const blocks = chainInfo ? chainInfo.blocks : 0;
    const headers = chainInfo ? chainInfo.headers : 0;
    const peers = netInfo ? netInfo.connections : 0;
    const pruned = "Yes"; // Node is explicitly configured with prune=20000

    return (
        <div className="flex flex-col h-screen w-full bg-[#121212] text-white font-sans relative overflow-hidden select-none">

            {/* Native-style Top Drag Bar */}
            <div
                onMouseDown={(e) => e.buttons === 1 && appWindow.startDragging()}
                data-tauri-drag-region
                className="w-full h-9 bg-[#1A1A1A] flex justify-end items-center px-2 shrink-0 z-50 border-b border-white/5 cursor-default"
            >
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex space-x-1 relative z-[60] pointer-events-auto"
                >
                    <button onClick={minimizeWindow} className="p-1.5 hover:bg-white/10 rounded-md transition-colors cursor-pointer">
                        <svg width="11" height="11" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6" /></svg>
                    </button>
                    <button onClick={maximizeWindow} className="p-1.5 hover:bg-white/10 rounded-md transition-colors cursor-pointer">
                        <svg width="11" height="11" viewBox="0 0 12 12"><rect fill="none" stroke="currentColor" strokeWidth="1" width="9" height="9" x="1.5" y="1.5" /></svg>
                    </button>
                    <button onClick={closeWindow} className="p-1.5 hover:bg-red-500 rounded-md transition-colors group cursor-pointer">
                        <svg width="11" height="11" viewBox="0 0 12 12"><path fill="currentColor" d="M11 1.57L10.43 1L6 5.43L1.57 1L1 1.57L5.43 6L1 10.43L1.57 11L6 6.57L10.43 11L11 10.43L6.57 6L11 1.57Z" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-5 pt-3 overflow-hidden">
                {/* Background Ambience */}
                <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-[#F7931A] opacity-5 blur-[120px] rounded-full pointer-events-none"></div>

                {/* Malware Prompt Modal */}
                {showMalwarePrompt && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                        <div className="bg-[#1E1E1E] border border-red-500/50 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl shadow-red-500/20">
                            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Security Alert</h2>
                            <p className="text-base text-gray-400 mb-7 leading-relaxed">
                                "I'm not running malware"<br />
                                The detected Bitcoin binary is not a genuine Bitcoin Knots version. For your security, the app will now close.
                            </p>
                            <button
                                onClick={exitApp}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20"
                            >
                                Close Application
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header
                    onMouseDown={(e) => e.buttons === 1 && appWindow.startDragging()}
                    data-tauri-drag-region
                    className="flex justify-between items-center mb-6 z-10 shrink-0 cursor-default"
                >
                    <div className="flex items-center space-x-3 pointer-events-none">
                        <div className="w-9 h-9 bg-[#F7931A] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Bitcoin Knots Node</h1>
                            <p className="text-xs text-gray-400 font-mono text-nowrap">BIP110 ENABLED • MAINNET</p>
                        </div>
                    </div>

                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex items-center space-x-4 relative z-20 pointer-events-auto"
                    >
                        {running && (
                            <div className="flex items-center space-x-2 bg-[#1E1E1E] px-3 py-1.5 rounded-full border border-gray-800 pointer-events-none">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs font-semibold text-gray-300">RUNNING</span>
                            </div>
                        )}
                        {!running && !loading && (
                            <div className="flex items-center space-x-2 bg-[#1E1E1E] px-3 py-1.5 rounded-full border border-gray-800 pointer-events-none">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-xs font-semibold text-gray-300">STOPPED</span>
                            </div>
                        )}
                        {loading && (
                            <div className="flex items-center space-x-2 bg-[#1E1E1E] px-3 py-1.5 rounded-full border border-gray-800 pointer-events-none">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"></div>
                                <span className="text-xs font-semibold text-gray-300">PROCESSING...</span>
                            </div>
                        )}

                        <button
                            onClick={running ? handleStop : handleStart}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${running
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                : "bg-[#F7931A] text-white hover:bg-[#ffad42] shadow-lg shadow-orange-500/20"
                                }`}
                        >
                            {running ? "Stop Node" : "Start Node"}
                        </button>
                    </div>
                </header>

                {/* Main Content Grid: 2 Columns */}
                <main className="flex-1 grid grid-cols-2 gap-5 z-10 relative overflow-hidden">

                    {/* Left Column: 3 Vertical Cards (Fees, Sync, Mempool) */}
                    <div className="flex flex-col gap-5 overflow-hidden">

                        {/* Transaction Fees Card */}
                        <div className="flex-1 bg-[#1E1E1E] rounded-xl p-5 border border-gray-800/50 flex flex-col justify-center shadow-sm">
                            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-auto">Transaction Fees</h3>
                            <div className="flex justify-between items-center text-xs mt-4">
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-gray-500 mb-2">Low</span>
                                    <span className="text-gray-400 font-mono text-sm">{feeEstimates ? feeEstimates["144"] : "--"} <span className="text-[10px]">sat/vB</span></span>
                                </div>
                                <div className="w-px h-10 bg-gray-800/50"></div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-gray-500 mb-2">Medium</span>
                                    <span className="text-white font-mono text-sm font-semibold">{feeEstimates ? feeEstimates["6"] : "--"} <span className="text-[10px]">sat/vB</span></span>
                                </div>
                                <div className="w-px h-10 bg-gray-800/50"></div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-gray-500 mb-2">High</span>
                                    <span className="text-[#F7931A] font-bold font-mono text-sm">{feeEstimates ? feeEstimates["2"] : "--"} <span className="text-[10px]">sat/vB</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Synchronization Card */}
                        <div className="flex-1 bg-[#1E1E1E] rounded-xl p-5 border border-gray-800/50 flex flex-col justify-between shadow-sm">
                            <div>
                                <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Synchronization</h2>
                                <div className="flex items-end space-x-2">
                                    <span className="text-4xl font-bold text-white">{syncProgress}%</span>
                                    <span className="text-gray-500 mb-1 font-mono text-xs">processed</span>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="w-full bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-[#F7931A] to-[#ffad42] h-2 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${syncProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                    <span>Blocks: {blocks.toLocaleString()}</span>
                                    <span>Headers: {headers.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mempool Checker Card */}
                        <div className="flex-1 bg-[#1E1E1E] rounded-xl p-5 border border-gray-800/50 flex flex-col overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center mb-4 text-nowrap">
                                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Mempool & Block Explorer</h3>
                            </div>
                            <div className="relative group shrink-0 mb-4">
                                <input
                                    type="text"
                                    placeholder="TXID, Hash or Height..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2.5 text-xs font-mono focus:border-[#F7931A] focus:outline-none transition-all placeholder:text-gray-700"
                                />
                                <button onClick={handleSearch} disabled={loading || !running} className="absolute right-2 top-2 p-1.5 text-gray-500 hover:text-[#F7931A] disabled:opacity-30 transition-colors pointer-events-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 bg-black/20 border border-gray-800/50 rounded-lg p-4 overflow-y-auto custom-scrollbar">
                                {searchResult ? (
                                    <div className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">
                                        {searchResult}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[10px] text-gray-600 uppercase text-center opacity-50 space-y-2">
                                        <span>Search Mempool or Blockchain</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: 2 Segments (Top Grid, System Log) */}
                    <div className="flex flex-col gap-5 overflow-hidden">

                        {/* Top: Peers & Storage Grid */}
                        <div className="grid grid-cols-2 gap-5 h-1/2">
                            {/* Peers Card */}
                            <div className="bg-[#1E1E1E] rounded-xl p-5 border border-gray-800/50 flex flex-col justify-center items-center text-center shadow-sm">
                                <div className="w-11 h-11 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#F7931A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Peers</h3>
                                <span className="text-4xl font-bold text-white mt-2">{peers}</span>
                                <span className="text-[10px] text-green-500 mt-3 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full">
                                    <span className="w-1 h-1 bg-green-500 rounded-full mr-1.5 animate-pulse"></span> ACTIVE
                                </span>
                            </div>

                            {/* Storage Card */}
                            <div className="bg-[#1E1E1E] rounded-xl p-5 border border-gray-800/50 flex flex-col justify-between shadow-sm">
                                <div>
                                    <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">Storage Info</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">Pruned Mode</span>
                                            <span className="text-green-500 font-bold font-mono text-xs">{pruned}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">Target Size</span>
                                            <span className="text-white font-mono text-xs">20 GB</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-800/50 text-center">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Disk Usage</span>
                                    <div className="text-lg font-bold font-mono text-[#F7931A] mt-1">
                                        {blocks > 0 ? (((chainInfo?.size_on_disk || 0) / 1024 / 1024 / 1024).toFixed(2) + " GB") : "--"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: System Log */}
                        <div className="h-1/2 bg-[#0d0d0d] rounded-xl p-5 font-mono text-[11px] border border-gray-800 overflow-hidden relative shadow-inner">
                            <div className="absolute top-4 right-5 text-gray-700 uppercase text-[10px] tracking-widest font-sans flex items-center">
                                <span className="w-2 h-2 bg-gray-800 rounded-full mr-2"></span>
                                System Log
                            </div>
                            <div className="overflow-y-auto h-full text-gray-500 space-y-2 pr-1 custom-scrollbar pt-6">
                                {errorInfo && <div className="text-red-700 bg-red-900/10 p-2 rounded border border-red-900/20 flex items-start">
                                    <span className="mr-2">✕</span>
                                    <span>{errorInfo}</span>
                                </div>}
                                {!running && <div className="text-gray-700 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-800 rounded-full mr-3"></span>
                                    Waiting for node start...
                                </div>}
                                {running && !chainInfo && <div className="text-blue-700 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-blue-900 rounded-full mr-3 animate-pulse"></span>
                                    Establishing RPC connection...
                                </div>}
                                {chainInfo && (
                                    <>
                                        <div className="text-green-800 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-green-900 rounded-full mr-3"></span>
                                            Node online: block height {blocks}
                                        </div>
                                        {chainInfo.initialblockdownload && (
                                            <div className="text-orange-700/80 bg-orange-950/10 p-2 rounded border border-orange-900/10">
                                                IBD: Initial Block Download in progress. This may take some time.
                                            </div>
                                        )}
                                        <div className="text-gray-700 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-gray-800 rounded-full mr-3"></span>
                                            Verification: {(chainInfo.verificationprogress * 100).toFixed(4)}% complete
                                        </div>
                                        <div className="text-gray-800 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-gray-900 rounded-full mr-3"></span>
                                            Last update: {new Date().toLocaleTimeString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-5 border-t border-gray-800 pt-3 flex justify-between items-center text-xs text-gray-600">
                    <div>v0.2.1-alpha</div>
                    <div>Bitcoin Knots Portable (BIP110)</div>
                </footer>
            </div>
        </div>
    );
}

export default App;
