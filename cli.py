#!/usr/bin/env python3
"""
⚡ anime-cli: The Ultimate Anime Streaming & Browser CLI
Direct mobile REST APIs, 1080p Kyoto streaming, AniSkip auto-skipping,
Sub/Dub audio selector, and instant zero-config public tunneling.
"""
from __future__ import annotations
import os
import sys
import time
import socket
import shutil
import urllib.parse
import webbrowser
import subprocess
import threading
import asyncio
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from anilab.client import AnilabClient
from anilab.kyoto import KyotoResolver
import aniskip
import db
from fastapi import FastAPI, Header, HTTPException, Request

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

def banner():
    print(f"""
{C_ORANGE}{C_BOLD}  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝{C_RESET}
    {C_DIM}Direct API · 1080p Kyoto · AniSkip Auto-Skip · Sub & Dub · Zero-Config{C_RESET}
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
    """Interactively select an option using fzf, or fallback to clean numeric prompt."""
    if shutil.which("fzf"):
        cmd = ["fzf", "--ansi", f"--prompt={prompt}", "--reverse", "--height=45%", "--cycle"]
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

def parse_range_selection(raw: str, max_count: int) -> List[int]:
    """Parses range strings like '1-12', '1,3,5', or 'all' into 0-indexed list of integers."""
    raw = raw.strip().lower()
    if raw in ("all", "*"):
        return list(range(max_count))
    indices = set()
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    for p in parts:
        if "-" in p:
            sub = p.split("-")
            if len(sub) == 2 and sub[0].isdigit() and sub[1].isdigit():
                start = max(1, int(sub[0]))
                end = min(max_count, int(sub[1]))
                for n in range(start, end + 1):
                    indices.add(n - 1)
        elif p.isdigit():
            val = int(p)
            if 1 <= val <= max_count:
                indices.add(val - 1)
    return sorted(list(indices))

def fzf_multi_select(options: List[str], prompt: str = "Select (TAB to pick multiple, Enter to confirm) > ") -> List[int]:
    """Interactively select multiple options using fzf -m, or fallback to range/number input."""
    if shutil.which("fzf"):
        cmd = [
            "fzf", "-m", "--ansi", f"--prompt={prompt}", 
            "--reverse", "--height=50%", "--cycle",
            "--header=TAB: select/deselect | Shift-TAB: toggle all | Enter: confirm selection"
        ]
        try:
            p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            out, _ = p.communicate(input="\n".join(options))
            if p.returncode == 0 and out.strip():
                selected_lines = [line.strip() for line in out.strip().split("\n") if line.strip()]
                indices = []
                for s in selected_lines:
                    if s in options:
                        indices.append(options.index(s))
                return sorted(list(set(indices)))
            return []
        except Exception:
            pass

    # Fallback to range / list input (e.g. 1-12, 1,3,5, all)
    print(f"\n{C_BOLD}{prompt}{C_RESET}")
    print(f"{C_DIM}Tip: Enter numbers or ranges like '1-12', '1,3,5', or 'all'{C_RESET}\n")
    for i, opt in enumerate(options, 1):
        print(f"  {C_CYAN}[{i:2d}]{C_RESET} {opt}")
    try:
        raw = input(f"\n{C_ORANGE}Enter episode(s) to download: {C_RESET}").strip()
        if not raw:
            return []
        return parse_range_selection(raw, len(options))
    except (KeyboardInterrupt, EOFError):
        return []

class SleepInhibitor:
    """Inhibits system sleep, idle timeout, and lid-close suspend while server is active."""
    def __init__(self, reason: str = "Streaming anime to mobile device"):
        self.reason = reason
        self._proc: Optional[subprocess.Popen] = None

    def build_command(self) -> list[str]:
        has_systemd = bool(shutil.which("systemd-inhibit"))
        has_gnome = bool(shutil.which("gnome-session-inhibit"))

        if has_systemd and has_gnome:
            return [
                "systemd-inhibit",
                "--what=sleep:idle:handle-lid-switch",
                "--who=anime-cli",
                f"--why={self.reason}",
                "gnome-session-inhibit",
                "--inhibit", "suspend:idle",
                "--app-id", "anime-cli",
                "--reason", self.reason,
                "sleep", "infinity"
            ]
        elif has_gnome:
            return [
                "gnome-session-inhibit",
                "--inhibit", "suspend:idle",
                "--app-id", "anime-cli",
                "--reason", self.reason,
                "sleep", "infinity"
            ]
        elif has_systemd:
            return [
                "systemd-inhibit",
                "--what=sleep:idle:handle-lid-switch",
                "--who=anime-cli",
                f"--why={self.reason}",
                "sleep", "infinity"
            ]
        return ["sleep", "infinity"]

    def start(self):
        cmd = self.build_command()
        if len(cmd) > 2:
            try:
                self._proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass

    def stop(self):
        if self._proc:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=1.0)
            except Exception:
                pass
            self._proc = None

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

def start_cloudflared_tunnel(port: int) -> Optional[tuple[subprocess.Popen, str]]:
    """Starts a cloudflared quick tunnel and extracts the https:// trycloudflare.com URL."""
    cf_bin = shutil.which("cloudflared") or os.path.expanduser("~/.local/bin/cloudflared")
    if not os.path.exists(cf_bin):
        return None

    log_path = f"/tmp/cf_tunnel_{port}.log"
    if os.path.exists(log_path):
        try:
            os.remove(log_path)
        except Exception:
            pass

    cmd = [
        cf_bin, "tunnel", 
        "--url", f"http://127.0.0.1:{port}", 
        "--edge-ip-version", "4",
        "--retries", "10",
        "--logfile", log_path
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    url = None
    start = time.time()
    import re
    while time.time() - start < 20:
        time.sleep(0.5)
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", errors="ignore") as f:
                    content = f.read()
                    if not url:
                        m = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", content)
                        if m:
                            url = m.group(0)
                    if url and "Registered tunnel connection" in content:
                        break
            except Exception:
                pass
        if p.poll() is not None:
            break

    if url:
        # Verify Cloudflare DNS propagation via DoH so phone never hits NXDOMAIN
        m = re.search(r"https://([a-zA-Z0-9\-]+\.trycloudflare\.com)", url)
        if m:
            domain = m.group(1)
            import urllib.request, json
            for _ in range(12):
                try:
                    doh_url = f"https://1.1.1.1/dns-query?name={domain}&type=A"
                    req = urllib.request.Request(doh_url, headers={"Accept": "application/dns-json"})
                    with urllib.request.urlopen(req, timeout=2.0) as resp:
                        d = json.loads(resp.read().decode())
                        if d.get("Status") == 0 and d.get("Answer"):
                            break
                except Exception:
                    pass
                time.sleep(1.0)
        time.sleep(1.0)
        return p, url
    p.terminate()
    return None

# -----------------------------------------------------------------------------
# COMMAND: stream / server (Headless API server)
# -----------------------------------------------------------------------------
def cmd_stream(port: int = 8000, host: str = "0.0.0.0", keep_awake: bool = True):
    banner()
    print(f"{C_GREEN}⚡ Running headless anime streaming backend on port {port}...{C_RESET}\n")
    inhibitor = SleepInhibitor() if keep_awake else None
    if inhibitor:
        inhibitor.start()
        print(f"  • {C_BOLD}Power State:{C_RESET} {C_GREEN}☕ Sleep & lid-close suspend inhibited (PC stays awake){C_RESET}\n")
    try:
        import uvicorn
        from main import app
        uvicorn.run(app, host=host, port=port, timeout_keep_alive=75)
    finally:
        if inhibitor:
            inhibitor.stop()

# -----------------------------------------------------------------------------
# COMMAND: browser (Launches Web UI with optional --share tunnel)
# -----------------------------------------------------------------------------
def cmd_browser(port: int = 8000, share: bool = False, open_browser: bool = True, keep_awake: bool = True):
    banner()
    local_ip = get_local_ip()
    local_url = f"http://localhost:{port}"
    wifi_url = f"http://{local_ip}:{port}"

    print(f"{C_BOLD}🚀 Starting Shinsei Anime Web Server...{C_RESET}")
    print(f"  • {C_BOLD}Local PC:{C_RESET}     {C_CYAN}{local_url}{C_RESET}")
    print(f"  • {C_BOLD}Home Wi-Fi:{C_RESET}   {C_CYAN}{wifi_url}{C_RESET}")

    inhibitor = SleepInhibitor() if keep_awake else None
    if inhibitor:
        inhibitor.start()
        print(f"  • {C_BOLD}Power State:{C_RESET} {C_GREEN}☕ Sleep & lid-close suspend inhibited (PC stays awake while streaming){C_RESET}")

    # 1. Start Uvicorn backend in background thread first so port is actively listening
    import uvicorn
    from main import app
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="warning", timeout_keep_alive=75)
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    # Wait until Uvicorn has bound and is accepting requests
    probe_start = time.time()
    while time.time() - probe_start < 5.0:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.1)

    tunnel_proc = None
    tunnel_url = None

    if share:
        print(f"\n{C_ORANGE}⏳ Establishing secure public tunnel (--share)...{C_RESET}")
        res = start_cloudflared_tunnel(port)
        if res:
            tunnel_proc, tunnel_url = res
            print(f"\n{C_GREEN}{C_BOLD}✨ PUBLIC SHARE LINK ACTIVE (Stream anywhere):{C_RESET}")
            print(f"  {C_BOLD}{C_ORANGE_BG} {tunnel_url} {C_RESET}\n")
            print(f"{C_DIM}Scan QR code with phone camera to stream on mobile data or Wi-Fi:{C_RESET}")
            print_qr_code(tunnel_url)
        else:
            print(f"{C_RED}Could not establish tunnel. Accessible over Wi-Fi only.{C_RESET}")
    else:
        print(f"\n{C_DIM}Scan QR to stream on phone over home Wi-Fi:{C_RESET}")
        print_qr_code(wifi_url)
        print(f"{C_DIM}💡 Tip: If phone says 'site can't be reached' on Wi-Fi, run: sudo ufw allow {port}/tcp{C_RESET}")
        print(f"{C_DIM}         Or stream with zero-config public tunnel: anime-cli -s{C_RESET}\n")

    # Launch browser
    if open_browser:
        target_url = tunnel_url if (share and tunnel_url) else local_url
        threading.Timer(1.2, lambda: webbrowser.open(target_url)).start()

    try:
        while server_thread.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        server.should_exit = True
    finally:
        server.should_exit = True
        if tunnel_proc:
            try:
                tunnel_proc.terminate()
                tunnel_proc.wait(timeout=1.0)
            except Exception:
                pass
        if inhibitor:
            inhibitor.stop()

def create_sync_app(token: str, sync_done_event: Optional[threading.Event] = None, sync_stats: Optional[dict] = None) -> FastAPI:
    sync_app = FastAPI()
    if sync_stats is None:
        sync_stats = {"received": 0, "sent": 0}

    @sync_app.post("/api/sync")
    async def handle_p2p_sync(request: Request, x_sync_token: Optional[str] = Header(None)):
        if x_sync_token != token:
            raise HTTPException(status_code=401, detail="Invalid sync token")

        data = await request.json()
        client_ts = int(data.get("client_timestamp") or time.time())
        phone_deltas = data.get("progress_deltas") or []

        # Merge phone deltas into PC SQLite using relative age conflict resolution
        merged_count = await db.merge_progress_deltas(phone_deltas, client_timestamp=client_ts)
        sync_stats["received"] = len(phone_deltas)

        # Get PC progress records
        pc_progress = await db.get_all_progress()
        sync_stats["sent"] = len(pc_progress)

        # Check for provider bundle script update
        latest_script = None
        script_path = os.path.join(os.path.dirname(__file__), "android/app/src/main/assets/provider.bundle.js")
        if os.path.exists(script_path):
            try:
                with open(script_path, "r", encoding="utf-8") as f:
                    latest_script = f.read()
            except Exception:
                pass

        # Trigger clean server exit in 600ms if event provided
        if sync_done_event:
            threading.Timer(0.6, sync_done_event.set).start()

        return {
            "ok": True,
            "merged": merged_count,
            "progress_deltas": pc_progress,
            "latest_script": latest_script
        }

    return sync_app

# -----------------------------------------------------------------------------
# COMMAND: sync (P2P Watch History Sync with Shinsei Mobile App)
# -----------------------------------------------------------------------------
def cmd_sync(port: int = 8088):
    import secrets
    import uvicorn

    banner()
    local_ip = get_local_ip()
    token = secrets.token_urlsafe(16)
    qr_payload = f"shinsei://sync?host={local_ip}&port={port}&token={token}"

    print(f"{C_BOLD}⚡ P2P MOBILE SYNC (Shinsei Android App){C_RESET}")
    print(f"  • {C_BOLD}Local Address:{C_RESET} http://{local_ip}:{port}")
    print(f"  • {C_BOLD}Auth Token:{C_RESET}    {token}")
    print(f"  • {C_DIM}Connect your phone to the same Wi-Fi network as this PC.{C_RESET}")
    print(f"  • {C_DIM}Firewall tip: If connection fails, allow port {port}: sudo ufw allow {port}/tcp{C_RESET}\n")

    print(f"{C_ORANGE}Scan this QR code with the Shinsei Android app camera:{C_RESET}")
    print_qr_code(qr_payload)

    sync_done_event = threading.Event()
    sync_stats = {"received": 0, "sent": 0}
    sync_app = create_sync_app(token, sync_done_event, sync_stats)

    config = uvicorn.Config(sync_app, host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    print(f"{C_CYAN}Waiting for Shinsei Android App to scan QR code (Press Ctrl+C to cancel)...{C_RESET}")
    try:
        while not sync_done_event.is_set():
            time.sleep(0.2)
        print(f"\n{C_GREEN}{C_BOLD}✓ P2P Synchronization successful!{C_RESET}")
        print(f"  • Received from phone: {sync_stats['received']} records")
        print(f"  • Sent to phone:       {sync_stats['sent']} records")
        print(f"  • Watch history is now 100% synchronized.\n")
    except KeyboardInterrupt:
        print("\nSync cancelled.")
    finally:
        server.should_exit = True
        time.sleep(0.3)

# -----------------------------------------------------------------------------
# COMMAND: terminal player (The 10x better ani-cli)
# -----------------------------------------------------------------------------
async def cmd_terminal(
    query: Optional[str] = None, 
    dub_pref: Optional[bool] = None, 
    continue_last: bool = False, 
    download: bool = False,
    ep_num: Optional[int] = None
):
    anilab = AnilabClient()
    kyoto = KyotoResolver()

    anime_id = None
    anime_title = None
    anime_poster = ""
    episode = None
    episodes = []
    resume_position = 0.0

    # 1. Continue watching mode
    if continue_last:
        items = await db.get_continue_watching(limit=1)
        if not items:
            print(f"{C_RED}No watch history found. Please search for an anime title.{C_RESET}")
            return
        last = items[0]
        anime_id = str(last.get("anime_id"))
        anime_title = last.get("anime_title") or f"Anime #{anime_id}"
        anime_poster = last.get("anime_poster", "")
        last_ep_id = str(last.get("ep_id", ""))
        last_ep_num = str(last.get("ep_num", "1"))
        last_pos = float(last.get("position", 0.0))
        last_dur = float(last.get("duration", 0.0))

        print(f"\n{C_GREEN}Found Continue Watching: {C_BOLD}{anime_title}{C_RESET}")
        print(f"{C_CYAN}Fetching episode list...{C_RESET}")
        episodes = await kyoto.get_episodes(anime_id)
        if not episodes:
            print(f"{C_RED}No episodes available for this title.{C_RESET}")
            return

        # Locate last watched episode
        cur_idx = 0
        for idx, ep in enumerate(episodes):
            if str(ep.get("id")) == last_ep_id or str(ep.get("num")) == last_ep_num:
                cur_idx = idx
                break

        # Check if last watched episode was completed (>= 90% or within 60s of end)
        is_completed = (last_dur > 0 and (last_pos / last_dur) >= 0.90) or (last_pos >= 1200 and (last_dur - last_pos) <= 60)
        if is_completed and cur_idx + 1 < len(episodes):
            cur_idx += 1
            episode = episodes[cur_idx]
            resume_position = 0.0
            print(f"{C_GOLD}▶ Episode {last_ep_num} was completed. Starting Episode {episode.get('num', cur_idx+1)}{C_RESET}")
        else:
            episode = episodes[cur_idx]
            resume_position = last_pos
            mins = int(resume_position // 60)
            secs = int(resume_position % 60)
            print(f"{C_GOLD}▶ Resuming Episode {episode.get('num', last_ep_num)} at {mins:02d}:{secs:02d}{C_RESET}")

    # 2. Search & Select Mode
    if not episode:
        if not query:
            query = input(f"{C_ORANGE}{C_BOLD}Search Anime > {C_RESET}").strip()
            if not query:
                print("No query entered. Exiting.")
                return

        print(f"\n{C_CYAN}Searching catalog for '{query}'...{C_RESET}")
        results = await anilab.search(query)
        if not results:
            print(f"{C_RED}No anime found matching '{query}'.{C_RESET}")
            return

        if len(results) == 1:
            anime = results[0]
        else:
            options = []
            for p in results:
                t = p.get('title') or f"Anime #{p.get('id')}"
                typ = p.get('type') or 'TV'
                sc = f"★{p.get('score')}" if p.get('score') else ""
                options.append(f"{t} ({typ}) {sc}".strip())

            sel_idx = fzf_select(options, prompt="Select Anime > ")
            if sel_idx is None:
                return
            anime = results[sel_idx]

        anime_id = str(anime.get("id"))
        anime_title = anime.get("title") or f"Anime {anime_id}"
        anime_poster = anime.get("poster", "")
        print(f"\n{C_GREEN}Selected: {C_BOLD}{anime_title}{C_RESET}")

        # Fetch episodes
        print(f"{C_CYAN}Fetching episode list...{C_RESET}")
        episodes = await kyoto.get_episodes(anime_id)
        if not episodes:
            print(f"{C_RED}No episodes available for this title.{C_RESET}")
            return

        # Fetch saved progress to show tags in episode list
        prog_map = await db.get_anime_progress(anime_id)

        ep_options = []
        for e in episodes:
            num = str(e.get('num', '?'))
            name = e.get('name') or f"Episode {num}"
            tag = ""
            p = prog_map.get(str(e.get("id")))
            if p:
                pos = float(p.get("position", 0.0))
                dur = float(p.get("duration", 0.0))
                if dur > 0 and (pos / dur) >= 0.88:
                    tag = " [WATCHED]"
                elif pos > 10:
                    tag = f" [{int(pos//60):02d}:{int(pos%60):02d}]"
            ep_options.append(f"#{num} - {name}{tag}")

        # Download mode: multi-select or range download
        if download:
            if ep_num is not None:
                match_idx = None
                for idx, e in enumerate(episodes):
                    if str(e.get("num")) == str(ep_num):
                        match_idx = idx
                        break
                download_indices = [match_idx if match_idx is not None else 0]
            else:
                download_indices = fzf_multi_select(
                    ep_options, 
                    prompt=f"Select Episode(s) to download (TAB to select multiple, Enter to confirm) > "
                )
                if not download_indices:
                    print("No episodes selected for download.")
                    return

            # Ask audio preference ONCE for the whole batch if needed
            active_dub_pref = dub_pref
            if active_dub_pref is None:
                first_ep = episodes[download_indices[0]]
                probe_servers = await kyoto.get_servers(anime_id, str(first_ep.get("id")))
                has_sub = any(s.get("lang") == "sub" for s in probe_servers)
                has_dub = any(s.get("lang") == "dub" for s in probe_servers)
                if has_sub and has_dub:
                    audio_opts = [
                        "🇯🇵 SUB - Japanese Audio with Subtitles",
                        "🇺🇸 DUB - English Audio"
                    ]
                    choice = fzf_select(audio_opts, prompt="Choose Audio for Download(s) > ")
                    active_dub_pref = (choice == 1)
                elif has_dub:
                    active_dub_pref = True
                else:
                    active_dub_pref = False

            successful_downloads = []
            for item_idx, ep_idx in enumerate(download_indices, 1):
                cur_ep = episodes[ep_idx]
                c_ep_id = str(cur_ep.get("id"))
                c_ep_num = str(cur_ep.get("num", ep_idx + 1))
                c_ep_name = cur_ep.get("name") or f"Episode {c_ep_num}"
                
                print(f"\n{C_BOLD}{C_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C_RESET}")
                print(f"{C_BOLD}📥 [{item_idx}/{len(download_indices)}] Downloading: #{c_ep_num} - {c_ep_name}{C_RESET}")
                print(f"{C_BOLD}{C_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C_RESET}")

                servers = await kyoto.get_servers(anime_id, c_ep_id)
                if not servers:
                    print(f"{C_RED}No servers found for Episode {c_ep_num}. Skipping.{C_RESET}")
                    continue

                subs = [s for s in servers if s.get("lang") == "sub"]
                dubs = [s for s in servers if s.get("lang") == "dub"]
                
                if active_dub_pref and dubs:
                    sel_srv = dubs[0]
                elif not active_dub_pref and subs:
                    sel_srv = subs[0]
                else:
                    sel_srv = servers[0]

                stream_res = await kyoto.resolve_stream(anime_id, sel_srv.get("id"))
                stream_url = stream_res.get("url")
                if not stream_url:
                    print(f"{C_RED}Failed to resolve stream for Episode {c_ep_num}. Skipping.{C_RESET}")
                    continue

                safe_title = "".join(c for c in anime_title if c.isalnum() or c in " -_").strip()
                filename = f"{safe_title} - Ep {c_ep_num}.mp4"
                print(f"{C_ORANGE}Saving 1080p MP4 to '{filename}' via FFmpeg...{C_RESET}")
                ffmpeg_cmd = [
                    "ffmpeg", "-y", "-headers", "Referer: https://play.app/\r\n",
                    "-i", stream_url, "-c", "copy", "-bsf:a", "aac_adtstoasc", filename
                ]
                ret = subprocess.run(ffmpeg_cmd)
                if ret.returncode == 0:
                    print(f"{C_GREEN}✓ Successfully downloaded: {filename}{C_RESET}")
                    successful_downloads.append(filename)
                else:
                    print(f"{C_RED}FFmpeg download failed for Episode {c_ep_num}.{C_RESET}")

            print(f"\n{C_BOLD}{C_GREEN}🎉 Batch download finished! ({len(successful_downloads)}/{len(download_indices)} episodes downloaded successfully){C_RESET}\n")
            return

        if ep_num is not None:
            match_idx = None
            for idx, e in enumerate(episodes):
                if str(e.get("num")) == str(ep_num):
                    match_idx = idx
                    break
            ep_idx = match_idx if match_idx is not None else 0
        else:
            ep_idx = fzf_select(ep_options, prompt=f"Select Episode (1-{len(episodes)}) > ")
            if ep_idx is None:
                return

        cur_idx = ep_idx
        episode = episodes[cur_idx]

        # Check if selected episode has resume position
        p = prog_map.get(str(episode.get("id")))
        if p:
            pos = float(p.get("position", 0.0))
            dur = float(p.get("duration", 0.0))
            if pos > 10 and (dur == 0 or (pos / dur) < 0.90):
                resume_position = pos
                mins = int(resume_position // 60)
                secs = int(resume_position % 60)
                print(f"{C_GOLD}▶ Saved progress found: resuming at {mins:02d}:{secs:02d}{C_RESET}")

    active_dub_pref = dub_pref
    while cur_idx < len(episodes):
        episode = episodes[cur_idx]
        ep_id = str(episode.get("id"))
        ep_num = str(episode.get("num", cur_idx + 1))
        ep_name = episode.get("name") or f"Episode {ep_num}"
        print(f"\n{C_GREEN}{C_BOLD}Selected: #{ep_num} - {ep_name}{C_RESET}")

        # Kick off AniSkip query concurrently in parallel with server extraction
        aniskip_task = None
        if not download:
            aniskip_task = asyncio.create_task(
                aniskip.get_skip_times(anime_title, int(ep_num) if str(ep_num).isdigit() else 1, 1440.0)
            )

        # Fetch Servers
        print(f"{C_CYAN}Resolving available stream servers...{C_RESET}")
        servers = await kyoto.get_servers(anime_id, ep_id)
        if not servers:
            print(f"{C_RED}No servers found for this episode.{C_RESET}")
            return

        # Separate SUB and DUB
        subs = [s for s in servers if s.get("lang") == "sub"]
        dubs = [s for s in servers if s.get("lang") == "dub"]

        selected_server = None

        # Handle language preference or prompt
        if active_dub_pref is True:
            if dubs:
                selected_server = dubs[0]
                print(f"{C_GOLD}Using English Dub{C_RESET}")
            else:
                print(f"{C_RED}English Dub unavailable for this episode. Falling back to Japanese Sub.{C_RESET}")
                selected_server = subs[0] if subs else servers[0]
        elif active_dub_pref is False:
            if subs:
                selected_server = subs[0]
                print(f"{C_GOLD}Using Japanese Sub{C_RESET}")
            else:
                print(f"{C_RED}Japanese Sub unavailable for this episode. Falling back to English Dub.{C_RESET}")
                selected_server = dubs[0] if dubs else servers[0]
        else:
            # Prompt user if both are available
            if subs and dubs:
                audio_opts = [
                    f"🇯🇵 SUB - Japanese Audio with Subtitles ({len(subs)} server{'s' if len(subs)>1 else ''})",
                    f"🇺🇸 DUB - English Audio ({len(dubs)} server{'s' if len(dubs)>1 else ''})"
                ]
                choice = fzf_select(audio_opts, prompt="Choose Audio > ")
                if choice == 1:
                    selected_server = dubs[0]
                    active_dub_pref = True
                else:
                    selected_server = subs[0]
                    active_dub_pref = False
            elif dubs:
                print(f"{C_GOLD}Audio: English DUB (only option available){C_RESET}")
                selected_server = dubs[0]
                active_dub_pref = True
            else:
                print(f"{C_GOLD}Audio: Japanese SUB (only option available){C_RESET}")
                selected_server = subs[0] if subs else servers[0]
                active_dub_pref = False

        print(f"{C_CYAN}Extracting 1080p HLS stream from {selected_server.get('name')}...{C_RESET}")
        stream_res = await kyoto.resolve_stream(anime_id, selected_server.get("id"))
        stream_url = stream_res.get("url")
        if not stream_url:
            print(f"{C_RED}Failed to resolve video stream.{C_RESET}")
            return

        # AniSkip Integration: Auto-Skip Openings in MPV
        skip_data = {}
        if aniskip_task:
            try:
                skip_data = await aniskip_task
            except Exception:
                skip_data = {}

        # Prepare MPV integration Lua script (AniSkip + Precise Playback Position Tracker)
        progress_file = f"/tmp/mpv_progress_{os.getpid()}_{anime_id}_{ep_id}.txt"
        lua_script_path = f"/tmp/anime_mpv_{os.getpid()}_{anime_id}_{ep_id}.lua"

        lua_code = [
            f'local progress_file = "{progress_file}"',
            'local last_pos = 0',
            'local last_dur = 0',
            'mp.observe_property("time-pos", "number", function(name, val)',
            '    if val then last_pos = val end',
            'end)',
            'mp.observe_property("duration", "number", function(name, val)',
            '    if val then last_dur = val end',
            'end)',
            'local function save_pos()',
            '    local pos = mp.get_property_number("time-pos") or last_pos',
            '    local dur = mp.get_property_number("duration") or last_dur',
            '    if pos and pos > 0 then',
            '        local f = io.open(progress_file, "w")',
            '        if f then',
            '            f:write(string.format("%.2f %.2f", pos, dur or 0))',
            '            f:close()',
            '        end',
            '    end',
            'end',
            'mp.add_periodic_timer(2, save_pos)',
            'mp.observe_property("pause", "bool", function(name, val) if val then save_pos() end end)',
            'mp.register_event("shutdown", save_pos)'
        ]

        if skip_data.get("found") and skip_data.get("results"):
            op = next((r for r in skip_data["results"] if r.get("type") == "op"), None)
            ed = next((r for r in skip_data["results"] if r.get("type") == "ed"), None)
            if op:
                lua_code.extend([
                    f"local op_start = {op['start']}",
                    f"local op_end = {op['end']}",
                    "local has_skipped_op = false",
                    'mp.observe_property("time-pos", "number", function(name, val)',
                    '    if val and val >= op_start and val < op_end and not has_skipped_op then',
                    '        has_skipped_op = true',
                    '        mp.set_property_number("time-pos", op_end + 0.5)',
                    '        mp.osd_message("⚡ Skipped Opening Theme", 3)',
                    '    end',
                    'end)'
                ])
                print(f"{C_GOLD}⚡ AniSkip: Auto-skip Opening armed ({int(op['start'])}s -> {int(op['end'])}s){C_RESET}")
            if ed:
                lua_code.extend([
                    f"local ed_start = {ed['start']}",
                    f"local ed_end = {ed['end']}",
                    "local has_skipped_ed = false",
                    'mp.observe_property("time-pos", "number", function(name, val)',
                    '    if val and val >= ed_start and val < ed_end and not has_skipped_ed then',
                    '        has_skipped_ed = true',
                    '        mp.set_property_number("time-pos", ed_end + 0.5)',
                    '        mp.osd_message("⚡ Skipped Ending Theme", 3)',
                    '    end',
                    'end)'
                ])
                print(f"{C_GOLD}⚡ AniSkip: Auto-skip Ending armed ({int(ed['start'])}s -> {int(ed['end'])}s){C_RESET}")

        with open(lua_script_path, "w") as f:
            f.write("\n".join(lua_code))

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
            f"--script={lua_script_path}",
            stream_url
        ]

        if resume_position > 10:
            mpv_cmd.insert(len(mpv_cmd) - 1, f"--start={int(resume_position)}")

        print(f"\n{C_GREEN}{C_BOLD}▶ Playing in MPV... (Press 'q' to quit, Space to pause, arrows to seek){C_RESET}")
        try:
            subprocess.run(mpv_cmd)
        finally:
            # Read exact time-pos and duration captured by Lua hook
            final_pos = 0.0
            final_dur = 0.0
            if os.path.exists(progress_file):
                try:
                    with open(progress_file, "r") as f:
                        parts = f.read().strip().split()
                        if len(parts) >= 2:
                            final_pos = float(parts[0])
                            final_dur = float(parts[1])
                except Exception:
                    pass
                try:
                    os.remove(progress_file)
                except Exception:
                    pass

            if os.path.exists(lua_script_path):
                try:
                    os.remove(lua_script_path)
                except Exception:
                    pass

            # Save actual watch progress to SQLite
            if final_pos > 5 and final_dur > 0:
                await db.save_progress(
                    anime_id=anime_id,
                    ep_id=ep_id,
                    position=final_pos,
                    duration=final_dur,
                    anime_title=anime_title,
                    anime_poster=anime_poster,
                    ep_num=ep_num,
                    ep_name=ep_name
                )
                mins = int(final_pos // 60)
                secs = int(final_pos % 60)
                print(f"\n{C_GREEN}✓ Saved watch progress: Episode {ep_num} at {mins:02d}:{secs:02d}{C_RESET}")

        # Auto-play next episode check
        is_completed = (final_dur > 0 and (final_pos / final_dur) >= 0.90) or (final_pos >= 1200 and (final_dur - final_pos) <= 60)
        if is_completed and cur_idx + 1 < len(episodes):
            cur_idx += 1
            resume_position = 0.0
            next_num = episodes[cur_idx].get("num", cur_idx + 1)
            print(f"\n{C_GOLD}{C_BOLD}▶ Episode {ep_num} finished! Autoplaying Episode {next_num} in 2s (Press Ctrl+C to stop)...{C_RESET}")
            try:
                await asyncio.sleep(2)
            except (asyncio.CancelledError, KeyboardInterrupt):
                break
        else:
            break

# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# Help & Shortcuts Guide
# -----------------------------------------------------------------------------
def show_help():
    banner()
    w = 78
    sep = "─" * (w - 2)
    print(f"{C_ORANGE}╭{sep}╮{C_RESET}")
    print(f"{C_ORANGE}│{C_BOLD}{'  ⚡ ANIME-CLI COMMANDS & SHORTCUTS GUIDE':<{w-2}}{C_RESET}{C_ORANGE}│{C_RESET}")
    print(f"{C_ORANGE}├{sep}┤{C_RESET}")
    
    def row(col1, col2):
        print(f"{C_ORANGE}│{C_RESET} {C_GOLD}{col1:<32}{C_RESET} {C_RESET}{col2:<41}{C_RESET} {C_ORANGE}│{C_RESET}")

    def header(title):
        print(f"{C_ORANGE}├{sep}┤{C_RESET}")
        print(f"{C_ORANGE}│{C_CYAN}{C_BOLD}  {title:<{w-4}}{C_RESET}{C_ORANGE}│{C_RESET}")
        print(f"{C_ORANGE}├{sep}┤{C_RESET}")

    header("COMMAND-LINE SYNTAX & USAGE")
    row("anime-cli", "Open interactive navigation dashboard")
    row("anime-cli <title>", "Search & stream immediately in MPV")
    row("anime-cli -b, --browser", "Launch modern Crunchyroll web interface")
    row("anime-cli -s, --share", "Start public HTTPS tunnel with mobile QR")
    row("anime-cli -c, --continue", "Resume last watched episode")
    row("anime-cli -B, --binge", "Launch Binge Roulette mood selector")
    row("anime-cli --today, --schedule", "View today's live anime release radar")
    row("anime-cli -o, --download [title]", "Batch download 1080p MP4 via FFmpeg")
    row("anime-cli -d, --dub", "Prefer English Dub audio servers")
    row("anime-cli --sub", "Prefer Japanese Sub audio servers")
    row("anime-cli help, -h", "Display this interactive help manual")

    header("MPV PLAYER KEYBOARD SHORTCUTS")
    row("Space  or  p", "Play / Pause playback")
    row("→  /  ←", "Seek forward / backward 5 seconds")
    row("Shift+→  /  Shift+←", "Seek forward / backward 60 seconds")
    row("↑  /  ↓", "Seek forward / backward 60 seconds")
    row("9  /  0", "Decrease / Increase volume")
    row("m", "Toggle audio mute")
    row("f", "Toggle fullscreen")
    row("j", "Cycle available audio tracks (Sub/Dub)")
    row("v", "Toggle subtitle track visibility")
    row("q", "Quit player & save resume progress")
    row(">  /  <", "Next / Previous playlist episode")

    header("MODERN WEB PLAYER KEYBOARD SHORTCUTS")
    row("Space  or  K", "Play / Pause playback")
    row("→  or  L", "Seek forward 10 seconds")
    row("←  or  J", "Seek backward 10 seconds")
    row("↑  /  ↓", "Adjust volume by 10%")
    row("F", "Toggle Fullscreen")
    row("T", "Toggle Theater Mode")
    row("P", "Toggle Picture-in-Picture (PiP)")
    row("M", "Toggle Mute")
    row("N", "Jump to Next Episode")
    row("?", "Toggle Help & Shortcuts Modal")
    row("Double-Tap (Mobile)", "Seek ±10s with visual ripple effect")
    row("⚡ Auto-Skip (Toggle)", "Automatically bypass Openings & Endings")

    print(f"{C_ORANGE}╰{sep}╯{C_RESET}")
    print()

# -----------------------------------------------------------------------------
# Main Interactive Menu
# -----------------------------------------------------------------------------
async def interactive_menu():
    while True:
        banner()
        menu_options = [
            "🔍 Search & Watch Anime",
            "🎲 Binge Roulette (Quick 3-Question Match)",
            "📅 Today's Airing Radar (Live Release Schedule)",
            "▶ Continue Watching (Resume last episode)",
            "📥 Download Episode (1080p MP4 via FFmpeg)",
            "⚡ P2P Mobile Sync (QR code for Shinsei Android app)",
            "🌐 Launch Web Browser",
            "🔗 Share Public Tunnel (QR Code for phone)",
            "❓ Help & Shortcuts Guide",
            "❌ Exit"
        ]
        sel = fzf_select(menu_options, prompt="Choose an action > ")
        if sel == 0:
            await cmd_terminal()
            break
        elif sel == 1:
            from anilab.binge import run_binge_match
            title = await run_binge_match()
            if title:
                await cmd_terminal(query=title, ep_num=1)
            break
        elif sel == 2:
            from anilab.schedule import run_schedule_radar
            res = await run_schedule_radar()
            if res:
                title, ep = res
                await cmd_terminal(query=title, ep_num=ep)
            break
        elif sel == 3:
            await cmd_terminal(continue_last=True)
            break
        elif sel == 4:
            await cmd_terminal(download=True)
            break
        elif sel == 5:
            cmd_sync()
            break
        elif sel == 6:
            cmd_browser()
            break
        elif sel == 7:
            cmd_browser(share=True)
            break
        elif sel == 8:
            show_help()
            try:
                input(f"\n{C_ORANGE}Press Enter to return to menu...{C_RESET}")
            except (KeyboardInterrupt, EOFError):
                break
        else:
            print("Goodbye!")
            break

# -----------------------------------------------------------------------------
# Main CLI Dispatcher
# -----------------------------------------------------------------------------
def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("help", "--help", "-h"):
        show_help()
        sys.exit(0)

    import argparse
    parser = argparse.ArgumentParser(
        prog="anime-cli",
        description="⚡ anime-cli: The Modern, Next-Gen Anime Streaming & Browser CLI",
        formatter_class=argparse.RawTextHelpFormatter,
        add_help=False
    )
    parser.add_argument("-h", "--help", action="store_true", help="Show help and shortcuts guide")
    parser.add_argument("-v", "--version", action="version", version="anime-cli 1.0.0")
    
    # Simple flags
    parser.add_argument("query", nargs="?", default=None, help="Anime title to search & watch immediately")
    parser.add_argument("-b", "--browser", action="store_true", help="Launch web browser app")
    parser.add_argument("-s", "--share", action="store_true", help="Generate public HTTPS tunnel & QR code for phone")
    parser.add_argument("-c", "--continue", dest="continue_last", action="store_true", help="Resume last watched anime episode")
    parser.add_argument("-B", "--binge", action="store_true", help="Launch interactive 3-question Binge Roulette")
    parser.add_argument("--today", "--schedule", dest="today", action="store_true", help="View today's live anime release radar")
    parser.add_argument("-d", "--dub", action="store_true", help="Prefer English Dub audio")
    parser.add_argument("--sub", action="store_true", help="Prefer Japanese Sub audio")
    parser.add_argument("-o", "--download", action="store_true", help="Download episode in 1080p MP4 via FFmpeg")
    parser.add_argument("--sync", action="store_true", help="Start P2P sync server & QR code for Shinsei Mobile App")
    parser.add_argument("-p", "--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--server", action="store_true", help="Run headless background streaming server")
    parser.add_argument("--no-sleep", "--keep-awake", dest="keep_awake", action="store_true", default=True, help="Prevent PC from sleeping or suspending while server is running (default: enabled)")
    parser.add_argument("--allow-sleep", dest="keep_awake", action="store_false", help="Allow PC to enter sleep/suspend while server is running")

    args, unknown = parser.parse_known_args()

    # Reconstruct query if user typed: anime-cli jujutsu kaisen (without quotes)
    if not args.query and unknown:
        args.query = " ".join(unknown).strip()

    dub_pref = None
    if args.dub:
        dub_pref = True
    elif args.sub:
        dub_pref = False

    # Handle 'download' or 'dl' command prefix
    if args.query and (args.query == "download" or args.query.startswith("download ") or args.query == "dl" or args.query.startswith("dl ")):
        args.download = True
        parts = args.query.split(maxsplit=1)
        args.query = parts[1] if len(parts) > 1 else None

    # Dispatch based on simple flags
    if args.sync or (args.query == "sync"):
        cmd_sync(port=8088 if args.port == 8000 else args.port)
    elif args.server or args.query in ("server", "serve", "stream"):
        cmd_stream(port=args.port, keep_awake=args.keep_awake)
    elif args.share or (args.query == "share"):
        cmd_browser(port=args.port, share=True, keep_awake=args.keep_awake)
    elif args.browser or (args.query == "browser"):
        cmd_browser(port=args.port, share=args.share, keep_awake=args.keep_awake)
    elif args.binge or (args.query == "binge"):
        from anilab.binge import run_binge_match
        async def _run_binge():
            title = await run_binge_match(dub_pref=dub_pref)
            if title:
                await cmd_terminal(query=title, dub_pref=dub_pref, download=args.download, ep_num=1)
        asyncio.run(_run_binge())
    elif args.today or (args.query in ("today", "schedule")):
        from anilab.schedule import run_schedule_radar
        async def _run_today():
            res = await run_schedule_radar(dub_pref=dub_pref)
            if res:
                title, ep = res
                await cmd_terminal(query=title, dub_pref=dub_pref, download=args.download, ep_num=ep)
        asyncio.run(_run_today())
    elif args.continue_last:
        asyncio.run(cmd_terminal(continue_last=True, dub_pref=dub_pref, download=args.download))
    elif args.download and not args.query:
        asyncio.run(cmd_terminal(download=True, dub_pref=dub_pref))
    elif args.query:
        asyncio.run(cmd_terminal(query=args.query, dub_pref=dub_pref, download=args.download))
    else:
        # No arguments: launch interactive menu
        asyncio.run(interactive_menu())

if __name__ == "__main__":
    main()
