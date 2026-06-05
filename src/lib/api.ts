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
            mockData = {
                getblockchaininfo: { blocks: 1000, headers: 1000, verificationprogress: 0.5 },
                getnetworkinfo: { connections: 8 },
                peerinfo: []
            };
        }
    }
    return mockData;
};

export const startNode = async (): Promise<any> => {
    if (MOCK_MODE) { return { running: true, pid: 1234, message: "Mock Started" }; }
    return invoke('start_node');
};

export const stopNode = async (): Promise<any> => {
    if (MOCK_MODE) { return "Stopped"; }
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



export const fetchPeerInfo = async (): Promise<any> => {
    if (MOCK_MODE) {
        const data = await loadMockData();
        return data.peerinfo || [];
    }
    return invoke('get_peer_info');
};

export const addNode = async (addr: String): Promise<any> => {
    if (MOCK_MODE) { return "Added"; }
    return invoke('add_node', { addr });
};

export const closeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { return; }
    return invoke('close_window');
};

export const minimizeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { return; }
    return invoke('minimize_window');
};

export const maximizeWindow = async (): Promise<void> => {
    if (MOCK_MODE) { return; }
    return invoke('maximize_window');
};



export const getNodeLog = async (): Promise<string> => {
    if (MOCK_MODE) return "MOCK LOG: Node is running in test mode.\nBlock verification progress: 99.9%";
    return invoke('get_node_log');
};

export const checkRpcCredentialsSet = async (): Promise<boolean> => {
    if (MOCK_MODE) {
        return localStorage.getItem('rpc_credentials_set') === 'true';
    }
    return invoke('check_rpc_credentials_set');
};

export const setRpcCredentials = async (username: string, password: string): Promise<any> => {
    if (MOCK_MODE) {
        if (!username.trim() || !password.trim()) {
            throw new Error("Username and password cannot be empty");
        }
        localStorage.setItem('rpc_credentials_set', 'true');
        return;
    }
    return invoke('set_rpc_credentials', { username, password });
};

