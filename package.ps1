# Ensure cargo is in PATH
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    $cargoPath = Join-Path $HOME ".cargo\bin"
    if (Test-Path $cargoPath) {
        write-host "Adding $cargoPath to PATH..." -ForegroundColor Yellow
        $env:PATH = "$cargoPath;$env:PATH"
    }
    else {
        write-error "Cargo not found. Please install Rust."
        exit 1
    }
}
write-host "Building Bitcoin Portable Release..." -ForegroundColor Cyan

# 1. Prepare Release Folder (Non-destructive)
if (!(Test-Path "release")) {
    New-Item -ItemType Directory -Force -Path "release" | Out-Null
}
if (!(Test-Path "release/bin")) {
    New-Item -ItemType Directory -Force -Path "release/bin" | Out-Null
}

# 2. Build Tauri App
write-host "Compiling Rust & React..." -ForegroundColor Green
# Use --no-bundle to skip installer creation (NSIS/WiX)
$build = Start-Process -FilePath "npm.cmd" -ArgumentList "run tauri build -- --no-bundle" -Wait -PassThru -NoNewWindow
if ($build.ExitCode -ne 0) {
    write-error "Build failed."
    exit 1
}

# 3. Copy Binary
write-host "Copying Executable..." -ForegroundColor Green
Copy-Item "src-tauri/target/release/bitcoin_portable.exe" "release/bitcoin-portable.exe"

# 4. Copy Bitcoind (Skipped as per user request: 'only bitcoin-portable.exe')
# if (Test-Path "bin/bitcoind.exe") {
#     write-host "Bundling bitcoind.exe..." -ForegroundColor Green
#     Copy-Item "bin/bitcoind.exe" "release/bin/"
# }

# 5. Copy Readme (Skipped)
# Copy-Item "README_DIST.txt" "release/README.txt"

write-host "Build Complete!" -ForegroundColor Cyan
write-host "Output location: ./release"
