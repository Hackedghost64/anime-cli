# ⚡ Shinsei Anime — Private Streaming Service

A self-hosted, private anime streaming web service inspired by **Crunchyroll**. Powered by FastAPI, reverse-engineered Anilab & Kyoto engines, and an in-browser HLS reverse proxy.

---

## ✨ Features

- **In-Browser 1080p Streaming:** Custom HLS/M3U8 reverse-proxy eliminates browser CORS limitations on upstream CDN video chunks (`xlsbox.com`). No VLC required.
- **AniSkip Integration:** Floating **"Skip Intro"** and **"Skip Outro"** buttons powered by the public AniSkip API.
- **Sub / Dub Audio Switcher:** Effortlessly switch between Japanese (Sub) and English (Dub) streams on the fly.
- **Server Failover:** Multiple stream servers per episode with automatic fallback.
- **Watch History & "Continue Watching":** Tracks your exact watch timestamps in a local SQLite database (`anime.db`) and displays a "Continue Watching" carousel on the home page.
- **Watchlist (My List):** Save anime to your personal watchlist.
- **Mobile & TV Optimized:** Responsive design with full keyboard shortcuts (Space, Arrow keys, F for fullscreen, N for next episode).
- **Free Cloud Deployment:** Ready to deploy to **Hugging Face Spaces** for 100% free 24/7 cloud hosting without keeping your PC on.

---

## 🚀 Quick Start (Local)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Server
```bash
./run.sh
# OR manually:
python3 main.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### 3. Access Across Your Home Wi-Fi
To watch from your phone, tablet, or TV, find your PC's local IP (e.g. `192.168.1.50`) and open:
```
http://192.168.1.50:8000
```

---

## 🐳 Docker Deployment

### Run with Docker Compose:
```bash
docker-compose up -d
```
The database will persist in `./data/anime.db`.

---

## ☁️ Deploy to Hugging Face Spaces (Free 24/7 Cloud)

You can host this for free on Hugging Face Spaces so you don't have to keep your PC turned on:

1. Create a new Space on [Hugging Face](https://huggingface.co/spaces) with **Docker** SDK (CPU Basic is free).
2. Push or upload this repo.
3. Hugging Face builds the Docker container and gives you a free HTTPS URL (e.g. `https://username-space.hf.space`).
4. Read [`HUGGINGFACE_DEPLOYMENT.md`](HUGGINGFACE_DEPLOYMENT.md) for step-by-step instructions.

---

## ⚙️ Running as a System Service on Linux (Auto-Start on PC Boot)

If you want the server to start automatically whenever your PC turns on:

1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/anime-app.service
```

2. Paste the following configuration (replace `/home/divyam/Downloads/projects/anime-app` with your path):
```ini
[Unit]
Description=Shinsei Anime Streaming Service
After=network.target

[Service]
Type=simple
User=divyam
WorkingDirectory=/home/divyam/Downloads/projects/anime-app
ExecStart=/usr/bin/python3 /home/divyam/Downloads/projects/anime-app/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now anime-app.service
```

Now the server will run silently in the background whenever your PC boots!
