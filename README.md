# ⚡ anime-cli

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Hackedghost64/anime-cli?style=for-the-badge&logo=github)](https://github.com/Hackedghost64/anime-cli/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](https://github.com/Hackedghost64/anime-cli/pulls)

**The ultimate anime streaming CLI, batch downloader & private browser app.**  
Direct mobile APIs • 1080p Kyoto • AniSkip Auto-Skip • Sub & Dub • Binge Roulette • Airing Radar • Zero-Config Mobile Tunnel.

[1-Command Install](#-install-with-1-command) • [Interactive CLI](#-interactive-cli-hub) • [Key Features](#-features) • [CLI Commands](#-cli-commands--flags) • [Shortcuts Guide](#-shortcuts-guide) • [Phone Setup](#-watch-on-your-phone-pwa--sleep-inhibitor)

</div>

---

### Why did I build this?

I love watching anime straight from the terminal. Tools like `ani-cli` are great, but let's be honest: scraping pirate sites with `curl` and `grep` breaks every few weeks whenever those websites tweak their HTML or Cloudflare slaps you with an impossible captcha. Plus, you rarely get proper episode titles, English Dub is constantly missing or broken, you have to manually scrub through openings, and switching to your phone from bed is basically impossible.

So I reverse-engineered the actual mobile backend behind Android streaming apps (Anilab & Kyoto Player) to query their JSON endpoints directly with Chrome TLS fingerprinting, and built **`anime-cli`**: a full-featured streaming hub with MPV integration, automated AniSkip intro bypass, mood-based Binge Roulette, live Airing Radar, batch downloading, and an obsidian Crunchyroll-style web PWA player.

---

## ⚡ Install with 1 Command

Just run this in your terminal and you're good to go:

```bash
curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash
```

> The installer automatically checks and helps install system dependencies (`mpv`, `fzf`, `ffmpeg`) and puts `anime-cli` right in your path.

<details>
<summary><b>Alternative Install Options (Pip / Git Clone)</b></summary>

#### Install with pip:
```bash
pip install --user git+https://github.com/Hackedghost64/anime-cli.git
```

#### Clone and run locally:
```bash
git clone https://github.com/Hackedghost64/anime-cli.git
cd anime-cli
pip install --user -e .
```

#### Manual system dependencies:
- **Debian / Ubuntu / Mint:** `sudo apt install -y mpv fzf ffmpeg python3-pip`
- **Arch / Manjaro:** `sudo pacman -S mpv fzf ffmpeg python-pip`
- **Fedora:** `sudo dnf install -y mpv fzf ffmpeg python3-pip`
- **macOS:** `brew install mpv fzf ffmpeg python`
</details>

---

## 🥊 Why Not `ani-cli`?

| Feature | `ani-cli` | `anime-cli` (This Project) |
| :--- | :---: | :---: |
| **Backend Method** | Fragile web scrapers (breaks frequently) | Direct Mobile App JSON APIs + TLS Chrome Fingerprinting ⚡ |
| **Cloudflare / Captchas** | Regularly blocked | Bypassed smoothly via JA3/HTTP2 impersonation |
| **English Dub Support** | Inconsistent / often missing | Guaranteed Sub & Dub options for every episode 🎙️ |
| **Auto-Skip Openings & Endings** | Manual scrubbing | Automated AniSkip in both MPV & Browser ⏩ |
| **Binge Mood Discovery** | None | Curated **Binge Roulette** with AniList GraphQL + history dedup 🎲 |
| **Today's Airing Radar** | None | Live 24h broadcast countdowns (`🟢 Aired`, `🟡 Airing in`) 📅 |
| **Batch Episode Downloader** | Single episode only | Multi-episode selector (`1-12`, `all`, `fzf -m`) to 1080p MP4 📥 |
| **Mobile & Phone Streaming** | Terminal only | Instant QR code + HTTPS tunnel (`-s`) + Sleep Inhibitor 📱 |
| **Modern Web Player** | None | Floating controls, scrubber tooltip, PiP, theater mode, gestures 🍿 |
| **Watch History Management** | Basic file list | SQLite database + resume (`-c`) + delete unwanted history |
| **Speed & Quality** | Dependent on scrapers | 1080p master HLS streams resolved in under 1 second |

---

## 🎯 Interactive CLI Hub

Running `anime-cli` with no arguments launches the unified interactive dashboard:

```
  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██╗    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝
    Direct API · 1080p Kyoto · AniSkip Auto-Skip · Sub & Dub · Zero-Config

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

---

## ✨ Features

### 1. Terminal Streaming with MPV (`anime-cli "chainsaw man"`)
* **Hydrated Anime Metadata:** Shows proper titles, episode numbers, score ratings, and episode names via interactive `fzf`.
* **Sub & Dub Support:** Resolves both Japanese Sub and English Dub servers for every episode.
* **⚡ AniSkip Auto-Skip:** Automatically queries the AniSkip database and directs MPV to skip openings and endings automatically without touching the keyboard.
* **Instant 1080p HLS Playback:** Starts playing in under a second.

### 2. 🎲 Binge Roulette (`anime-cli -B` or Web UI)
* **Vibe-Based Curation:** Choose your craving:
  - `🍿 Pure Junk Food`: Secret OP MCs, cheat magic flexes, instant dopamine, zero braincells.
  - `🔥 Pure Hype & Sakuga`: High stakes, god-tier battles, zero drag.
  - `🧠 200 IQ Mind Games`: Masterminds, psychological chess, deception.
  - `💀 Dark & Gritty`: High tension, gritty survival, relentless mystery.
  - `☕ Cozy & Wholesome`: Peak laughs, comfort slice-of-life watching.
  - `😭 Emotional Damage`: Tearjerkers, bittersweet drama, deep bonds.
* **Filters:** Select duration (`Quick Binge 11-13 eps`, `Standard 24-26 eps`, `Epic Saga 40+ eps`) and toggle **💎 Hidden Gems** to bypass ubiquitous mainstream titles.
* **History Deduplication:** Automatically crosses titles with your local SQLite database to prevent recommending anime you've already watched.

### 3. 📅 Airing Radar (`anime-cli --today` or Web UI)
* **Live Broadcast Schedule:** Queries AniList's 24-hour airing schedule.
* **Real-Time Badges:** Displays countdown badges:
  - `🟢 Aired 2h 15m ago`
  - `🟡 Airing in 35m`
  - `⚪ Airing in 6h`
* **1-Click Watch:** Press Enter on any airing title to jump straight into streaming.

### 4. 📥 Multi-Episode Batch Downloader (`anime-cli -o [title]`)
* **Multi-Selection UI:** Select multiple episodes using `fzf -m` (`TAB` to select/deselect, `Shift-TAB` to toggle all) or specify ranges (e.g. `1-12`, `1,3,5`, `all`).
* **Single Audio Prompt:** Pick Japanese Sub or English Dub once for the entire batch.
* **FFmpeg Direct Extraction:** Downloads pristine 1080p MP4s with progress bars into `~/Downloads/Anime/`.

### 5. 📱 Watch on Your Phone & Sleep Inhibitor (`anime-cli -s`)
* **Instant Encrypted Tunnel:** Spins up a zero-config Cloudflare HTTPS tunnel with an ASCII QR code printed in the terminal.
* **Linux Sleep Inhibitor:** Automatically locks Linux system sleep (`systemd-inhibit` and `gnome-session-inhibit`), preventing laptops/desktops from going to sleep while streaming to your phone.
* **PWA Support:** Install to Home Screen on iOS Safari or Android Chrome for a native app feel with bottom navigation.

### 6. 🍿 Modern Vidstack Obsidian Web Player
* **Engineered with Vidstack:** Next-generation, zero-clutter HTML5 / HLS media player engine optimized across desktop, tablet, and mobile portrait/landscape.
* **Glassmorphic Center Play/Pause:** Responsive circular center button displaying state (`▶` / `❚❚`) with smooth fade transitions on control auto-hide.
* **In-Player Next Episode Button:** Top-right floating badge inside the video container (accessible even in full screen) plus bottom toolbar integration next to play/pause.
* **Audio & Preference Persistence:** Remembers your SUB or DUB selection across entire anime series via `localStorage`, and persists volume, mute state, and playback speeds (`0.75x` - `2.0x`).
* **Resilient Server Switching & Fallback:** Switching servers preserves your exact playback second without resetting to zero. If an upstream stream drops, a 1-click fallback button offers immediate backup server failover.
* **Session Persistence & Exit-Hooks:** Syncs playback timestamps every 10 seconds via background heartbeat and fires an exit hook on route change or browser close to guarantee cross-device resume.
* **⚡ AniSkip Auto-Skip:** Automatically detects anime openings and endings via AniList. Clicking "Skip Outro" provides zero-lag autoplay into the next episode.
* **Mobile Gestures:** Double-tap left/right edges to seek $\pm 10$s with ripple animations. Accidental double-taps in the middle are safely guarded against unwanted full-screen or minimize toggles.
* **PiP & Theater Mode:** Full Picture-in-Picture (`P`), Theater Mode (`T`), and dedicated Help modal (`?` / `H`).

### 7. 📱 Shinsei Anime: Standalone Native Android App
* **Zero PC-Dependency Streaming:** No need to keep your PC running or maintain a tunnel to watch on your phone. The native Android app streams directly from Kyoto/Anilab CDNs.
* **Autonomous "Dumb Runner" Architecture:** The APK runs a hot-reloadable JavaScript provider bundle (`provider.bundle.js`) using Android's native headless V8 engine with full modern ES6+ and Cloudflare Turnstile resilience.
* **1:1 Crunchyroll Player Screen:**
  - Center 3-button touch controls: `[⏪ 10]` `[ ▶ / ❚❚ ]` `[10 ⏩]`.
  - Floating `[⚡ Skip Intro]` / `[⚡ Skip Outro]` buttons powered by real-time AniSkip API.
  - Precision dual-axis vertical touch gestures: left-side screen swipe for brightness, right-side swipe for volume.
  - Double-tap left/right edges for $\pm 10$s curved ripples.
  - Top bar with episode badge, SUB/DUB toggle, `[⏭ Next]` episode button beside `[⚙ Settings]`, and aspect ratio zoom toggle.
  - True OLED pitch black (`#0B0C0E`) cinema styling.
  - Native Android 12+ Picture-in-Picture (PiP) and auto-saving watch progress to Room DB.
* **⚡ P2P Watch History Sync (<50ms):**
  - Run `anime-cli sync` in your PC terminal.
  - Point your phone camera at the ASCII QR code inside the app's scanner sheet.
  - Mobile Room DB and PC SQLite DB exchange watch history deltas in under 50ms over home Wi-Fi with relative-age conflict resolution (100% immune to phone/PC clock drift).
  - Automatically hot-reloads the latest provider extraction script from PC to phone on sync.

---

## 🎮 CLI Commands & Flags

| Command | Description |
| :--- | :--- |
| `anime-cli` | Open interactive menu dashboard |
| `anime-cli <title>` | Search & stream immediately in MPV |
| `anime-cli --sync` | Start P2P sync server & QR code for Shinsei Android app |
| `anime-cli -b, --browser` | Launch web browser app |
| `anime-cli -s, --share` | Launch web app with Cloudflare tunnel & QR code |
| `anime-cli -c, --continue` | Resume playback of last watched anime episode |
| `anime-cli -B, --binge` | Launch interactive 3-question Binge Roulette |
| `anime-cli --today, --schedule` | View today's live anime release radar |
| `anime-cli -o, --download [title]` | Batch download 1080p MP4 episodes via FFmpeg |
| `anime-cli -d, --dub` | Prefer English Dub audio servers |
| `anime-cli --sub` | Prefer Japanese Sub audio servers |
| `anime-cli help, -h` | Display interactive CLI help & shortcuts guide |

---

### 📦 Building the Android APK
```bash
cd android
./gradlew assembleDebug
# Generated APK: android/app/build/outputs/apk/debug/app-debug.apk
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
| `9` / `0` | Decrease / Increase volume |
| `m` | Toggle audio mute |
| `f` | Toggle fullscreen |
| `j` | Cycle available audio tracks (Sub/Dub) |
| `v` | Toggle subtitle track visibility |
| `q` | Quit player & save resume progress |
| `>` / `<` | Jump to Next / Previous playlist episode |

### Web Player & PWA Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` / `K` | Play / Pause playback |
| `→` / `L` | Seek forward 10 seconds |
| `←` / `J` | Seek backward 10 seconds |
| `↑` / `↓` | Adjust volume by 10% |
| `F` | Toggle Fullscreen |
| `T` | Toggle Theater Mode |
| `P` | Toggle Picture-in-Picture (PiP) |
| `M` | Toggle Mute / Unmute |
| `N` | Autoplay Next Episode |
| `?` / `H` | Open Help & Shortcuts Modal |
| `Double-Tap Left / Right` (Mobile) | Seek $\pm 10$s with animated touch ripple |
| `⚡ Auto-Skip` | Skip Opening (OP) / Instant jump on Ending (ED) |

---

## 📜 Disclaimer
This project is an educational open-source tool demonstrating API reverse-engineering, TLS fingerprint impersonation, and HLS proxying. All anime content, trademarks, and streams belong to their respective copyright holders. Support the official creators and releases whenever possible!

---

⭐ **Give it a star if you find it useful!**  
Pull requests, issues, and ideas are always welcome.
