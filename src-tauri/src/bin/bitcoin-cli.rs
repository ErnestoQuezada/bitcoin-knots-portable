use std::env;
use std::process::Command;

fn main() {
    // 1. Get the path to this executable
    let current_exe = env::current_exe().unwrap_or_else(|e| {
        eprintln!("Error: Cannot resolve current executable path: {}", e);
        std::process::exit(1);
    });
    
    let bin_dir = current_exe.parent().unwrap_or_else(|| {
        eprintln!("Error: Cannot resolve bin directory");
        std::process::exit(1);
    });
    
    // 2. The real bitcoin-cli binary has been renamed to bitcoin-cli-original.exe
    let mut real_cli_path = bin_dir.to_path_buf();
    #[cfg(target_os = "windows")]
    real_cli_path.push("bitcoin-cli-original.exe");
    #[cfg(not(target_os = "windows"))]
    real_cli_path.push("bitcoin-cli-original");
    
    if !real_cli_path.exists() {
        eprintln!("Error: Original bitcoin-cli binary not found at {}", real_cli_path.display());
        std::process::exit(1);
    }
    
    // 3. The bitcoin.conf file is located at bin_dir/../data/bitcoin.conf
    let mut conf_path = bin_dir.to_path_buf();
    conf_path.pop(); // Go up to app root
    conf_path.push("data");
    conf_path.push("bitcoin.conf");
    
    // 4. The datadir path is bin_dir/../data
    let mut datadir_path = bin_dir.to_path_buf();
    datadir_path.pop();
    datadir_path.push("data");

    // 5. Gather all arguments
    let args: Vec<String> = env::args().skip(1).collect();

    // 6. Spawn the real bitcoin-cli with -conf and -datadir prepended, plus any other arguments
    let mut cmd = Command::new(&real_cli_path);
    cmd.arg(format!("-conf={}", conf_path.to_string_lossy()));
    cmd.arg(format!("-datadir={}", datadir_path.to_string_lossy()));
    cmd.args(&args);

    // 7. Execute and forward exit code
    match cmd.status() {
        Ok(status) => {
            if let Some(code) = status.code() {
                std::process::exit(code);
            } else {
                std::process::exit(0);
            }
        }
        Err(e) => {
            eprintln!("Error: Failed to execute original bitcoin-cli: {}", e);
            std::process::exit(1);
        }
    }
}
