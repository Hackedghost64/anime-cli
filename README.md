# ⚡ anime-cli

> **The ultimate anime streaming CLI & private browser app. No ads, no captchas, no broken HTML scrapers.**

I love watching anime from the command line, and tools like `ani-cli` are awesome. But let's be real: scraping pirate websites with `curl` and `grep` breaks every other week whenever those sites change their HTML layout or Cloudflare slaps you with a captcha. Plus, you don't get episode names, synopsis, skip-intro, and switching to your phone is painful.

So I reverse-engineered the actual mobile apps behind the scenes (Anilab & Kyoto Player) to query their JSON backend directly with Chrome TLS fingerprinting, and built **`anime-cli`**.

---

## ⚡ Install with 1 Command

```bash
curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash
```

Or manually via pip:
```bash
pip install --user git+https://github.com/Hackedghost64/anime-cli.git
```

*Prerequisites:* `mpv` (recommended for terminal playback), `fzf`, and `ffmpeg`.
```bash
# Ubuntu / Debian
sudo apt install -y mpv fzf ffmpeg python3-pip

# Arch Linux
sudo pacman -S mpv fzf ffmpeg python-pip

# macOS
brew install mpv fzf ffmpeg python
```

---

## 🎮 Super Simple Commands

We made the commands stupidly simple. No complicated flags to memorize:

| What you want to do | Command |
| --- | --- |
| **Watch directly in terminal** | `anime-cli "chainsaw man"` |
| **Open interactive menu** | `anime-cli` |
| **Resume last watched episode** | `anime-cli -c` |
| **Open browser app (Crunchyroll UI)** | `anime-cli -b` |
| **Watch on your phone (QR code + instant tunnel)** | `anime-cli -s` |
| **Prefer English Dub** | `anime-cli "naruto" -d` |
| **Download episode in 1080p MP4** | `anime-cli "frieren" -o` |

---

## ✨ Features

### 1. Terminal Mode (`anime-cli "one piece"`)
* **Real Episode Names & Series Titles:** No cryptic IDs. Shows proper titles, scores, and episode names.
* **Always Offers Both SUB & DUB:** Unlike `ani-cli` which often lacks dub streams, `anime-cli` resolves both Japanese Sub and English Dub servers for every episode and lets you choose on the fly.
* **⚡ AniSkip Auto-Skip in MPV:** It automatically fetches the opening and ending timestamps and tells MPV to **skip the intro theme automatically**. You don't have to touch your keyboard.
* **Instant 1080p:** Streams start playing in MPV in under 1 second.

### 2. Browser Mode (`anime-cli -b`)
* Turns your machine into a private, ad-free Crunchyroll clone.
* **Mobile-App Optimized:** Open it on your phone browser or install it as a PWA with native bottom navigation.
* **"Continue Watching" with Delete Control:** Pick up right where you paused, or click the **✕** button to remove titles from your history whenever you want.
* In-browser 1080p video player with custom controls, skip-intro buttons, quality switcher, and sub/dub toggles.

### 3. Stream on Phone (`anime-cli -s`) 📱
* Generates an instant public HTTPS tunnel and **prints an ASCII QR code in your terminal**.
* Point your phone's camera at your screen, tap the link, and watch from bed or outside home on mobile data!

---

## ⌨️ MPV Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / Pause |
| `→` / `←` | Seek 5s |
| `f` | Toggle Fullscreen |
| `m` | Mute Audio |
| `q` | Quit & save watch progress |

---

## 📜 Disclaimer
This project is an educational tool demonstrating API reverse-engineering and HLS proxying. All anime content and streams belong to their respective copyright holders. Support official releases whenever possible!

---

⭐ **Give it a star if you find it useful!**
PRs, issues, and feature suggestions are welcome!
