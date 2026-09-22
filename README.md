# ⚡ anime-cli

> **Watch anime from your terminal, browser, or phone without ads, captchas, or broken scrapers.**

I love watching anime from the command line, and tools like `ani-cli` are awesome. But let's be real: scraping pirate websites with `curl` and `grep` breaks every other week whenever those sites change their HTML layout or Cloudflare slaps you with a captcha. And you don't get episode names, synopsis, skip-intro, or an easy way to watch on your phone in bed.

So I reverse-engineered the actual mobile apps behind the scenes (Anilab & Kyoto Player) to query their JSON backend directly with Chrome TLS fingerprinting, and built **`anime-cli`**.

It gives you:
1. An **interactive terminal player** (like `ani-cli`, but 10x faster with 1080p and **auto-skipping anime openings in MPV**).
2. A **self-hosted Crunchyroll-style web app** with watch progress, resume playback, and Sub/Dub toggling.
3. A **zero-config public share tunnel** (`--share`) that prints a QR code in your terminal so you can watch on your phone from anywhere.

---

## 🚀 Quick Install

### Prerequisites
Make sure you have `python3` (3.9+) and `mpv` installed:

```bash
# Ubuntu / Debian / Mint
sudo apt update && sudo apt install -y mpv fzf ffmpeg python3-pip

# Arch Linux
sudo pacman -S mpv fzf ffmpeg python-pip

# macOS (Homebrew)
brew install mpv fzf ffmpeg python
```

### Install anime-cli

```bash
# Clone the repo
git clone https://github.com/Hackedghost64/anime-cli.git
cd anime-cli

# Install it (adds 'anime-cli' to your terminal PATH)
pip install --user .
```

*Make sure `~/.local/bin` is in your `$PATH` (if it isn't already, add `export PATH="$HOME/.local/bin:$PATH"` to your `~/.bashrc` or `~/.zshrc`).*

---

## 🍿 How to Use It

### 1. Watch in Terminal (Like ani-cli, but way better)

Just type the anime name:

```bash
anime-cli "chainsaw man"
```
Or just type `anime-cli` to search interactively with fuzzy search (`fzf`):
* Select the anime from search results.
* Pick your episode (with actual episode names and numbers!).
* Choose **SUB** or **DUB** (`-d` / `--dub` to default to English Dub).
* **⚡ AniSkip Auto-Skip:** It automatically looks up the opening/ending timestamps and tells MPV to **skip the intro theme automatically** without you touching a key!

Resume where you left off:
```bash
anime-cli terminal -c
```

Download episodes in 1080p MP4 for offline viewing:
```bash
anime-cli terminal "solo leveling" -o
```

---

### 2. Browser Mode (Your Private Crunchyroll)

Want a clean, dark-mode Netflix/Crunchyroll UI in your browser with zero ads?

```bash
anime-cli browser
```
This boots up the local streaming engine and automatically opens `http://localhost:8000` in your browser:
* **"Continue Watching"** carousel with saved progress bars and resume points.
* Custom video player with **"Skip Intro"** buttons, quality picker, and episode navigator.
* **Watchlist** to save your favorite shows.
* Native in-browser 1080p playback via an internal HLS reverse-proxy (no VLC popups needed).

---

### 3. The Money Command: `--share` 💰

Wanna lie down in bed and watch on your phone or share a stream with a friend?

```bash
anime-cli browser --share
```
This automatically spins up a secure public HTTPS tunnel and **prints an ASCII QR code right in your terminal**:
1. Point your phone camera at your terminal screen.
2. Tap the link.
3. Bam—you're watching your anime on mobile data or outside home with full sync!

---

### 4. Android Phone Mode via USB (`anime-cli mobile`)

If you have an Android phone plugged into your PC via USB:

```bash
anime-cli mobile
```
It uses ADB to set up zero-latency reverse port forwarding, **wakes up your phone, and automatically launches the app in your phone's browser**. If no phone is plugged in, it generates the Wi-Fi link and QR code for you.

---

### 5. Headless Server Mode

If you're running this on a home server, Raspberry Pi, or Docker:

```bash
anime-cli stream -p 8000
```
Or run it with Docker:
```bash
docker-compose up -d
```

---

## ⌨️ MPV Shortcuts (Terminal Mode)

| Key | Action |
| --- | --- |
| `Space` | Play / Pause |
| `→` / `←` | Seek 5 seconds forward / backward |
| `f` | Toggle Fullscreen |
| `m` | Mute Audio |
| `9` / `0` | Decrease / Increase Volume |
| `q` | Quit (saves watch progress automatically) |

---

## 💡 How It Works Under the Hood

- **Direct Reverse-Engineered APIs:** Instead of scraping ad-filled HTML websites, this talks directly to the mobile app backend via JSON.
- **Cloudflare Bypass:** Uses `curl_cffi` to mimic a genuine Google Chrome TLS fingerprint so the stream resolver never gets blocked.
- **HLS Reverse Proxy:** Rewrites `.m3u8` playlists and video chunks on the fly with permissive CORS headers so browsers can play raw video without cross-origin blocks.
- **SQLite Database:** Stores your watch progress, timestamps, and bookmarks locally in `data/anime.db`.

---

## 📜 Disclaimer
This project is an educational tool that demonstrates API reverse engineering and HLS proxying. All anime content and streams belong to their respective copyright owners. Please support official releases whenever possible!

---

### ⭐ Give it a star if you find it useful!
Feel free to open issues, submit PRs, or suggest new features!
