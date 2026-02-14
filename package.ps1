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

# 1. Clean previous build
if (Test-Path "release") {
    Remove-Item "release" -Recurse -Force
}
New-Item -ItemType Directory -Force -Path "release" | Out-Null
New-Item -ItemType Directory -Force -Path "release/bin" | Out-Null

# 2. Build Tauri App
write-host "Compiling Rust & React..." -ForegroundColor Green
$build = Start-Process -FilePath "npm.cmd" -ArgumentList "run tauri build" -Wait -PassThru -NoNewWindow
if ($build.ExitCode -ne 0) {
    write-error "Build failed."
    exit 1
}

# 3. Copy Binary
write-host "Copying Executable..." -ForegroundColor Green
Copy-Item "src-tauri/target/release/bitcoin-portable.exe" "release/"

# 4. Copy Bitcoind (if exits)
if (Test-Path "bin/bitcoind.exe") {
    write-host "Bundling bitcoind.exe..." -ForegroundColor Green
    Copy-Item "bin/bitcoind.exe" "release/bin/"
}
else {
    write-warning "bitcoind.exe NOT FOUND in local bin/ folder."
    write-warning "You must place bitcoind.exe in release/bin/ manually."
}

# 5. Copy Readme
Copy-Item "README_DIST.txt" "release/README.txt"

write-host "Build Complete!" -ForegroundColor Cyan
write-host "Output location: ./release"
