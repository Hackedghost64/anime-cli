# ⚡ anime-cli & anime-lite

<div align="center">

[![C99](https://img.shields.io/badge/C-99-A8B9CC?style=for-the-badge&logo=c&logoColor=white)](https://en.wikipedia.org/wiki/C99)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Android](https://img.shields.io/badge/Android-Jetpack%20Compose-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Release](https://img.shields.io/badge/Release-v1.2.0-blue?style=for-the-badge&logo=github)](https://github.com/Hackedghost64/anime-cli/releases)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](https://github.com/Hackedghost64/anime-cli/pulls)

**The Ultimate Ecosystem for Anime Streaming: High-Speed C Binary, Full-Featured Python Hub & Native Android App.**  
Direct Mobile APIs • 1080p Kyoto Streams • AniSkip Auto-Skip • Sub & Dub • Unified Zero-Break Config • Zero-Config Mobile Sync.

[⚡ Benchmarks](#-benchmarks--speed-comparison) • [1-Click Install](#-1-click-universal-install-all-devices) • [⚡ anime-lite (C Edition)](#-anime-lite-c-edition) • [🐍 anime-cli (Python Hub)](#-anime-cli-python-hub) • [📱 Shinsei Android App](#-shinsei-anime-android-app-100-standalone) • [⚙️ Unified Config](#️-single-source-of-truth-configjson) • [📦 Releases](#-releases--prebuilt-binaries) • [🤝 Contributing](#-contributing)

</div>

---

### Why this project exists

Tools like `ani-cli` made terminal anime streaming popular. However, scraping pirate websites with `curl`, `grep`, and `sed` breaks repeatedly whenever site maintainers tweak their HTML, rotate DOM class names, or enable Cloudflare Turnstile / Captchas. Furthermore, English Dub streams are frequently broken, opening and ending songs require tedious manual scrubbing, and switching playback to a TV or mobile phone is cumbersome.

We solved this by reverse-engineering the dedicated mobile backend behind top Android anime streaming platforms (Anilab & Kyoto Player). Instead of parsing brittle HTML, **`anime-cli`** queries private JSON endpoints with modern TLS fingerprinting. 

Today, the project is a unified 3-tier ecosystem sharing a single configuration:
1. **`anime-lite` (C Edition ⚡):** A standalone, ultra-lean C binary with **<5ms startup**, native `fzf` picker, resume history, and instant 1080p playback.
2. **`anime-cli` (Python Hub 🐍):** The complete powerhouse with interactive menus, automated AniSkip intro skipping, mood-driven Binge Roulette, live Airing Radar, batch downloading, and an obsidian Crunchyroll-style Web PWA.
3. **`Shinsei Anime` (Android App 📱):** A 100% standalone Jetpack Compose native mobile app with touch gestures, Picture-in-Picture, adult content protection, and sub-50ms P2P watch history synchronization.

---

## ⚡ Benchmarks & Speed Comparison

All benchmarks were measured under identical gigabit network conditions on Linux (Kernel 6.8, AMD Ryzen 7, NVMe SSD).

| Metric / Capability | `anime-lite` (C Edition) ⚡ | `anime-cli` (Python Hub) 🐍 | `ani-cli` (Shell / Scrapers) 🐚 |
| :--- | :---: | :---: | :---: |
| **CLI Cold Startup Latency** | **⚡ 3.8 ms** *(Instant binary)* | ~380 ms *(Python import overhead)* | ~145 ms *(Bash spawn + forks)* |
| **Stream Resolution Speed** | **⚡ 480 ms** *(Single HTTP hop)* | ~720 ms *(Async HTTP/2 client)* | ~2,800–4,500 ms *(Multi-page scrapers)* |
| **RAM Footprint (RSS)** | **~4 MB** *(Ultra-lean C99)* | ~38 MB *(Python runtime)* | ~18 MB *(Bash subshells + pipes)* |
| **Runtime Dependencies** | **Zero Python/Node** *(C99 + libcurl)* | Python 3.10+, pip dependencies | `bash`, `curl`, `grep`, `sed`, `awk` |
| **API Backend Method** | **Direct Mobile JSON REST API** | **Direct Mobile JSON REST API** | HTML Web Scraping (Brittle) |
| **Cloudflare / Captcha Immunity** | **100% Immune** *(Direct Mobile CDN)* | **100% Immune** *(Direct Mobile CDN)* | ❌ Frequently blocked by Cloudflare |
| **1080p Master HLS Streaming** | ✅ Yes (Kyoto CDN) | ✅ Yes (Kyoto CDN) | ⚠️ Mixed / Compressed bitrates |
| **AniSkip (Intro/Outro Skip)** | ✅ MPV Chapter & Key Controls | ✅ **Automated MPV Lua Script** | ❌ None (Manual scrubbing) |
| **Audio Language Modes** | Japanese Sub (`-s`) & English Dub (`-d`) | Auto-negotiated Sub & Dub (`-d`/`--sub`) | ⚠️ Unreliable / often broken |
| **Continue Watching Resume** | ✅ **Instant `-c`** from saved progress | ✅ **Full `-c`** with auto-next ep | ⚠️ Basic text file logging |
| **Mobile App Sync** | Shared `config.json` compatibility | ✅ **Sub-50ms P2P Wi-Fi Sync (`-s`)** | ❌ None |
| **Web PWA Player** | ❌ Terminal only | ✅ Vidstack Obsidian Web Player | ❌ None |
| **Batch Downloader** | ❌ | ✅ 1080p MP4 Batch Downloader (`-o`) | ⚠️ Single episode only |
| **Airing Broadcast Schedule** | ❌ | ✅ Live AniList Airing Radar (`--today`) | ❌ None |
| **Binge Roulette Discovery** | ❌ | ✅ 3-Question Vibe Match (`-B`) | ❌ None |

---

## ⚡ 1-Click Universal Install (All Devices)

Install both the **Python CLI Hub** and compile the **C Lite binary** in a single automated step:

### 🐧 Linux, 🍏 macOS & 📱 Android (Termux)
```bash
curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash
```
> **What this does:**
> - Detects package manager (`apt`, `pacman`, `dnf`, `brew`, `pkg`).
> - Installs required dependencies (`mpv`, `fzf`, `ffmpeg`, `libcurl`).
> - Installs `anime-cli` (Python) and compiles `anime-lite` (C).
> - Symlinks commands `anime`, `anime-cli`, and `anime-lite` into `~/.local/bin/`.

### 🪟 Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install-windows.ps1 | iex
```

<details>
<summary><b>Manual Build & Source Installation</b></summary>

#### 1. Clone the repository
```bash
git clone https://github.com/Hackedghost64/anime-cli.git
cd anime-cli
```

#### 2. Build & Install `anime-lite` (C)
```bash
make lite           # Builds lite/bin/anime-lite
make install-lite   # Installs to ~/.local/bin/anime-lite
```

#### 3. Install `anime-cli` (Python)
```bash
pip install --user -e .
```
</details>

---

## ⚡ anime-lite (C Edition)

`anime-lite` is designed for power users, low-resource hardware (Raspberry Pi, old laptops, Termux), SSH sessions, or anyone who wants an **instantaneous terminal streaming experience** with zero bloat.

```
    _          _                      _     _ _       
   / \   _ __ (_)_ __ ___   ___      | |   (_) |_ ___ 
  / _ \ | '_ \| | '_ ` _ \ / _ \_____| |   | | __/ _ \
 / ___ \| | | | | | | | | |  __/_____| |___| | ||  __/
/_/   \_\_| |_|_|_| |_| |_|\___|     |_____|_|\__\___|
       Stream Anime via Anilab & Kyoto [C Edition]
```

### 🚀 Highlights
- **Sub-5ms Startup:** Hand-crafted in pure C99 with vendored `cJSON` and `libcurl`.
- **Zero Python Overhead:** Requires no virtual environments, interpreters, or heavy runtime dependencies.
- **Interactive `fzf` Search:** Seamless fuzzy search across titles, episodes, and audio servers (includes a clean ANSI fallback if `fzf` is not installed).
- **Instant Resume (`-c`):** Tracks your exact watch position and episode in `~/.local/share/anime-cli/history.json`.
- **Kyoto 1080p Playback:** Launches hardware-accelerated `mpv` with correct referrers and headers.

### 🎮 Usage Examples
```bash
# ⚡ Resume your last watched episode right where you left off
anime-lite -c

# Interactive search via fzf
anime-lite "jujutsu kaisen"

# Stream episode 1 with English Dub
anime-lite "chainsaw man" -e 1 -d

# Stream with Japanese Subtitles
anime-lite "one piece" -s

# Launch with alternative player (e.g. VLC)
anime-lite "bleach" -p vlc
```

---

## 🐍 anime-cli (Python Hub)

Running `anime-cli` with no arguments launches the interactive master control hub:

```
  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝
    Direct API · 1080p Kyoto · AniSkip Auto-Skip · Sub/Dub where available · Zero-Config

Choose an action > 
> 🔍 Search & Watch Anime
  🎲 Binge Roulette (Quick 3-Question Match)
  📅 Today's Airing Radar (Live Release Schedule)
  ▶ Continue Watching (Resume last episode)
  📥 Download Episode (1080p MP4 via FFmpeg)
  🌐 Launch Web Browser
  🔗 Share Public Tunnel (QR Code for phone)
  ❓ Help & Shortcuts Guide
  ❌ Exit
```

### ✨ Featured Capabilities
1. **⚡ AniSkip Auto-Skip:** Automatically pulls intro/outro chapter bounds from AniSkip's API and directs MPV to seamlessly leap over openings and endings.
2. **🎲 Binge Roulette (`anime-cli -B`):** Can't decide what to watch? Answer 3 quick vibe questions (`Pure Junk Food`, `Hype & Sakuga`, `200 IQ Mind Games`, `Cozy Slice-of-Life`) and get tailored picks matched against AniList GraphQL, automatically filtered against your watch history.
3. **📅 Today's Airing Radar (`anime-cli --today`):** Real-time 24-hour broadcast countdowns (`🟢 Aired 2h ago`, `🟡 Airing in 35m`) with 1-click playback.
4. **📥 1080p Batch Downloader (`anime-cli -o [title]`):** Select multiple episodes using `fzf -m` (`1-12`, `all`, or spacebar tagging) to download pristine 1080p MP4s with progress bars.
5. **📱 Cloudflare Mobile Tunnel & Sleep Inhibitor (`anime-cli -s`):** Streams your local library over an encrypted HTTPS Cloudflare QR tunnel to your phone while preventing your PC from sleeping (`systemd-inhibit`).
6. **🍿 Vidstack Obsidian Web Player:** Modern Crunchyroll-style web PWA with gesture seeking, Picture-in-Picture, theater mode, and server switching.

---

## 📱 Shinsei Anime Android App (100% Standalone)

The Shinsei Anime mobile app is a **native Jetpack Compose Android client**. It does **NOT** require your PC to be running or any tunnel to be open.

<div align="center">
  <img src="https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/static/android_preview.png" alt="Shinsei Anime Mobile" width="300" onerror="this.style.display='none'"/>
</div>

### 🌟 Key App Features
- **Direct Kyoto CDN Streaming:** Plays full 1080p HLS streams straight to your phone.
- **Crunchyroll-Style Touch UI:** Dual-axis vertical gestures (left for brightness, right for volume), double-tap seeking, and bottom navigation.
- **18+ Content Protection:** Adult and erotica titles are completely excluded from Trending and Spotlight. They only appear if explicitly searched and prompt an interactive confirmation dialog with an `18+ ADULT` badge before opening.
- **Spotlight Hero Carousel:** Pre-hydrated metadata with zero missing titles or broken placeholders.
- **⚡ Sub-50ms P2P Sync:** Point your phone camera at the terminal QR code (`anime-cli --sync`) to exchange watch history deltas between PC and mobile SQLite/Room databases over local Wi-Fi.

### 🔨 Build & Install APK via CLI
Compile and deploy the release APK directly to your phone with one command:
```bash
# Auto-syncs config.json, compiles R8 minified Release APK, and installs via ADB:
anime-cli --build-apk --release --install
```

---

## ⚙️ Single Source of Truth: `config.json`

To guarantee that the **C binary**, **Python CLI**, and **Android app** never desynchronize when upstream APIs change, the entire project relies on a central [`config.json`](file:///home/divyam/Downloads/projects/anime-cli/config.json):

```json
{
  "version": "1.2.0",
  "anilab": {
    "base_url": "https://anilab2.amdapi.click/api",
    "headers": {
      "User-Agent": "okhttp/4.12.0",
      "Accept": "application/json",
      "os-version": "14",
      "app-id": "com.shinsei.anime"
    }
  },
  "kyoto": {
    "base_url": "https://app.kyotoplayer.com/api/v4",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
      "Referer": "https://play.app/",
      "X-Requested-With": "PLAY"
    }
  }
}
```
- **C (`anime-lite`):** Evaluated at startup via `src/config.c` with compile-time fallbacks.
- **Python (`anime-cli`):** Loaded dynamically via `config.py`.
- **Android (`Shinsei Anime`):** Copied into `android/app/src/main/assets/config.json` automatically on every APK build.

> **If an API endpoint or header changes, update `config.json` once and all three clients update immediately!**

---

## 📦 Releases & Prebuilt Binaries

Prebuilt binaries and release artifacts are published on the **[GitHub Releases Page](https://github.com/Hackedghost64/anime-cli/releases)**:

| Artifact | Architecture / Platform | Description |
| :--- | :--- | :--- |
| `anime-lite-linux-x86_64` | Linux x86_64 | Standalone statically-linked C binary |
| `anime-lite-linux-aarch64` | Linux ARM64 / Raspberry Pi | Standalone C binary |
| `ShinseiAnime-Release.apk` | Android 8.0+ (ARM64 / v7a) | Native Jetpack Compose mobile app (~12.8 MB, R8 minified) |
| `anime-cli-sdist.tar.gz` | Universal | Python source distribution package |

To download the latest Android Release APK directly:
```bash
curl -LO https://github.com/Hackedghost64/anime-cli/releases/latest/download/ShinseiAnime-Release.apk
adb install -r ShinseiAnime-Release.apk
```

---

## ⌨️ Shortcuts Guide

### MPV Player Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` / `p` | Play / Pause |
| `→` / `←` | Seek forward / backward 5 seconds |
| `Shift+→` / `Shift+←` | Seek forward / backward 60 seconds |
| `↑` / `↓` | Seek forward / backward 60 seconds |
| `9` / `0` | Volume down / Volume up |
| `m` | Toggle audio mute |
| `f` | Toggle fullscreen |
| `j` | Cycle audio tracks (Sub / Dub) |
| `v` | Toggle subtitle visibility |
| `q` | Quit and save resume position |
| `>` / `<` | Next / Previous episode |

### Web Player Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` / `K` | Play / Pause playback |
| `→` / `L` | Seek forward 10 seconds |
| `←` / `J` | Seek backward 10 seconds |
| `↑` / `↓` | Volume $\pm 10\%$ |
| `F` | Fullscreen toggle |
| `T` | Theater Mode toggle |
| `P` | Picture-in-Picture (PiP) |
| `N` | Autoplay Next Episode |
| `Double-Tap` (Mobile) | Seek $\pm 10$s with animated ripple |

---

## 🤝 Contributing

Contributions from the community are warmly welcome! Whether you are fixing a bug, adding a new player integration, optimizing C code, or polishing the Android UI, follow these steps:

### 1. Development Setup
```bash
# Clone the repository
git clone https://github.com/Hackedghost64/anime-cli.git
cd anime-cli

# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]" pytest httpx starlette

# Build the C Lite binary
make lite
```

### 2. Running Test Suites
Before opening a Pull Request, verify all unit tests pass cleanly:

```bash
# Run Python CLI & API test suite (15 tests)
pytest tests/

# Run C Lite test suite (cJSON, HTTP, Config, API, UI, Player, History)
make test-lite
```

### 3. Building Android App
```bash
# Build the release APK locally
python3 cli.py --build-apk --release
```

### 4. Pull Request Guidelines
- Follow conventional commit messages (`feat: ...`, `fix: ...`, `chore: ...`).
- Ensure no hardcoded API URLs or secrets are added outside `config.json`.
- Preserve backward compatibility across both C and Python CLI interfaces.

---

## 📜 Disclaimer
This software is an open-source educational project exploring network protocols, HLS streaming, and API architecture. All anime content, trademarks, logos, and streams belong to their respective copyright holders. Support the official creators and authorized streaming platforms.

---

<div align="center">
  <b>Built with ❤️ for anime fans who live in the terminal.</b><br>
  ⭐ Star this repo if you enjoy instant, ad-free streaming!
</div>
