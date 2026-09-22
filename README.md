# ⚡ anime-cli

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Hackedghost64/anime-cli?style=for-the-badge&logo=github)](https://github.com/Hackedghost64/anime-cli/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](https://github.com/Hackedghost64/anime-cli/pulls)

**The ultimate anime streaming CLI & private browser app. No ads, no captchas, no broken HTML scrapers.**

[1-Command Install](#-install-with-1-command) • [Quick Commands](#-super-simple-commands) • [Why Not ani-cli?](#-why-not-ani-cli) • [Features](#-features) • [Mobile Setup](#-watch-on-your-phone-pwa)

</div>

---

### Why did I build this?

I love watching anime straight from the terminal. Tools like `ani-cli` are great, but let's be honest: scraping pirate sites with `curl` and `grep` breaks every few weeks whenever those websites tweak their HTML or Cloudflare slaps you with an impossible captcha. Plus, you rarely get proper episode titles, English Dub is constantly missing or broken, you have to manually skip intros, and switching to your phone is basically impossible.

So I reverse-engineered the actual mobile backend behind Android streaming apps (Anilab & Kyoto Player) to query their JSON endpoints directly with Chrome TLS fingerprinting, and wrapped everything into a clean, modern CLI & private browser app called **`anime-cli`**.

---

## ⚡ Install with 1 Command

Just run this in your terminal and you're good to go:

```bash
curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash
```

> The installer automatically checks and helps install system dependencies (`mpv`, `fzf`, `ffmpeg`) and puts `anime-cli` right in your path.

<details>
<summary><b>Alternative Install Options (Pip / Clone)</b></summary>

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

Here's why `anime-cli` is a whole different beast:

| Feature | `ani-cli` | `anime-cli` (This Project) |
| :--- | :---: | :---: |
| **Backend Method** | Fragile web scrapers (breaks often) | Direct Mobile App JSON APIs + TLS Chrome Fingerprinting ⚡ |
| **Cloudflare / Captchas** | Regularly blocked | Bypassed smoothly via JA3/HTTP2 impersonation |
| **English Dub Support** | Inconsistent / often missing | Guaranteed Sub & Dub options for every episode 🎙️ |
| **Auto-Skip Openings & Endings** | Manual scrubbing | Automated AniSkip in both MPV & Browser ⏩ |
| **Series & Episode Titles** | Numbers only on many providers | Real hydrated titles, scores, & episode names |
| **Mobile & Phone Support** | Terminal only | Instant QR code + HTTPS tunnel (`-s`) + PWA mobile UI 📱 |
| **In-Browser UI** | None | Built-in sleek dark Crunchyroll-style web player 🍿 |
| **Watch History Management** | Basic file list | SQLite database + resume (`-c`) + delete unwanted history |
| **Quality** | Dependent on scrapers | 1080p master HLS streams resolved in under 1 second |

---

## 🎮 Super Simple Commands

We made the commands stupidly simple. No complicated flags to memorize:

| What you want to do | Command |
| :--- | :--- |
| **Watch directly in terminal** | `anime-cli "chainsaw man"` |
| **Open interactive search menu** | `anime-cli` |
| **Resume last watched episode** | `anime-cli -c` |
| **Open browser app (Crunchyroll UI)** | `anime-cli -b` |
| **Watch on your phone (QR code + instant tunnel)** | `anime-cli -s` |
| **Prefer English Dub** | `anime-cli -d "naruto"` |
| **Download episode in 1080p MP4** | `anime-cli -o "frieren"` |

---

## ✨ Features

### 1. Terminal Mode (`anime-cli "one piece"`)
* **Real Titles & Scores:** Shows proper anime titles, episode counts, scores, and real episode names in an interactive `fzf` fuzzy-finder menu.
* **Always Offers Both SUB & DUB:** Resolves both Japanese Sub and English Dub servers for every episode and lets you choose on the fly.
* **⚡ AniSkip Auto-Skip in MPV:** It automatically fetches the opening and ending timestamps from the AniSkip database and tells MPV to **skip the intro theme automatically**. You never have to touch your keyboard.
* **Instant 1080p Master Streams:** Video starts playing in MPV in under a second.

### 2. Browser Mode (`anime-cli -b`)
* Turns your machine into a private, ad-free Crunchyroll clone on `http://localhost:8000`.
* **Continue Watching with Delete Control:** Pick up right where you paused, or click the **✕** button to delete titles from your history whenever you want.
* In-browser 1080p video player with custom controls, skip-intro buttons, quality switcher, and sub/dub toggles.
* Zero external ads, tracking, or popups.

### 3. Watch on Your Phone / PWA (`anime-cli -s`) 📱
* Run `anime-cli -s` and it generates an instant, encrypted public HTTPS tunnel.
* An **ASCII QR code** appears directly in your terminal.
* Point your phone's camera at your screen, tap the link, and watch from bed or outside home on mobile data!
* **Mobile App Ready:** Tap "Add to Home Screen" on iOS Safari or Android Chrome to get a full-screen, standalone app with native bottom navigation (`Trending`, `Search`, `Library`, `History`).

---

## ⌨️ MPV Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `→` / `←` | Seek forward / backward 5 seconds |
| `↑` / `↓` | Seek forward / backward 1 minute |
| `f` | Toggle Fullscreen |
| `m` | Mute / Unmute Audio |
| `9` / `0` | Decrease / Increase Volume |
| `q` | Quit player & automatically save your watch progress |

---

## 📜 Disclaimer
This project is an educational tool demonstrating API reverse-engineering, TLS fingerprint impersonation, and HLS proxying. All anime content and streams belong to their respective copyright holders. Support the creators and official releases whenever possible!

---

⭐ **Give it a star if you find it useful!**  
Pull requests, issues, and ideas are always welcome.
