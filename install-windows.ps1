# ==============================================================================
# ⚡ SHINSEI ANIME-CLI · WINDOWS ONE-CLICK POWERSHELL INSTALLER
# Run with:
# irm https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install-windows.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host @"
  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝
"@ -ForegroundColor Yellow

Write-Host "  ⚡ Windows One-Click Installer · Next-Gen Anime Streaming CLI`n" -ForegroundColor DarkYellow

# 1. Verify Python
Write-Host "[1/5] Checking Python installation..." -ForegroundColor Cyan
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
    Write-Host "Python not found in PATH. Checking winget..." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "Installing Python 3.11 via winget..." -ForegroundColor Green
        & winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
        # Refresh PATH in current session
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $python = Get-Command python -ErrorAction SilentlyContinue
    }
    
    if (-not $python) {
        Write-Host "Please install Python 3.9+ from https://www.python.org/downloads/ and check 'Add python.exe to PATH'." -ForegroundColor Red
        Exit 1
    }
}
Write-Host "Found Python: $($python.Source)" -ForegroundColor Green

# 2. Setup Directory & Clone/Download
$installDir = Join-Path $env:USERPROFILE ".anime-cli"
Write-Host "`n[2/5] Setting up anime-cli in $installDir..." -ForegroundColor Cyan

$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
    if (Test-Path (Join-Path $installDir ".git")) {
        Write-Host "Updating existing installation via git..." -ForegroundColor Green
        Push-Location $installDir
        & git pull --ff-only
        Pop-Location
    } else {
        if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
        Write-Host "Cloning repository via git..." -ForegroundColor Green
        & git clone --depth 1 https://github.com/Hackedghost64/anime-cli.git $installDir
    }
} else {
    Write-Host "Git not found; downloading release archive from GitHub..." -ForegroundColor Yellow
    $zipPath = Join-Path $env:TEMP "anime-cli-main.zip"
    Invoke-WebRequest -Uri "https://github.com/Hackedghost64/anime-cli/archive/refs/heads/main.zip" -OutFile $zipPath
    if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
    Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
    Move-Item -Path (Join-Path $env:TEMP "anime-cli-main") -Destination $installDir
    Remove-Item -Force $zipPath
}

# 3. Install Python Dependencies
Write-Host "`n[3/5] Installing Python dependencies..." -ForegroundColor Cyan
& python -m pip install --upgrade pip --quiet
& python -m pip install -r (Join-Path $installDir "requirements.txt") --quiet

# 4. Check Video Player (MPV)
Write-Host "`n[4/5] Checking video player..." -ForegroundColor Cyan
$mpv = Get-Command mpv -ErrorAction SilentlyContinue
if (-not $mpv) {
    Write-Host "MPV player not detected. MPV provides high-speed playback and AniSkip auto-skipping." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        $installMpv = Read-Host "Would you like to install MPV player now via winget? (Y/n)"
        if ($installMpv -ne "n" -and $installMpv -ne "N") {
            try {
                Write-Host "Installing MPV via winget..." -ForegroundColor Green
                & winget install shinchiro.mpv --silent --accept-package-agreements --accept-source-agreements
            } catch {
                Write-Host "Could not automatically install MPV. You can use VLC or install MPV manually from https://mpv.io" -ForegroundColor Yellow
            }
        }
    }
}

# 5. Create Command Wrappers & PATH
Write-Host "`n[5/5] Creating command launchers and configuring PATH..." -ForegroundColor Cyan
$binDir = Join-Path $installDir "bin"
if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }

$cmdWrapper = @"
@echo off
python "%~dp0..\cli.py" %*
"@
Set-Content -Path (Join-Path $binDir "anime-cli.cmd") -Value $cmdWrapper -Encoding ASCII
Set-Content -Path (Join-Path $binDir "anime.cmd") -Value $cmdWrapper -Encoding ASCII

# Add binDir to User PATH environment variable if not already present
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
    $newPath = "$userPath;$binDir"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path += ";$binDir"
    Write-Host "✓ Added $binDir to User PATH." -ForegroundColor Green
}

# Configure Preferred Player
Write-Host "`nConfiguring your preferred video player..." -ForegroundColor Yellow
try {
    & python (Join-Path $installDir "cli.py") --config-player
} catch {}

Write-Host @"
`n╭────────────────────────────────────────────────────────────────────────────╮
│  🎉 Installation Complete!                                                 │
├────────────────────────────────────────────────────────────────────────────┤
│  Open a new terminal window and type 'anime-cli' or 'anime' to start:     │
│                                                                            │
│    anime                         # Interactive anime dashboard             │
│    anime "jujutsu kaisen"        # Search and stream immediately           │
│    anime -c                      # Resume last watched episode             │
│    anime --today                 # Live daily airing radar                 │
│    anime --config-player         # Change preferred player anytime         │
╰────────────────────────────────────────────────────────────────────────────╯
"@ -ForegroundColor Green
