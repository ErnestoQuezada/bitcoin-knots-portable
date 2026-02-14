import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export const startNode = async (): Promise<any> => {
    // If we call 'start_node' and it's already running, it returns current running status immediately?
    // Let's rely on that or error.
    return invoke('start_node');
};

export const stopNode = async (): Promise<any> => {
    return invoke('stop_node');
};

export const fetchBlockchainInfo = async (): Promise<any> => {
    const jsonStr = await invoke('get_blockchain_info') as string;
    return JSON.parse(jsonStr);
};

export const fetchNetworkInfo = async (): Promise<any> => {
    const jsonStr = await invoke('get_network_info') as string;
    return JSON.parse(jsonStr);
};

export const checkMempool = async (query: string): Promise<string> => {
    return invoke('check_mempool', { query });
};

export const closeWindow = async (): Promise<void> => {
    return invoke('close_window');
};

export const minimizeWindow = async (): Promise<void> => {
    return invoke('minimize_window');
};

export const maximizeWindow = async (): Promise<void> => {
    return invoke('maximize_window');
};

export const fetchFeeEstimates = async (): Promise<any> => {
    const jsonStr = await invoke('get_fee_estimates') as string;
    return JSON.parse(jsonStr);
};
