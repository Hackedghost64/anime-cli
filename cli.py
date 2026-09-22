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
            print(f"\n{C_GREEN}{C_BOLD}✨ PUBLIC SHARE LINK ACTIVE (Stream anywhere):{C_RESET}")
            print(f"  {C_BOLD}{C_ORANGE_BG} {tunnel_url} {C_RESET}\n")
            print(f"{C_DIM}Scan QR code with phone camera to stream on mobile data:{C_RESET}")
            print_qr_code(tunnel_url)
        else:
            print(f"{C_RED}Could not establish tunnel. Accessible over Wi-Fi only.{C_RESET}")
    else:
        print(f"\n{C_DIM}Scan QR to stream on phone over home Wi-Fi:{C_RESET}")
        print_qr_code(wifi_url)

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
# COMMAND: terminal player (The 10x better ani-cli)
# -----------------------------------------------------------------------------
async def cmd_terminal(
    query: Optional[str] = None, 
    dub_pref: Optional[bool] = None, 
    continue_last: bool = False, 
    download: bool = False
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

        # Check if episode was finished (>88% watched)
        if last_dur > 0 and (last_pos / last_dur) >= 0.88:
            if cur_idx + 1 < len(episodes):
                episode = episodes[cur_idx + 1]
                resume_position = 0.0
                print(f"{C_GOLD}✓ Finished Episode {last_ep_num}. Auto-advancing to Episode {episode.get('num', cur_idx+2)}!{C_RESET}")
            else:
                episode = episodes[cur_idx]
                resume_position = 0.0
                print(f"{C_GOLD}You finished the latest available episode ({last_ep_num}). Replaying from start.{C_RESET}")
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

        ep_idx = fzf_select(ep_options, prompt=f"Select Episode (1-{len(episodes)}) > ")
        if ep_idx is None:
            return

        episode = episodes[ep_idx]

        # Check if selected episode has resume position
        p = prog_map.get(str(episode.get("id")))
        if p:
            pos = float(p.get("position", 0.0))
            dur = float(p.get("duration", 0.0))
            if pos > 10 and (dur == 0 or (pos / dur) < 0.88):
                resume_position = pos
                mins = int(resume_position // 60)
                secs = int(resume_position % 60)
                print(f"{C_GOLD}▶ Saved progress found: resuming at {mins:02d}:{secs:02d}{C_RESET}")

    ep_id = str(episode.get("id"))
    ep_num = str(episode.get("num", "1"))
    ep_name = episode.get("name") or f"Episode {ep_num}"
    print(f"{C_GREEN}Selected: #{ep_num} - {ep_name}{C_RESET}")

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
    if dub_pref is True:
        if dubs:
            selected_server = dubs[0]
            print(f"{C_GOLD}Using English Dub{C_RESET}")
        else:
            print(f"{C_RED}English Dub unavailable for this episode. Falling back to Japanese Sub.{C_RESET}")
            selected_server = subs[0] if subs else servers[0]
    elif dub_pref is False:
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
            else:
                selected_server = subs[0]
        elif dubs:
            print(f"{C_GOLD}Audio: English DUB (only option available){C_RESET}")
            selected_server = dubs[0]
        else:
            print(f"{C_GOLD}Audio: Japanese SUB (only option available){C_RESET}")
            selected_server = subs[0] if subs else servers[0]

    print(f"{C_CYAN}Extracting 1080p HLS stream from {selected_server.get('name')}...{C_RESET}")
    stream_res = await kyoto.resolve_stream(anime_id, selected_server.get("id"))
    stream_url = stream_res.get("url")
    if not stream_url:
        print(f"{C_RED}Failed to resolve video stream.{C_RESET}")
        return

    # Download mode
    if download:
        safe_title = "".join(c for c in anime_title if c.isalnum() or c in " -_").strip()
        filename = f"{safe_title} - Ep {ep_num}.mp4"
        print(f"\n{C_ORANGE}Downloading to '{filename}' via FFmpeg...{C_RESET}")
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-headers", "Referer: https://play.app/\r\n",
            "-i", stream_url, "-c", "copy", "-bsf:a", "aac_adtstoasc", filename
        ]
        subprocess.run(ffmpeg_cmd)
        print(f"{C_GREEN}✓ Download complete: {filename}{C_RESET}")
        return

    # AniSkip Integration: Auto-Skip Openings in MPV
    print(f"{C_CYAN}Querying AniSkip for opening/ending timestamps...{C_RESET}")
    skip_data = await aniskip.get_skip_times(anime_title, int(ep_num) if ep_num.isdigit() else 1, 1440.0)

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
        'local function save_pos(is_eof)',
        '    local pos = is_eof and (last_dur > 0 and last_dur or last_pos) or mp.get_property_number("time-pos", last_pos)',
        '    local dur = mp.get_property_number("duration", last_dur)',
        '    if pos and pos > 0 then',
        '        local f = io.open(progress_file, "w")',
        '        if f then',
        '            f:write(string.format("%.2f %.2f", pos, dur or 0))',
        '            f:close()',
        '        end',
        '    end',
        'end',
        'mp.register_event("end-file", function(e)',
        '    if e and e.reason == "eof" then',
        '        save_pos(true)',
        '    else',
        '        save_pos(false)',
        '    end',
        'end)',
        'mp.register_event("shutdown", function()',
        '    save_pos(false)',
        'end)'
    ]

    if skip_data.get("found") and skip_data.get("results"):
        op = next((r for r in skip_data["results"] if r.get("type") == "op"), None)
        if op:
            lua_code.extend([
                f"local op_start = {op['start']}",
                f"local op_end = {op['end']}",
                "local has_skipped = false",
                'mp.observe_property("time-pos", "number", function(name, val)',
                '    if val and val >= op_start and val < op_end and not has_skipped then',
                '        has_skipped = true',
                '        mp.set_property_number("time-pos", op_end + 0.5)',
                '        mp.osd_message("⚡ Skipped Opening Theme", 3)',
                '    end',
                'end)'
            ])
            print(f"{C_GOLD}⚡ AniSkip: Auto-skip Opening armed ({op['start']}s -> {op['end']}s){C_RESET}")

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

# -----------------------------------------------------------------------------
# Main Interactive Menu
# -----------------------------------------------------------------------------
async def interactive_menu():
    banner()
    menu_options = [
        "🔍 Search Anime",
        "▶ Continue Watching (Resume last episode)",
        "🌐 Launch Web Browser",
        "🔗 Share Public Tunnel (QR Code for phone)",
        "❌ Exit"
    ]
    sel = fzf_select(menu_options, prompt="Choose an action > ")
    if sel == 0:
        await cmd_terminal()
    elif sel == 1:
        await cmd_terminal(continue_last=True)
    elif sel == 2:
        cmd_browser()
    elif sel == 3:
        cmd_browser(share=True)
    else:
        print("Goodbye!")

# -----------------------------------------------------------------------------
# Main CLI Dispatcher
# -----------------------------------------------------------------------------
def main():
    import argparse
    parser = argparse.ArgumentParser(
        prog="anime-cli",
        description="⚡ anime-cli: The Modern, Next-Gen Anime Streaming & Browser CLI",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("-v", "--version", action="version", version="anime-cli 1.0.0")
    
    # Simple flags
    parser.add_argument("query", nargs="?", default=None, help="Anime title to search & watch immediately")
    parser.add_argument("-b", "--browser", action="store_true", help="Launch web browser app")
    parser.add_argument("-s", "--share", action="store_true", help="Generate public HTTPS tunnel & QR code for phone")
    parser.add_argument("-c", "--continue", dest="continue_last", action="store_true", help="Resume last watched anime episode")
    parser.add_argument("-d", "--dub", action="store_true", help="Prefer English Dub audio")
    parser.add_argument("--sub", action="store_true", help="Prefer Japanese Sub audio")
    parser.add_argument("-o", "--download", action="store_true", help="Download episode in 1080p MP4 via FFmpeg")
    parser.add_argument("-p", "--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--server", action="store_true", help="Run headless background streaming server")

    args, unknown = parser.parse_known_args()

    # Reconstruct query if user typed: anime-cli jujutsu kaisen (without quotes)
    if not args.query and unknown:
        args.query = " ".join(unknown).strip()

    dub_pref = None
    if args.dub:
        dub_pref = True
    elif args.sub:
        dub_pref = False

    # Dispatch based on simple flags
    if args.server or args.query in ("server", "serve", "stream"):
        cmd_stream(port=args.port)
    elif args.share or (args.query == "share"):
        cmd_browser(port=args.port, share=True)
    elif args.browser or (args.query == "browser"):
        cmd_browser(port=args.port, share=False)
    elif args.continue_last:
        asyncio.run(cmd_terminal(continue_last=True, dub_pref=dub_pref, download=args.download))
    elif args.query:
        asyncio.run(cmd_terminal(query=args.query, dub_pref=dub_pref, download=args.download))
    else:
        # No arguments: launch interactive menu
        asyncio.run(interactive_menu())

if __name__ == "__main__":
    main()
