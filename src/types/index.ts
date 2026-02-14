export interface NodeInfo {
    running: boolean;
    pid: number | null;
    message: string;
}

export interface BlockchainInfo {
    chain: string;
    blocks: number;
    headers: number;
    bestblockhash: string;
    difficulty: number;
    mediantime: number;
    verificationprogress: number;
    initialblockdownload: boolean;
    chainwork: string;
    size_on_disk: number;
    pruned: boolean;
    pruneheight?: number;
    automatic_pruning?: boolean;
    prune_target_size?: number;
    warnings: string;
}

export interface NetworkInfo {
    version: number;
    subversion: string;
    protocolversion: number;
    connections: number;
    networkactive: boolean;
    networks: any[]; // simplified for now
    relayfee: number;
    incrementalfee: number;
    localaddresses: any[];
    warnings: string;
}

export interface AppState {
    nodeInfo: NodeInfo | null;
    blockchainInfo: BlockchainInfo | null;
    networkInfo: NetworkInfo | null;
    loading: boolean;
    error: string | null;
}
