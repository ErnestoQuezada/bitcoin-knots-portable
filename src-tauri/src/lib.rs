#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{AppHandle, State};
use std::process::{Command, Child, Stdio};
use std::fs::File;
use std::sync::{Mutex, Arc};
use std::path::{PathBuf};
use bitcoincore_rpc::{Auth, Client, RpcApi, json};
use serde::{Serialize};
use std::io::{BufReader, BufRead, Write, Read}; 
use std::fs::OpenOptions; 

// --- State Management ---

struct NodeState {
    process: Mutex<Option<Child>>,
    tor_process: Mutex<Option<Child>>,
    rpc_client: Mutex<Option<Arc<Client>>>,
}

#[derive(Serialize)]
struct StatusResponse {
    running: bool,
    pid: Option<u32>,
    message: String,
}

#[derive(Serialize)]
struct PeerInfoRaw {
    id: u64,
    addr: String,
    subver: String,
    inbound: bool,
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

// --- Windows Security Helper ---

#[cfg(target_os = "windows")]
fn unblock_file(path: &std::path::Path) {
    if let Some(path_str) = path.to_str() {
        let ads_path = format!("{}:Zone.Identifier", path_str);
        let ads_path_buf = std::path::PathBuf::from(ads_path);
        if ads_path_buf.exists() {
            let _ = std::fs::remove_file(ads_path_buf);
        }
    }
}

// --- RPC Client Helper ---

fn get_rpc_credentials_from_conf(app: &AppHandle) -> Option<(String, String)> {
    let data_dir = get_data_dir(app);
    let conf_path = data_dir.join("bitcoin.conf");
    if !conf_path.exists() {
        return None;
    }
    
    let file = File::open(&conf_path).ok()?;
    let reader = BufReader::new(file);
    let mut username = None;
    let mut password = None;
    
    for line in reader.lines() {
        if let Ok(line) = line {
            let trimmed = line.trim();
            if trimmed.starts_with("rpcuser=") {
                if let Some(val) = trimmed.split('=').nth(1) {
                    let val = val.trim();
                    if !val.is_empty() {
                        username = Some(val.to_string());
                    }
                }
            }
            if trimmed.starts_with("rpcpassword=") {
                if let Some(val) = trimmed.split('=').nth(1) {
                    let val = val.trim();
                    if !val.is_empty() {
                        password = Some(val.to_string());
                    }
                }
            }
        }
    }
    
    match (username, password) {
        (Some(u), Some(p)) => Some((u, p)),
        _ => None,
    }
}

fn initialize_rpc_client(state: &NodeState, app: &AppHandle) -> Result<Arc<Client>, String> {
    let mut client_guard = state.rpc_client.lock().map_err(|_| "Lock error")?;
    
    if let Some(client) = &*client_guard {
        return Ok(Arc::clone(client));
    }

    let data_dir = get_data_dir(app);
    let rpc_url = "http://127.0.0.1:8332";
    
    let auth = if let Some((u, p)) = get_rpc_credentials_from_conf(app) {
        Auth::UserPass(u, p)
    } else {
        let cookie_path = data_dir.join(".cookie");
        if !cookie_path.exists() {
            return Err("Cookie not found. Node initializing?".into());
        }
        Auth::CookieFile(cookie_path)
    };

    let client = Client::new(rpc_url, auth).map_err(|e| format!("RPC Error: {}", e))?;
    
    let arc_client = Arc::new(client);
    *client_guard = Some(Arc::clone(&arc_client));
    
    Ok(arc_client)
}

#[tauri::command]
fn check_rpc_credentials_set(app: AppHandle) -> Result<bool, String> {
    Ok(get_rpc_credentials_from_conf(&app).is_some())
}

#[tauri::command]
fn set_rpc_credentials(app: AppHandle, username: String, password: String) -> Result<(), String> {
    let u = username.trim();
    let p = password.trim();
    if u.is_empty() || p.is_empty() {
        return Err("Username and password cannot be empty".into());
    }

    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    
    let conf_path = data_dir.join("bitcoin.conf");
    let config_content = if conf_path.exists() {
        std::fs::read_to_string(&conf_path).map_err(|e| e.to_string())?
    } else {
        r#"# --- Core ---
server=1
listen=1
discover=1
disablewallet=1
shrinkdebugfile=1
upnp=1
natpmp=1
rest=0

# --- Pruning ---
prune=5000

# --- Indexing ---
txindex=0

# --- Network ---
maxconnections=60
listenonion=1
proxy=127.0.0.1:9050

# --- Performance (Tailored for 8GB RAM) ---
dbcache=600
par=6
assumevalid=0000000000000000000096695346030999516627632970799440621115809669

# --- Mempool ---
maxmempool=150

# --- Security & RPC ---
rpcbind=127.0.0.1
rpcallowip=127.0.0.1

# --- Knots Policy ---
permitbaremultisig=0
datacarrier=1
datacarriersize=80
rejecttokens=1
"#.to_string()
    };

    let mut lines: Vec<String> = config_content
        .lines()
        .map(|line| line.to_string())
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.starts_with("rpcuser=") && !trimmed.starts_with("rpcpassword=")
        })
        .collect();

    lines.push(format!("rpcuser={}", u));
    lines.push(format!("rpcpassword={}", p));

    let new_content = lines.join("\n") + "\n";
    std::fs::write(&conf_path, new_content).map_err(|e| e.to_string())?;

    Ok(())
}


// --- Log Buffering ---

fn spawn_buffered_logger<R: Read + Send + 'static>(input: R, path: PathBuf) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(input);
        let mut buffer = Vec::new();
        let mut last_flush = std::time::Instant::now();
        
        let mut file = match OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path) {
                Ok(f) => f,
                Err(_) => return, 
            };

        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, 
                Ok(_) => {
                    buffer.push(line.clone());
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
        for l in &buffer {
            let _ = file.write_all(l.as_bytes());
        }
        let _ = file.flush();
    });
}


#[tauri::command]
async fn start_node(app: AppHandle, state: State<'_, NodeState>) -> Result<StatusResponse, String> {
    let mut process_guard = state.process.lock().map_err(|_| "Lock error")?;
    let mut tor_guard = state.tor_process.lock().map_err(|_| "Lock error")?;
    
    if process_guard.is_some() {
        return Ok(StatusResponse { running: true, pid: None, message: "Running".into() });
    }

    // --- Kill existing instances to prevent lock errors ---
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "bitcoind.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("killall")
            .arg("bitcoind")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }

    let root = get_app_root(&app);
    let bin_path_candidates = [
        root.join("bin/bitcoind.exe"),
        root.join("bin/bitcoind"),
    ];
    
    let bin_path = bin_path_candidates.iter()
        .find(|p| p.exists())
        .ok_or("bitcoind not found.")?;

    let tor_path = root.join("bin/tor.exe");

    // Automatically unblock the binaries on Windows if they have Mark of the Web
    #[cfg(target_os = "windows")]
    {
        unblock_file(bin_path);
        if tor_path.exists() {
            unblock_file(&tor_path);
        }
    }

    let data_dir = get_data_dir(&app);
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }

    let tor_data_dir = data_dir.join("tor_data");
    if !tor_data_dir.exists() {
        std::fs::create_dir_all(&tor_data_dir).map_err(|e| e.to_string())?;
    }
    
    let conf_path = data_dir.join("bitcoin.conf");
    if !conf_path.exists() {
          let config = r#"# --- Core ---
server=1
listen=1
discover=1
disablewallet=1
shrinkdebugfile=1
upnp=1
natpmp=1
rest=0

# --- Pruning ---
prune=5000

# --- Indexing ---
txindex=0

# --- Network ---
maxconnections=60
listenonion=1
proxy=127.0.0.1:9050

# --- Performance (Tailored for 8GB RAM) ---
dbcache=600
par=6
assumevalid=0000000000000000000096695346030999516627632970799440621115809669

# --- Mempool ---
maxmempool=150

# --- Security & RPC ---
rpcbind=127.0.0.1
rpcallowip=127.0.0.1

# --- Knots Policy ---
permitbaremultisig=0
datacarrier=1
datacarriersize=80
rejecttokens=1
"#;
         std::fs::write(&conf_path, config).map_err(|e| e.to_string())?;
    }

    // --- Start Tor Process ---
    if tor_guard.is_none() && tor_path.exists() {
        let mut tor_cmd = Command::new(&tor_path);
        tor_cmd.arg("--SocksPort").arg("127.0.0.1:9050")
               .arg("--ControlPort").arg("127.0.0.1:9051")
               .arg("--DataDirectory").arg(tor_data_dir.to_string_lossy().to_string())
               .arg("--CookieAuthentication").arg("1")
               .stdout(Stdio::null())
               .stderr(Stdio::null());

        #[cfg(target_os = "windows")] 
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            tor_cmd.creation_flags(CREATE_NO_WINDOW);
        }

        match tor_cmd.spawn() {
            Ok(child) => { *tor_guard = Some(child); }
            Err(e) => { println!("Failed to start Tor: {}", e); }
        }
    }
    
    let cookie_path = data_dir.join(".cookie");
    if cookie_path.exists() {
        let _ = std::fs::remove_file(cookie_path);
    }

    let log_path = data_dir.join("node.log");
    let _ = File::create(&log_path).map_err(|e| format!("Log create failed: {}", e))?;

    let mut cmd = Command::new(bin_path);

    cmd.arg(format!("-datadir={}", data_dir.to_string_lossy()))
       .arg(format!("-conf={}", conf_path.to_string_lossy()))
       .arg("-listenonion=1")
       .arg("-discover=1")
       .arg("-proxy=127.0.0.1:9050")
       .arg("-torcontrol=127.0.0.1:9051")
       .arg("-printtoconsole")   
       .stdout(Stdio::piped())   
       .stderr(Stdio::piped());  

    #[cfg(target_os = "windows")] 
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const DETACHED_PROCESS: u32 = 0x00000008;
        cmd.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS);
        cmd.arg("-debuglogfile=NUL");
    }

    let mut child = cmd.spawn().map_err(|e| format!("Spawn failed: {}", e))?;
    
    if let Some(stdout) = child.stdout.take() {
        spawn_buffered_logger(stdout, log_path.clone());
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_buffered_logger(stderr, log_path); 
    }

    let pid = child.id();
    *process_guard = Some(child);

    if let Ok(mut rpc_guard) = state.rpc_client.lock() { *rpc_guard = None; }

    Ok(StatusResponse { running: true, pid: Some(pid), message: "Started".into() })
}

#[tauri::command]
async fn stop_node(app: AppHandle, state: State<'_, NodeState>) -> Result<String, String> {
    if let Ok(client) = initialize_rpc_client(&state, &app) {
        let _ = client.stop();
    }

    let mut process_guard = state.process.lock().map_err(|_| "Lock error")?;
    if let Some(mut child) = process_guard.take() {
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

    // Stop Tor too
    let mut tor_guard = state.tor_process.lock().map_err(|_| "Lock error")?;
    if let Some(mut child) = tor_guard.take() {
        let _ = child.kill();
    }
    
    if let Ok(mut rpc_guard) = state.rpc_client.lock() { *rpc_guard = None; }
    Ok("Stopped".into())
}

#[tauri::command]
fn get_peer_info(app: AppHandle, state: State<NodeState>) -> Result<Vec<PeerInfoRaw>, String> {
    let client = initialize_rpc_client(&state, &app)?;
    let peers = client.get_peer_info().map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for p in peers {
        out.push(PeerInfoRaw {
            id: p.id as u64,
            addr: p.addr.clone(),
            subver: p.subver.clone(),
            inbound: p.inbound,
        });
    }
    Ok(out)
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
fn add_node(app: AppHandle, state: State<NodeState>, addr: String) -> Result<(), String> {
    let client = initialize_rpc_client(&state, &app)?;
    client.add_node(&addr).map_err(|e| e.to_string())
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
            tor_process: Mutex::new(None),
            rpc_client: Mutex::new(None)
        })
        .invoke_handler(tauri::generate_handler![
            start_node,
            stop_node, 
            get_blockchain_info, 
            get_network_info,
            get_peer_info,
            add_node,
            close_window,
            minimize_window,
            maximize_window,
            get_node_log,
            check_rpc_credentials_set,
            set_rpc_credentials
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
