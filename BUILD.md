# Build Instructions for Bitcoin Portable

This guide details how to build the `bitcoin-portable` application from source for Windows.

## Prerequisites

1.  **Node.js**: Version 18 or later.
2.  **Rust**: Stable channel (install via [rustup.rs](https://rustup.rs)).
3.  **Visual Studio C++ Build Tools**: Required for Rust compilation on Windows.

## Manual Build Steps

1.  **Install Frontend Dependencies**:
    ```powershell
    npm install
    ```

2.  **Build the Application**:
    This will compile the Rust backend and build the React frontend.
    ```powershell
    npm run tauri build
    ```
    *Note: This command produces an executable in `src-tauri/target/release/bitcoin-portable.exe`.*

3.  **Prepare Distribution Folder**:
    *   Create a new folder, e.g., `dist/`.
    *   Copy `src-tauri/target/release/bitcoin-portable.exe` to `dist/`.
    *   Create a `bin/` folder inside `dist/`.
    *   **CRITICAL**: Place the verified `bitcoind.exe` (Bitcoin Knots v29.2+bip110) into `dist/bin/`.

4.  **Run**:
    Double-click `bitcoin-portable.exe` in the `dist/` folder.

## Automated Packaging (PowerShell)

A helper script `package.ps1` is provided to automate this process.

1.  **Run the Script**:
    ```powershell
    powershell -ExecutionPolicy Bypass -File package.ps1
    ```

2.  **Output**:
    The script will create a `release/` folder containing the fully packaged application, ready to be zipped.

## Verification

To verify the build is deterministic (portability check):
1.  Move the `release` folder to a USB drive.
2.  Connect to a different PC.
3.  Run `bitcoin-portable.exe`.
4.  Ensure `data/` folder is created on the USB drive, not in `%APPDATA%`.
