#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, Emitter, AppHandle, State};
use std::process::{Command, Child, Stdio};
use std::fs::File;
use std::sync::{Mutex, Arc};
use std::path::{PathBuf};
use bitcoincore_rpc::{Auth, Client, RpcApi, json};
use std::str::FromStr;
use serde::{Serialize};
use std::io::{BufReader, BufRead, Write, Read}; // Added Reader/Writer traits
use std::fs::OpenOptions; // For append mode

// --- State Management ---

struct NodeState {
    process: Mutex<Option<Child>>,
    rpc_client: Mutex<Option<Arc<Client>>>,
}

#[derive(Serialize)]
struct StatusResponse {
    running: bool,
    pid: Option<u32>,
    message: String,
}

// --- Path Utilities ---

fn get_app_root(app: &AppHandle) -> PathBuf {
    #[cfg(mobile)]
    { app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from(".")) }
    #[cfg(not(mobile))]
    {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."))
    }
}

fn get_data_dir(app: &AppHandle) -> PathBuf {
    get_app_root(app).join("data")
}

// --- RPC Client Helper ---

fn initialize_rpc_client(state: &NodeState, app: &AppHandle) -> Result<Arc<Client>, String> {
    let mut client_guard = state.rpc_client.lock().map_err(|_| "Lock error")?;
    
    if let Some(client) = &*client_guard {
        return Ok(Arc::clone(client));
    }

    let data_dir = get_data_dir(app);
    let cookie_path = data_dir.join(".cookie");
    
    if !cookie_path.exists() {
        return Err("Cookie not found. Node initializing?".into());
    }
    
    let rpc_url = "http://127.0.0.1:8332";
    let auth = Auth::CookieFile(cookie_path);
    let client = Client::new(rpc_url, auth).map_err(|e| format!("RPC Error: {}", e))?;
    
    let arc_client = Arc::new(client);
    *client_guard = Some(Arc::clone(&arc_client));
    
    Ok(arc_client)
}

// --- Log Buffering ---

fn spawn_buffered_logger<R: Read + Send + 'static>(input: R, path: PathBuf) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(input);
        let mut buffer = Vec::new();
        let mut last_flush = std::time::Instant::now();
        
        // Open file in append mode.
        let mut file = match OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path) {
                Ok(f) => f,
                Err(_) => return, // Fail silently if log file can't be opened
            };

        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    buffer.push(line.clone());
                    
                    // Flush condition: 50 lines or 5 seconds
                    if buffer.len() >= 50 || last_flush.elapsed().as_secs() >= 5 {
                        for l in &buffer {
                            let _ = file.write_all(l.as_bytes());
                        }
                        let _ = file.flush();
                        buffer.clear();
                        last_flush = std::time::Instant::now();
                    }
                }
                Err(_) => break,
            }
        }
        
        // Final flush on exit
        for l in &buffer {
            let _ = file.write_all(l.as_bytes());
        }
        let _ = file.flush();
    });
}


#[tauri::command]
fn start_node(app: AppHandle, state: State<NodeState>) -> Result<StatusResponse, String> {
    let mut process_guard = state.process.lock().map_err(|_| "Lock error")?;
    
    if process_guard.is_some() {
        return Ok(StatusResponse { running: true, pid: None, message: "Running".into() });
    }

    let root = get_app_root(&app);
    let bin_path_candidates = [
        root.join("bin/bitcoind.exe"),
        root.join("bin/bitcoind"),
    ];
    
    let bin_path = bin_path_candidates.iter()
        .find(|p| p.exists())
        .ok_or("bitcoind not found.")?;

    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    
    let conf_path = data_dir.join("bitcoin.conf");
    if !conf_path.exists() {
         let config = "server=1\ntxindex=0\nprune=20000\nrpcbind=127.0.0.1\nrpcallowip=127.0.0.1\nshrinkdebugfile=1\nlisten=0\ndisablewallet=1\nupnp=0\nnatpmp=0\nrest=0\n";
         std::fs::write(&conf_path, config).map_err(|e| e.to_string())?;
    }
    
    // Delete stale cookie file to force new authentication
    let cookie_path = data_dir.join(".cookie");
    if cookie_path.exists() {
        let _ = std::fs::remove_file(cookie_path);
    }

    let log_path = data_dir.join("node.log");
    // Create/Truncate log file
    let _ = File::create(&log_path).map_err(|e| format!("Log create failed: {}", e))?;

    let mut cmd = Command::new(bin_path);
    cmd.arg(format!("-datadir={}", data_dir.to_string_lossy()))
       .arg(format!("-conf={}", conf_path.to_string_lossy()))
       // Optimization to reduce resource usage & Antimalware triggers
       .arg("-dbcache=450")      // Increase memory cache to reduce disk I/O (flush less often)
       .arg("-maxconnections=40") // Reduce network noise
       .arg("-par=2")            // Limit verification threads
       .arg("-printtoconsole")   // Output to stdout for buffering
       .stdout(Stdio::piped())   // Capture stdout
       .stderr(Stdio::piped());  // Capture stderr

    #[cfg(target_os = "windows")] 
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
        
        // On Windows, redirect internal debug.log to NUL to prevent double-writing
        cmd.arg("-debuglogfile=NUL");
    }

    let mut child = cmd.spawn().map_err(|e| format!("Spawn failed: {}", e))?;
    
    // Spawn buffered loggers
    if let Some(stdout) = child.stdout.take() {
        spawn_buffered_logger(stdout, log_path.clone());
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_buffered_logger(stderr, log_path); // Log stderr to same file
    }

    let pid = child.id();
    *process_guard = Some(child);

    if let Ok(mut rpc_guard) = state.rpc_client.lock() { *rpc_guard = None; }

    Ok(StatusResponse { running: true, pid: Some(pid), message: "Started".into() })
}

#[tauri::command]
fn stop_node(app: AppHandle, state: State<NodeState>) -> Result<String, String> {
    if let Ok(client) = initialize_rpc_client(&state, &app) {
        let _ = client.stop();
    }

    let mut process_guard = state.process.lock().map_err(|_| "Lock error")?;
    if let Some(mut child) = process_guard.take() {
        // Wait for graceful shutdown (max 10 seconds)
        let mut killed = false;
        for _ in 0..100 {
            if let Ok(Some(_)) = child.try_wait() {
                killed = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        
        if !killed {
            let _ = child.kill();
        }
    }
    
    if let Ok(mut rpc_guard) = state.rpc_client.lock() { *rpc_guard = None; }
    Ok("Stopped".into())
}

#[tauri::command]
fn check_mempool(app: AppHandle, state: State<NodeState>, query: String) -> Result<String, String> {
    let client = initialize_rpc_client(&state, &app)?;
    let trimmed = query.trim();

    if let Ok(height) = trimmed.parse::<u64>() {
        let hash = client.get_block_hash(height).map_err(|e| e.to_string())?;
        let block = client.get_block_info(&hash).map_err(|e| e.to_string())?;
        return Ok(format!("HEIGHT: {}\nTX: {}", height, block.n_tx));
    }

    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(txid) = bitcoincore_rpc::bitcoin::Txid::from_str(trimmed) {
            if let Ok(entry) = client.get_mempool_entry(&txid) {
                return Ok(format!("MEMPOOL\nFees: {} sats", entry.fees.base.to_sat()));
            }
        }
    }

    Ok("Not found.".into())
}

#[tauri::command]
fn get_blockchain_info(app: AppHandle, state: State<NodeState>) -> Result<json::GetBlockchainInfoResult, String> {
    let client = initialize_rpc_client(&state, &app)?;
    client.get_blockchain_info().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_network_info(app: AppHandle, state: State<NodeState>) -> Result<json::GetNetworkInfoResult, String> {
    let client = initialize_rpc_client(&state, &app)?;
    client.get_network_info().map_err(|e| e.to_string())
}



#[tauri::command]
fn get_fee_estimates(app: AppHandle, state: State<NodeState>) -> Result<std::collections::HashMap<String, u64>, String> {
    let client = initialize_rpc_client(&state, &app)?;
    let mut results = std::collections::HashMap::new();
    for &target in &[2, 6, 144] {
        if let Ok(fee) = client.estimate_smart_fee(target, None) {
             let sat_vb = fee.fee_rate
                 .map(|amount| (amount.to_sat() as f64 / 1000.0).round() as u64)
                 .unwrap_or(0);
             results.insert(target.to_string(), sat_vb);
        }
    }
    Ok(results)
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    #[cfg(not(mobile))]
    {
        window.close().map_err(|e| e.to_string())
    }
    #[cfg(mobile)]
    {
        let _ = window;
        Ok(())
    }
}

#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
    #[cfg(not(mobile))]
    {
        window.minimize().map_err(|e| e.to_string())
    }
    #[cfg(mobile)]
    {
        let _ = window;
        Ok(())
    }
}

#[tauri::command]
fn maximize_window(window: tauri::Window) -> Result<(), String> {
    #[cfg(not(mobile))]
    {
        if window.is_maximized().unwrap_or(false) {
            window.unmaximize().map_err(|e: tauri::Error| e.to_string())
        } else {
            window.maximize().map_err(|e: tauri::Error| e.to_string())
        }
    }
    #[cfg(mobile)]
    {
        let _ = window;
        Ok(())
    }
}

#[tauri::command]
fn get_node_log(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let log_path = data_dir.join("node.log");
    
    if log_path.exists() {
        let content = std::fs::read_to_string(log_path).map_err(|e| e.to_string())?;
        let len = content.len();
        if len > 5000 {
            Ok(content[len-5000..].to_string())
        } else {
            Ok(content)
        }
    } else {
        Ok("Log file not found.".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NodeState { 
            process: Mutex::new(None),
            rpc_client: Mutex::new(None)
        })
        .invoke_handler(tauri::generate_handler![
            start_node,
            stop_node, 
            get_blockchain_info, 
            get_network_info,
            check_mempool,
            get_fee_estimates,
            close_window,
            minimize_window,
            maximize_window,
            get_node_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
