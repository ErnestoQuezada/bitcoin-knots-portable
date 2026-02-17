import { invoke } from '@tauri-apps/api/core';

// Mock Data Loader for Manual Testing
const MOCK_MODE = (import.meta as any).env.VITE_MOCK_MODE === 'true';

let mockData: any = null;

const loadMockData = async () => {
    if (!mockData) {
        try {
            const response = await fetch('/mock_data.json'); // Served from public folder or similar
            mockData = await response.json();
        } catch (e) {
            console.warn("Failed to load mock data, using fallback", e);
            mockData = {
                getblockchaininfo: { blocks: 1000, headers: 1000, verificationprogress: 0.5 },
                getnetworkinfo: { connections: 8 },
                fee_estimates: { "2": 50, "6": 40, "144": 10 }
            };
        }
    }
    return mockData;
};

export const startNode = async (): Promise<any> => {
    if (MOCK_MODE) { console.log("MOCK: startNode"); return { running: true, pid: 1234, message: "Mock Started" }; }
    return invoke('start_node');
};

export const stopNode = async (): Promise<any> => {
    if (MOCK_MODE) { console.log("MOCK: stopNode"); return "Stopped"; }
    return invoke('stop_node');
};

export const fetchBlockchainInfo = async (): Promise<any> => {
    if (MOCK_MODE) {
        const data = await loadMockData();
        return data.getblockchaininfo;
    }
    return invoke('get_blockchain_info');
};

export const fetchNetworkInfo = async (): Promise<any> => {
    if (MOCK_MODE) {
        const data = await loadMockData();
        return data.getnetworkinfo;
    }
    return invoke('get_network_info');
};



export const checkMempool = async (query: string): Promise<string> => {
    if (MOCK_MODE) {
        const data = await loadMockData();
        return data.check_mempool_result || "Mock Result";
    }
    return invoke('check_mempool', { query });
};

export const closeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { console.log("MOCK: closeWindow"); return; }
    return invoke('close_window');
};

export const minimizeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { console.log("MOCK: minimizeWindow"); return; }
    return invoke('minimize_window');
};

export const maximizeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { console.log("MOCK: maximizeWindow"); return; }
    return invoke('maximize_window');
};

export const fetchFeeEstimates = async (): Promise<Record<string, number>> => {
    if (MOCK_MODE) {
        const data = await loadMockData();
        return data.fee_estimates;
    }
    return invoke('get_fee_estimates');
};

export const getNodeLog = async (): Promise<string> => {
    if (MOCK_MODE) return "MOCK LOG: Node is running in test mode.\nBlock verification progress: 99.9%";
    return invoke('get_node_log');
};
