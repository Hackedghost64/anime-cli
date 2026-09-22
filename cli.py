#!/usr/bin/env python3
"""
⚡ anime-cli: The Modern, Next-Gen Anime Streaming & Browser CLI
Inspired by ani-cli, but powered by direct mobile REST APIs, Chrome TLS bypass,
AniSkip auto-skipping, and instant browser/mobile tunneling.
"""
from __future__ import annotations
import os
import sys
import time
import socket
import select
import signal
import shutil
import urllib.parse
import webbrowser
import subprocess
import threading
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from anilab.client import AnilabClient
from anilab.kyoto import KyotoResolver
import aniskip
import db

# Terminal Colors
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_ORANGE = "\033[38;2;255;100;10m"
C_ORANGE_BG = "\033[48;2;255;100;10;38;2;255;255;255m"
C_GOLD = "\033[38;2;255;184;0m"
C_CYAN = "\033[38;2;0;210;255m"
C_GREEN = "\033[38;2;0;210;106m"
C_RED = "\033[38;2;255;51;75m"
C_VIOLET = "\033[38;2;140;82;255m"

def banner():
    print(f"""
{C_ORANGE}{C_BOLD}  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝{C_RESET}
    {C_DIM}Direct API · Kyoto 1080p · AniSkip Auto-Skip · Multi-Device{C_RESET}
""")

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def print_qr_code(url: str):
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.print_ascii(invert=True)
    except Exception:
        pass

def fzf_select(options: List[str], prompt: str = "Select > ", preview_cmd: Optional[str] = None) -> Optional[int]:
    """Interactively select an option using fzf, or fallback to numeric prompt."""
    if shutil.which("fzf"):
        cmd = ["fzf", "--ansi", f"--prompt={prompt}", "--reverse", "--height=50%", "--cycle"]
        if preview_cmd:
            cmd.extend(["--preview", preview_cmd])
        try:
            p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            out, _ = p.communicate(input="\n".join(options))
            if p.returncode == 0 and out.strip():
                selected = out.strip()
                return options.index(selected)
            return None
        except Exception:
            pass

    # Fallback numbered prompt
    print(f"\n{C_BOLD}{prompt}{C_RESET}")
    for i, opt in enumerate(options[:25], 1):
        print(f"  {C_CYAN}[{i:2d}]{C_RESET} {opt}")
    try:
        choice = input(f"\n{C_ORANGE}Enter number (1-{min(len(options), 25)}): {C_RESET}").strip()
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(options):
                return idx
    except (KeyboardInterrupt, EOFError):
        pass
    return None

def start_cloudflared_tunnel(port: int) -> Optional[tuple[subprocess.Popen, str]]:
    """Starts a cloudflared quick tunnel and extracts the https:// trycloudflare.com URL."""
    cf_bin = shutil.which("cloudflared") or os.path.expanduser("~/.local/bin/cloudflared")
    if not os.path.exists(cf_bin):
        return None

    cmd = [cf_bin, "tunnel", "--url", f"http://localhost:{port}"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    url = None
    start = time.time()
    while time.time() - start < 15:
        line = p.stderr.readline()
        if line:
            import re
            m = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", line)
            if m:
                url = m.group(0)
                break
        if p.poll() is not None:
            break

    if url:
        return p, url
    p.terminate()
    return None

# -----------------------------------------------------------------------------
# COMMAND: stream / server (Headless API server)
# -----------------------------------------------------------------------------
def cmd_stream(port: int = 8000, host: str = "0.0.0.0"):
    banner()
    print(f"{C_GREEN}⚡ Running headless anime streaming backend on port {port}...{C_RESET}\n")
    import uvicorn
    from main import app
    uvicorn.run(app, host=host, port=port)

# -----------------------------------------------------------------------------
# COMMAND: browser (Launches Web UI with optional --share tunnel)
# -----------------------------------------------------------------------------
def cmd_browser(port: int = 8000, share: bool = False, open_browser: bool = True):
    banner()
    local_ip = get_local_ip()
    local_url = f"http://localhost:{port}"
    wifi_url = f"http://{local_ip}:{port}"

    print(f"{C_BOLD}🚀 Starting Shinsei Anime Web Server...{C_RESET}")
    print(f"  • {C_BOLD}Local PC:{C_RESET}     {C_CYAN}{local_url}{C_RESET}")
    print(f"  • {C_BOLD}Home Wi-Fi:{C_RESET}   {C_CYAN}{wifi_url}{C_RESET}")

    tunnel_proc = None
    tunnel_url = None

    if share:
        print(f"\n{C_ORANGE}⏳ Establishing secure public tunnel (--share)...{C_RESET}")
        res = start_cloudflared_tunnel(port)
        if res:
            tunnel_proc, tunnel_url = res
            print(f"\n{C_GREEN}{C_BOLD}✨ PUBLIC SHARE LINK ACTIVE (Access from anywhere):{C_RESET}")
            print(f"  {C_BOLD}{C_ORANGE_BG} {tunnel_url} {C_RESET}\n")
            print(f"{C_DIM}Scan QR with phone camera to stream on cellular data or outside home:{C_RESET}")
            print_qr_code(tunnel_url)
        else:
            print(f"{C_RED}Could not establish tunnel. Accessible over Wi-Fi only.{C_RESET}")

    # Launch browser
    if open_browser:
        target_url = tunnel_url if (share and tunnel_url) else local_url
        threading.Timer(1.2, lambda: webbrowser.open(target_url)).start()

    try:
        import uvicorn
        from main import app
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
    finally:
        if tunnel_proc:
            tunnel_proc.terminate()

# -----------------------------------------------------------------------------
# COMMAND: mobile (Connects Android via ADB or Wi-Fi QR)
# -----------------------------------------------------------------------------
def cmd_mobile(port: int = 8000, share: bool = False):
    banner()
    adb_bin = shutil.which("adb") or os.path.expanduser("~/platform-tools/adb")
    devices = []

    if adb_bin and os.path.exists(adb_bin):
        try:
            out = subprocess.run([adb_bin, "devices"], capture_output=True, text=True)
            lines = [l.strip() for l in out.stdout.splitlines() if l.strip() and not l.startswith("List")]
            devices = [l.split()[0] for l in lines if "device" in l]
        except Exception:
            pass

    # Start server in background thread
    def run_srv():
        import uvicorn
        from main import app
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="error")

    t = threading.Thread(target=run_srv, daemon=True)
    t.start()
    time.sleep(1.0)

    if devices:
        print(f"{C_GREEN}{C_BOLD}📱 Android Device Detected via USB ({devices[0]})!{C_RESET}")
        print(f"  • Forwarding port {port} via ADB Reverse (Zero Latency)...")
        subprocess.run([adb_bin, "reverse", f"tcp:{port}", f"tcp:{port}"], check=False)
        print(f"  • Launching Shinsei Anime directly on your phone's browser...")
        subprocess.run([adb_bin, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", f"http://localhost:{port}"], check=False)
        print(f"\n{C_GREEN}✓ App launched on your Android device! Press Ctrl+C to stop.{C_RESET}")
    else:
        local_ip = get_local_ip()
        wifi_url = f"http://{local_ip}:{port}"
        print(f"{C_ORANGE}{C_BOLD}📱 Connect Your Phone over Wi-Fi:{C_RESET}")
        print(f"  Open this URL on your phone: {C_CYAN}{wifi_url}{C_RESET}\n")
        print(f"{C_DIM}Or scan this QR Code with your camera app:{C_RESET}")
        print_qr_code(wifi_url)
        print(f"{C_DIM}Server running. Press Ctrl+C to stop.{C_RESET}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping mobile server.")

# -----------------------------------------------------------------------------
# COMMAND: terminal (The 10x better ani-cli interactive player)
# -----------------------------------------------------------------------------
async def cmd_terminal(query: Optional[str] = None, dub: bool = False, continue_last: bool = False, download: bool = False):
    banner()
    anilab = AnilabClient()
    kyoto = KyotoResolver()

    # Continue watching mode
    if continue_last:
        items = await db.get_continue_watching(limit=1)
        if items:
            last = items[0]
            print(f"{C_GREEN}Resuming: {C_BOLD}{last.get('anime_title')}{C_RESET} (Episode {last.get('ep_num')})")
            query = last.get('anime_title')
        else:
            print(f"{C_RED}No watch history found. Starting search...{C_RESET}")

    # Search anime
    if not query:
        query = input(f"{C_ORANGE}{C_BOLD}Search Anime > {C_RESET}").strip()
        if not query:
            print("No query entered. Exiting.")
            return

    print(f"\n{C_CYAN}Searching Anilab catalog for '{query}'...{C_RESET}")
    results = await anilab.search(query)
    if not results:
        print(f"{C_RED}No anime found matching '{query}'.{C_RESET}")
        return

    # Select Anime
    anime = None
    if len(results) == 1:
        anime = results[0]
    else:
        options = [
            f"{p.get('title')} ({p.get('type') or 'TV'}) ★{p.get('score') or 'N/A'}"
            for p in results
        ]
        sel_idx = fzf_select(options, prompt="Select Anime > ")
        if sel_idx is None:
            return
        anime = results[sel_idx]

    anime_id = str(anime.get("id"))
    anime_title = anime.get("title", "Anime")
    print(f"\n{C_GREEN}Selected: {C_BOLD}{anime_title}{C_RESET}")

    # Fetch episodes
    print(f"{C_CYAN}Fetching episode list...{C_RESET}")
    episodes = await kyoto.get_episodes(anime_id)
    if not episodes:
        print(f"{C_RED}No episodes available for this title.{C_RESET}")
        return

    # Select Episode
    ep_options = [
        f"#{e.get('num', '?')} - {e.get('name') or 'Episode ' + str(e.get('num'))}"
        for e in episodes
    ]
    ep_idx = fzf_select(ep_options, prompt=f"Select Episode (1-{len(episodes)}) > ")
    if ep_idx is None:
        return

    episode = episodes[ep_idx]
    ep_id = str(episode.get("id"))
    ep_num = str(episode.get("num", "1"))
    print(f"{C_GREEN}Selected: {ep_options[ep_idx]}{C_RESET}")

    # Fetch Servers
    print(f"{C_CYAN}Resolving streaming servers...{C_RESET}")
    servers = await kyoto.get_servers(anime_id, ep_id)
    if not servers:
        print(f"{C_RED}No servers found for this episode.{C_RESET}")
        return

    # Filter SUB vs DUB
    target_lang = "dub" if dub else "sub"
    matched_servers = [s for s in servers if s.get("lang") == target_lang]
    if not matched_servers:
        matched_servers = servers  # fallback to whatever is available

    server = matched_servers[0]
    print(f"{C_CYAN}Extracting 1080p HLS stream from {server.get('name')} ({server.get('lang').upper()})...{C_RESET}")
    
    stream_res = await kyoto.resolve_stream(anime_id, server.get("id"))
    stream_url = stream_res.get("url")
    if not stream_url:
        print(f"{C_RED}Failed to resolve video stream.{C_RESET}")
        return

    # Download mode
    if download:
        filename = f"{anime_title} - Ep {ep_num}.mp4".replace("/", "-")
        print(f"\n{C_ORANGE}Downloading to '{filename}' via FFmpeg...{C_RESET}")
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-headers", "Referer: https://play.app/\r\n",
            "-i", stream_url, "-c", "copy", "-bsf:a", "aac_adtstoasc", filename
        ]
        subprocess.run(ffmpeg_cmd)
        print(f"{C_GREEN}✓ Download complete: {filename}{C_RESET}")
        return

    # AniSkip Integration: Fetch intro/outro timestamps
    print(f"{C_CYAN}Querying AniSkip for intro/outro skip times...{C_RESET}")
    skip_data = await aniskip.get_skip_times(anime_title, int(ep_num) if ep_num.isdigit() else 1, 1440.0)
    
    lua_script_path = None
    if skip_data.get("found") and skip_data.get("results"):
        op = next((r for r in skip_data["results"] if r.get("type") == "op"), None)
        if op:
            lua_script_path = f"/tmp/aniskip_{anime_id}_{ep_num}.lua"
            with open(lua_script_path, "w") as f:
                f.write(f"""
local op_start = {op['start']}
local op_end = {op['end']}
local has_skipped = false
mp.observe_property("time-pos", "number", function(name, val)
    if val and val >= op_start and val < op_end and not has_skipped then
        has_skipped = true
        mp.set_property_number("time-pos", op_end + 0.5)
        mp.osd_message("⚡ Skipped Opening Theme", 3)
    end
end)
""")
            print(f"{C_GOLD}⚡ AniSkip: Auto-skip Opening armed ({op['start']}s -> {op['end']}s){C_RESET}")

    # Launch MPV
    mpv_bin = shutil.which("mpv")
    if not mpv_bin:
        print(f"\n{C_RED}mpv is not installed. Stream URL:{C_RESET}\n{stream_url}")
        return

    mpv_cmd = [
        mpv_bin,
        f"--title={anime_title} - Episode {ep_num}",
        "--hwdec=auto",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "--referrer=https://play.app/",
        stream_url
    ]
    if lua_script_path and os.path.exists(lua_script_path):
        mpv_cmd.append(f"--script={lua_script_path}")

    print(f"\n{C_GREEN}{C_BOLD}▶ Playing in MPV... (Press 'q' to quit, Space to pause, arrows to seek){C_RESET}")
    try:
        subprocess.run(mpv_cmd)
    finally:
        if lua_script_path and os.path.exists(lua_script_path):
            try:
                os.remove(lua_script_path)
            except Exception:
                pass

        # Record progress
        await db.save_progress(
            anime_id=anime_id,
            ep_id=ep_id,
            position=1440.0,
            duration=1440.0,
            anime_title=anime_title,
            anime_poster=anime.get("poster", ""),
            ep_num=ep_num,
            ep_name=episode.get("name", "")
        )

# -----------------------------------------------------------------------------
# Main CLI Dispatcher
# -----------------------------------------------------------------------------
def main():
    import argparse
    parser = argparse.ArgumentParser(
        prog="anime-cli",
        description="⚡ Next-Gen Anime Streaming & Browser CLI",
        formatter_class=argparse.RawTextHelpFormatter
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # 1. Browser command
    p_browser = subparsers.add_parser("browser", help="Start the streaming server & launch web browser")
    p_browser.add_argument("-p", "--port", type=int, default=8000, help="Server port (default: 8000)")
    p_browser.add_argument("-s", "--share", action="store_true", help="Generate instant public HTTPS tunnel to stream from anywhere")
    p_browser.add_argument("--no-open", action="store_true", help="Do not automatically open the local browser")

    # 2. Stream / Server command
    p_stream = subparsers.add_parser("stream", aliases=["server"], help="Start headless streaming backend server")
    p_stream.add_argument("-p", "--port", type=int, default=8000, help="Server port (default: 8000)")
    p_stream.add_argument("-H", "--host", default="0.0.0.0", help="Host binding (default: 0.0.0.0)")

    # 3. Mobile command
    p_mobile = subparsers.add_parser("mobile", help="Launch on connected Android phone via ADB or display Wi-Fi QR")
    p_mobile.add_argument("-p", "--port", type=int, default=8000, help="Server port (default: 8000)")
    p_mobile.add_argument("-s", "--share", action="store_true", help="Generate public tunnel for mobile")

    # 4. Terminal command (ani-cli mode)
    p_term = subparsers.add_parser("terminal", help="Interactive terminal player in MPV (like ani-cli)")
    p_term.add_argument("query", nargs="?", default=None, help="Anime title to search")
    p_term.add_argument("-d", "--dub", action="store_true", help="Select English Dub stream")
    p_term.add_argument("-c", "--continue", dest="continue_last", action="store_true", help="Resume last watched anime")
    p_term.add_argument("-o", "--download", action="store_true", help="Download episode instead of streaming")

    # Allow passing anime title directly: anime-cli "one piece"
    args, unknown = parser.parse_known_args()

    import asyncio
    if args.command == "browser":
        cmd_browser(port=args.port, share=args.share, open_browser=not args.no_open)
    elif args.command in ("stream", "server"):
        cmd_stream(port=args.port, host=args.host)
    elif args.command == "mobile":
        cmd_mobile(port=args.port, share=args.share)
    elif args.command == "terminal":
        asyncio.run(cmd_terminal(query=args.query, dub=args.dub, continue_last=args.continue_last, download=args.download))
    else:
        # Default: if unknown arguments given, treat as terminal search
        q = " ".join(unknown).strip() if unknown else None
        asyncio.run(cmd_terminal(query=q))

if __name__ == "__main__":
    main()
