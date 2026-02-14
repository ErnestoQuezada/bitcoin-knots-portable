#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, WindowEvent};
use std::process::{Command, Child};
use std::sync::Mutex;
use std::path::PathBuf;
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::str::FromStr;

struct NodeState {
    process: Mutex<Option<Child>>,
}

#[derive(serde::Serialize)]
struct StatusResponse {
    running: bool,
    pid: Option<u32>,
    message: String,
}

fn get_app_root() -> PathBuf {
    std::env::current_exe()
        .map(|p| p.parent().unwrap().to_path_buf())
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn get_data_dir() -> PathBuf {
    get_app_root().join("data")
}

fn get_rpc_client() -> Result<Client, String> {
    let data_dir = get_data_dir();
    // Default mainnet cookie location: data_dir/.cookie
    let cookie_path = data_dir.join(".cookie");
    if !cookie_path.exists() {
        return Err("Cookie file not found. Node might be initializing.".into());
    }
    
    let rpc_url = "http://127.0.0.1:8332";
    let auth = Auth::CookieFile(cookie_path);
    Client::new(rpc_url, auth).map_err(|e| format!("RPC Client Error: {}", e))
}

#[tauri::command]
fn start_node(state: tauri::State<NodeState>) -> Result<StatusResponse, String> {
    // 1. Validation Check
    if !validate_knots_internal().unwrap_or(false) {
        return Err("MALWARE_DETECTED".into());
    }

    let mut process_guard = state.process.lock().map_err(|_| "Lock error")?;
    
    // Check if already running via PID check or RPC check
    if process_guard.is_some() {
        return Ok(StatusResponse { running: true, pid: None, message: "Already starting/running".into() });
    }

    let root = get_app_root();
    // Logic to find binary
    let bin_path_candidates = vec![
        root.join("bin/bitcoind.exe"),
        PathBuf::from("bin/bitcoind.exe"),
        root.join("bin/bitcoind"), // Fallback for linux/mac if testing
    ];
    
    let bin_path = bin_path_candidates.into_iter().find(|p| p.exists())
        .ok_or("bitcoind binary not found. Please place it in /bin folder.")?;

    let data_dir = get_data_dir();
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    
    let conf_path = data_dir.join("bitcoin.conf");
    if !conf_path.exists() {
         let config = "server=1\ntxindex=0\nprune=20000\nrpcbind=127.0.0.1\nrpcallowip=127.0.0.1\nshrinkdebugfile=1\nlisten=0\ndisablewallet=1\nupnp=0\nnatpmp=0\nrest=0\n";
         std::fs::write(&conf_path, config).map_err(|e| e.to_string())?;
    }

    // Spawn
    let mut cmd = Command::new(bin_path);
    cmd.arg(format!("-datadir={}", data_dir.to_string_lossy()))
       .arg(format!("-conf={}", conf_path.to_string_lossy()));

    #[cfg(target_os = "windows")] 
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn: {}", e))?;
    let pid = child.id();
    *process_guard = Some(child);

    Ok(StatusResponse {
        running: true,
        pid: Some(pid),
        message: "Node process started".into()
    })
}

#[tauri::command]
fn stop_node(state: tauri::State<NodeState>) -> Result<String, String> {
    // Attempt RPC stop first
    if let Ok(client) = get_rpc_client() {
        if let Ok(_) = client.stop() {
             return Ok("Stop command sent via RPC".into());
        }
    }

    // Fallback to killing process
    let mut process_guard = state.process.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
        return Ok("Node process killed (RPC unreachable)".into());
    }
    
    Ok("Node was not running internally".into() )
}

fn validate_knots_internal() -> Result<bool, String> {
    let root = get_app_root();
    let bin_path_candidates = vec![
        root.join("bin/bitcoind.exe"),
        PathBuf::from("bin/bitcoind.exe"),
    ];
    
    let bin_path = bin_path_candidates.into_iter().find(|p| p.exists());
    if bin_path.is_none() { return Ok(false); }

    let output = Command::new(bin_path.unwrap())
        .arg("-version")
        .output()
        .map_err(|e| format!("Failed to run bitcoind: {}", e))?;

    let version_str = String::from_utf8_lossy(&output.stdout);
    Ok(version_str.contains("Knots"))
}

#[tauri::command]
fn check_mempool(query: String) -> Result<String, String> {
    let client = get_rpc_client()?;
    let trimmed = query.trim();

    // 1. Check if numeric (Block Height)
    if let Ok(height) = trimmed.parse::<u64>() {
        match client.get_block_hash(height) {
            Ok(hash) => {
                match client.get_block_info(&hash) {
                    Ok(block) => {
                        return Ok(format!("BLOCK HEIGHT: {}\nHash: {}\nTime: {}\nTX Count: {}\nConfirmations: {}\nWeight: {}", 
                            height, hash, block.time, block.n_tx, block.confirmations, block.weight));
                    },
                    Err(_) => return Ok(format!("Found hash: {}\nFull info unavailable.", hash)),
                }
            },
            Err(_) => return Ok(format!("Block height {} not found.", height)),
        }
    }

    // 2. Check if 64 hex characters (TXID or Block Hash)
    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        // Try as TXID first
        if let Ok(txid) = bitcoincore_rpc::bitcoin::Txid::from_str(trimmed) {
            if let Ok(entry) = client.get_mempool_entry(&txid) {
                return Ok(format!("IN MEMPOOL (Unconfirmed)\nTXID: {}\nFees: {} sats\nSize: {} bytes\nWeight: {:?}\nTime: {}", 
                    trimmed, entry.fees.base.to_sat(), entry.vsize, entry.weight.unwrap_or(0), entry.time));
            }
            
            if let Ok(tx) = client.get_raw_transaction_info(&txid, None) {
                let status = if tx.confirmations.is_some() { "CONFIRMED" } else { "IN MEMPOOL" };
                return Ok(format!("{}\nTXID: {}\nBlock: {}\nConfirmations: {}\nTime: {}", 
                    status, trimmed, tx.blockhash.map(|h| h.to_string()).unwrap_or("N/A".into()), tx.confirmations.unwrap_or(0), tx.time.unwrap_or(0)));
            }
        }

        // Try as Block Hash
        if let Ok(hash) = bitcoincore_rpc::bitcoin::BlockHash::from_str(trimmed) {
            if let Ok(block) = client.get_block_info(&hash) {
                 return Ok(format!("BLOCK FOUND\nHeight: {}\nHash: {}\nTime: {}\nTX Count: {}\nSize: {} bytes", 
                    block.height, trimmed, block.time, block.n_tx, block.size));
            }
        }
        
        return Ok("No record found with that identifier.".into());
    }

    // 3. Address fallback
    Ok("Direct address lookup requires an address-indexed node. Please use a TxID, Block Hash, or Height.".into())
}

// Window controls
#[tauri::command]
fn close_window(window: tauri::Window) {
    window.close().unwrap();
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    window.minimize().unwrap();
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
fn get_blockchain_info() -> Result<String, String> {
    let client = get_rpc_client()?;
    let info = client.get_blockchain_info().map_err(|e| e.to_string())?;
    serde_json::to_string(&info).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_network_info() -> Result<String, String> {
    let client = get_rpc_client()?;
    let info = client.get_network_info().map_err(|e| e.to_string())?;
    serde_json::to_string(&info).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_fee_estimates() -> Result<String, String> {
    let client = get_rpc_client()?;
    let mut results = std::collections::HashMap::new();
    
    // Check various targets
    for target in &[2, 6, 144] {
        if let Ok(fee) = client.estimate_smart_fee(*target, None) {
             // fee_rate is Option<Amount> representing BTC/kB
             let sat_vb = fee.fee_rate
                 .map(|amount| (amount.to_sat() as f64 / 1000.0).round() as u64)
                 .unwrap_or(0);
             results.insert(target.to_string(), sat_vb);
        }
    }
    
    serde_json::to_string(&results).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(NodeState { process: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            start_node, 
            stop_node, 
            get_blockchain_info, 
            get_network_info,
            check_mempool,
            close_window,
            minimize_window,
            maximize_window,
            get_fee_estimates
        ])
        .on_window_event(|event| match event.event() {
            WindowEvent::Destroyed => {
                // Attempt to cleanup process on window close
                let handle = event.window().app_handle();
                let state = handle.state::<NodeState>();
                let mut guard = state.process.lock().expect("Failed to lock node state at shutdown");
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
