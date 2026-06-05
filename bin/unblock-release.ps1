# PowerShell script to recursively remove the "Mark of the Web" from all files in the release directory.

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$releasePath = Resolve-Path (Join-Path $scriptPath "..\release") -ErrorAction SilentlyContinue

if (-not $releasePath) {
    # Fallback to current directory release folder
    $releasePath = Resolve-Path "release" -ErrorAction SilentlyContinue
}

if ($releasePath -and (Test-Path $releasePath)) {
    Write-Host "Scanning for files to unblock in: $releasePath" -ForegroundColor Cyan
    $unblockedCount = 0
    
    Get-ChildItem -Path $releasePath -Recurse | ForEach-Object {
        $filePath = $_.FullName
        if (Test-Path $filePath -PathType Leaf) {
            # Check if the file has the Zone.Identifier alternate data stream
            if (Get-Item -Path $filePath -Stream "Zone.Identifier" -ErrorAction SilentlyContinue) {
                Write-Host "Unblocking: $_" -ForegroundColor Yellow
                Unblock-File -Path $filePath
                $unblockedCount++
            }
        }
    }
    
    if ($unblockedCount -gt 0) {
        Write-Host "Successfully unblocked $unblockedCount file(s) in the release folder." -ForegroundColor Green
    } else {
        Write-Host "No blocked files with 'Mark of the Web' metadata were found. The files are already unblocked." -ForegroundColor Green
    }
} else {
    Write-Error "Release directory not found. Please ensure the script is run from the project root or the bin directory."
}
