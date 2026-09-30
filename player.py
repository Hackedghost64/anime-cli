"""
Multi-platform Video Player Manager for anime-cli.
Supports Android Termux (MPV Android, VLC Android, Just Player, MX Player, System Chooser),
Windows (MPV, VLC, PotPlayer, MPC-HC), Linux, and macOS.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Terminal styling
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_RED = "\033[31m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_BLUE = "\033[34m"
C_MAGENTA = "\033[35m"
C_CYAN = "\033[36m"
C_ORANGE = "\033[38;5;208m"
C_GOLD = "\033[38;5;220m"


def is_termux() -> bool:
    """Detect if running inside Termux on Android."""
    if os.environ.get("TERMUX_VERSION"):
        return True
    prefix = os.environ.get("PREFIX", "")
    if "com.termux" in prefix:
        return True
    return os.path.exists("/data/data/com.termux")


def is_windows() -> bool:
    """Detect if running on Windows."""
    return sys.platform == "win32"


def is_macos() -> bool:
    """Detect if running on macOS."""
    return sys.platform == "darwin"


def is_linux() -> bool:
    """Detect if running on standard Linux (not Termux)."""
    return sys.platform.startswith("linux") and not is_termux()


def get_platform_name() -> str:
    if is_termux():
        return "termux"
    if is_windows():
        return "windows"
    if is_macos():
        return "macos"
    return "linux"


def get_config_dir() -> Path:
    """Return the configuration directory for anime-cli."""
    if is_windows():
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else Path.home() / "AppData" / "Roaming"
        conf_dir = base / "anime-cli"
    else:
        xdg = os.environ.get("XDG_CONFIG_HOME")
        base = Path(xdg) if xdg else Path.home() / ".config"
        conf_dir = base / "anime-cli"
    conf_dir.mkdir(parents=True, exist_ok=True)
    return conf_dir


def get_config_file() -> Path:
    return get_config_dir() / "config.json"


def load_config() -> Dict[str, Any]:
    cfg_file = get_config_file()
    if cfg_file.exists():
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_config(cfg: Dict[str, Any]) -> None:
    cfg_file = get_config_file()
    try:
        with open(cfg_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"{C_RED}Warning: Could not save config: {e}{C_RESET}")


def get_preferred_player() -> Optional[str]:
    cfg = load_config()
    return cfg.get("preferred_player")


def set_preferred_player(player_name: str) -> None:
    cfg = load_config()
    cfg["preferred_player"] = player_name
    save_config(cfg)


# -----------------------------------------------------------------------------
# Player Catalog Definitions
# -----------------------------------------------------------------------------

def get_player_catalog() -> List[Dict[str, Any]]:
    """Return list of players appropriate for the current platform."""
    plat = get_platform_name()

    if plat == "termux":
        return [
            {
                "id": "mpv-android",
                "name": "MPV Android (Recommended)",
                "description": "Hardware-accelerated native Android MPV app with custom gesture controls",
                "package": "is.xyz.mpv",
                "recommended": True,
            },
            {
                "id": "vlc-android",
                "name": "VLC for Android",
                "description": "Official VideoLAN VLC media player app",
                "package": "org.videolan.vlc",
                "recommended": False,
            },
            {
                "id": "just-player",
                "name": "Just Player",
                "description": "Clean, lightweight Android player based on ExoPlayer / Media3",
                "package": "com.brouken.player",
                "recommended": False,
            },
            {
                "id": "mx-player",
                "name": "MX Player",
                "description": "Popular Android video player with HW/HW+ multi-core decoding",
                "package": "com.mxtech.videoplayer.ad",
                "recommended": False,
            },
            {
                "id": "termux-open",
                "name": "Android System Chooser (Open With...)",
                "description": "Prompt with Android system app dialog to pick any video player installed",
                "package": None,
                "recommended": False,
            },
            {
                "id": "mpv",
                "name": "Termux MPV CLI (Terminal/X11)",
                "description": "Run MPV directly inside Termux terminal (requires Termux-X11 for video)",
                "package": None,
                "recommended": False,
            },
        ]

    elif plat == "windows":
        return [
            {
                "id": "mpv",
                "name": "MPV Player (Recommended)",
                "description": "Lightweight, ultra fast, includes auto AniSkip opening/ending skipper",
                "recommended": True,
            },
            {
                "id": "vlc",
                "name": "VLC Media Player",
                "description": "Versatile open-source media player by VideoLAN",
                "recommended": False,
            },
            {
                "id": "potplayer",
                "name": "Daum PotPlayer",
                "description": "Feature-rich Windows player with high-quality rendering",
                "recommended": False,
            },
            {
                "id": "mpc-hc",
                "name": "MPC-HC / MPC-BE",
                "description": "Classic Media Player Classic Home Cinema",
                "recommended": False,
            },
            {
                "id": "system",
                "name": "Default Windows Video Player",
                "description": "Launch system default browser / media player association",
                "recommended": False,
            },
        ]

    else:  # Linux or macOS
        catalog = [
            {
                "id": "mpv",
                "name": "MPV Media Player (Recommended)",
                "description": "Ultra fast, lightweight, with auto AniSkip OP/ED skipping",
                "recommended": True,
            },
            {
                "id": "vlc",
                "name": "VLC Media Player",
                "description": "Official VideoLAN VLC media player",
                "recommended": False,
            },
        ]
        if plat == "macos":
            catalog.insert(1, {
                "id": "iina",
                "name": "IINA",
                "description": "Modern macOS media player based on MPV",
                "recommended": False,
            })
        return catalog


def check_player_installed(player_id: str) -> bool:
    """Check if the given player is installed / available on system."""
    plat = get_platform_name()
    if plat == "termux":
        if player_id in ("mpv-android", "vlc-android", "just-player", "mx-player"):
            # Check via pm path if available, or assume available if am works
            return True
        if player_id == "termux-open":
            return shutil.which("termux-open-url") is not None or shutil.which("am") is not None
        if player_id == "mpv":
            return shutil.which("mpv") is not None
        return True

    elif plat == "windows":
        if player_id == "mpv":
            return shutil.which("mpv") is not None or shutil.which("mpv.exe") is not None
        if player_id == "vlc":
            if shutil.which("vlc") is not None:
                return True
            for p in [
                os.path.expandvars(r"%ProgramFiles%\VideoLAN\VLC\vlc.exe"),
                os.path.expandvars(r"%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe"),
            ]:
                if os.path.exists(p):
                    return True
            return False
        if player_id == "potplayer":
            for p in [
                os.path.expandvars(r"%ProgramFiles%\DAUM\PotPlayer\PotPlayer64.exe"),
                os.path.expandvars(r"%ProgramFiles(x86)%\DAUM\PotPlayer\PotPlayerMini.exe"),
                os.path.expandvars(r"%ProgramFiles%\DAUM\PotPlayer\PotPlayerMini64.exe"),
            ]:
                if os.path.exists(p):
                    return True
            return False
        if player_id == "mpc-hc":
            for p in [
                os.path.expandvars(r"%ProgramFiles%\MPC-HC\mpc-hc64.exe"),
                os.path.expandvars(r"%ProgramFiles(x86)%\MPC-HC\mpc-hc.exe"),
            ]:
                if os.path.exists(p):
                    return True
            return False
        return True

    else:
        return shutil.which(player_id) is not None


# -----------------------------------------------------------------------------
# Interactive Player Selection UI
# -----------------------------------------------------------------------------

def choose_player_interactive() -> str:
    """Prompt the user with a styled interactive menu to select preferred player."""
    catalog = get_player_catalog()
    current_pref = get_preferred_player()
    plat = get_platform_name()

    print()
    w = 68
    sep = "─" * (w - 2)
    print(f"{C_ORANGE}╭{sep}╮{C_RESET}")
    print(f"{C_ORANGE}│{C_BOLD}  🎬 CHOOSE YOUR PREFERRED VIDEO PLAYER ({plat.upper()}):{C_RESET}{' ' * max(0, w - 48 - len(plat))}{C_ORANGE}│{C_RESET}")
    print(f"{C_ORANGE}├{sep}┤{C_RESET}")

    for idx, p in enumerate(catalog, 1):
        pid = p["id"]
        is_cur = (pid == current_pref)
        prefix = f"{C_GREEN}●{C_RESET}" if is_cur else f"{C_DIM}○{C_RESET}"
        installed = check_player_installed(pid)
        inst_tag = f"{C_GREEN}[detected]{C_RESET}" if installed else f"{C_DIM}[not found]{C_RESET}"
        if plat == "termux" and p.get("package"):
            inst_tag = f"{C_CYAN}[Android App]{C_RESET}"

        rec_tag = f" {C_GOLD}★{C_RESET}" if p.get("recommended") else ""
        print(f"{C_ORANGE}│{C_RESET} {C_BOLD}{idx}.{C_RESET} {prefix} {C_BOLD}{p['name']}{C_RESET}{rec_tag} {inst_tag}")
        print(f"{C_ORANGE}│{C_RESET}     {C_DIM}{p['description']}{C_RESET}")

    print(f"{C_ORANGE}╰{sep}╯{C_RESET}")

    while True:
        try:
            choice = input(f"\n{C_ORANGE}Select player [1-{len(catalog)}] (or press Enter to keep current): {C_RESET}").strip()
            if not choice:
                if current_pref:
                    print(f"{C_GREEN}Keeping current player: {current_pref}{C_RESET}")
                    return current_pref
                # Default to recommended
                rec = next((p["id"] for p in catalog if p.get("recommended")), catalog[0]["id"])
                set_preferred_player(rec)
                print(f"{C_GREEN}Selected default player: {rec}{C_RESET}")
                return rec

            val = int(choice)
            if 1 <= val <= len(catalog):
                chosen = catalog[val - 1]["id"]
                set_preferred_player(chosen)
                print(f"\n{C_GREEN}✓ Preferred player set to: {C_BOLD}{catalog[val - 1]['name']}{C_RESET}\n")
                return chosen
            else:
                print(f"{C_RED}Please enter a number between 1 and {len(catalog)}.{C_RESET}")
        except ValueError:
            print(f"{C_RED}Invalid input. Please enter a number.{C_RESET}")
        except (KeyboardInterrupt, EOFError):
            print()
            return current_pref or catalog[0]["id"]


# -----------------------------------------------------------------------------
# Player Execution Engine
# -----------------------------------------------------------------------------

def resolve_player(player_override: Optional[str] = None) -> str:
    """Resolve the player to use (CLI override -> config -> default)."""
    if player_override:
        return player_override
    pref = get_preferred_player()
    if pref:
        return pref
    # Default based on platform
    if is_termux():
        return "mpv-android"
    return "mpv"


def play_stream(
    stream_url: str,
    anime_title: str,
    ep_num: Any,
    anime_id: str = "",
    ep_id: str = "",
    resume_position: float = 0.0,
    skip_data: Optional[Dict[str, Any]] = None,
    player_override: Optional[str] = None,
) -> Tuple[float, float]:
    """
    Launch playback of the anime stream in the requested or configured player.
    Returns (final_position, final_duration) for watch progress recording.
    """
    player = resolve_player(player_override).lower()
    plat = get_platform_name()
    title_label = f"{anime_title} - Episode {ep_num}"

    # 1. Android Termux Native Player Intents
    if plat == "termux" or player in ("mpv-android", "vlc-android", "just-player", "mx-player", "termux-open"):
        return _play_termux_intent(
            player=player,
            stream_url=stream_url,
            title_label=title_label,
            resume_position=resume_position
        )

    # 2. MPV Player (Desktop / Termux CLI)
    if player == "mpv":
        return _play_mpv(
            stream_url=stream_url,
            title_label=title_label,
            anime_id=anime_id,
            ep_id=ep_id,
            resume_position=resume_position,
            skip_data=skip_data
        )

    # 3. VLC Player (Desktop)
    if player == "vlc":
        return _play_vlc(
            stream_url=stream_url,
            title_label=title_label,
            resume_position=resume_position
        )

    # 4. PotPlayer (Windows)
    if player == "potplayer":
        return _play_potplayer(stream_url=stream_url, resume_position=resume_position)

    # 5. MPC-HC (Windows)
    if player == "mpc-hc":
        return _play_mpc(stream_url=stream_url, resume_position=resume_position)

    # 6. Default System Browser / Handler
    return _play_system_default(stream_url=stream_url)


def _play_termux_intent(
    player: str,
    stream_url: str,
    title_label: str,
    resume_position: float
) -> Tuple[float, float]:
    """Launch Android video player via am start intent or termux-open."""
    print(f"\n{C_GREEN}{C_BOLD}▶ Launching {player} on Android...{C_RESET}")

    intent_cmd: List[str] = []

    if player == "mpv-android":
        # Official MPV Android Activity
        intent_cmd = [
            "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", stream_url,
            "-t", "video/*",
            "-n", "is.xyz.mpv/.MPVActivity",
            "-e", "title", title_label,
            "--esa", "http-header-fields", "Referer: https://play.app/,User-Agent: Mozilla/5.0"
        ]
        if resume_position > 10:
            intent_cmd.extend(["--ei", "position", str(int(resume_position * 1000))])

    elif player == "vlc-android":
        # Official VLC Android Activity
        intent_cmd = [
            "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", stream_url,
            "-t", "video/*",
            "-n", "org.videolan.vlc/.gui.video.VideoPlayerActivity",
            "-e", "title", title_label,
            "--esa", "http-header-fields", "Referer: https://play.app/"
        ]
        if resume_position > 10:
            intent_cmd.extend(["--el", "from_start", str(int(resume_position * 1000))])

    elif player == "just-player":
        # Just Player
        intent_cmd = [
            "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", stream_url,
            "-t", "video/*",
            "-n", "com.brouken.player/.PlayerActivity",
            "-e", "title", title_label
        ]
        if resume_position > 10:
            intent_cmd.extend(["--ei", "position", str(int(resume_position * 1000))])

    elif player == "mx-player":
        # MX Player (Free or Pro)
        intent_cmd = [
            "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", stream_url,
            "-t", "video/*",
            "-e", "title", title_label,
            "--esa", "headers", "Referer: https://play.app/"
        ]
        if resume_position > 10:
            intent_cmd.extend(["--ei", "position", str(int(resume_position * 1000))])

    else:
        # termux-open fallback (System Chooser)
        if shutil.which("termux-open-url"):
            intent_cmd = ["termux-open-url", stream_url]
        else:
            intent_cmd = [
                "am", "start",
                "-a", "android.intent.action.VIEW",
                "-d", stream_url,
                "-t", "video/*"
            ]

    try:
        res = subprocess.run(intent_cmd, capture_output=True, text=True)
        if res.returncode != 0 and "Activity not found" in (res.stderr or ""):
            print(f"{C_YELLOW}Notice: {player} is not installed on this Android device.{C_RESET}")
            print(f"{C_CYAN}Falling back to Android system player chooser...{C_RESET}")
            fallback_cmd = ["am", "start", "-a", "android.intent.action.VIEW", "-d", stream_url, "-t", "video/*"]
            subprocess.run(fallback_cmd)
        elif res.returncode != 0:
            # If am failed (e.g. permission or not in Termux environment), try termux-open-url
            if shutil.which("termux-open-url"):
                subprocess.run(["termux-open-url", stream_url])
            else:
                print(f"{C_YELLOW}Player intent output: {res.stderr.strip()}{C_RESET}")
    except Exception as e:
        print(f"{C_RED}Error launching Android player: {e}{C_RESET}")
        print(f"Stream URL: {stream_url}")

    # Prompt user in Termux console
    print(f"\n{C_GOLD}Playing in Android player.{C_RESET}")
    print(f"{C_DIM}Press Enter when done watching to save progress and return, or 'q' to quit:{C_RESET} ", end="")
    try:
        ans = input().strip()
        if ans.lower() == "q":
            return (0.0, 0.0)
    except (KeyboardInterrupt, EOFError):
        print()
        return (0.0, 0.0)

    # Return estimated full watch if user finished episode
    return (1400.0, 1440.0)


def _play_mpv(
    stream_url: str,
    title_label: str,
    anime_id: str,
    ep_id: str,
    resume_position: float,
    skip_data: Optional[Dict[str, Any]]
) -> Tuple[float, float]:
    """Launch MPV with custom Lua AniSkip auto-skipping and progress tracking."""
    mpv_bin = shutil.which("mpv")
    if not mpv_bin and is_windows():
        mpv_bin = shutil.which("mpv.exe")

    if not mpv_bin:
        print(f"\n{C_RED}mpv is not installed or not in PATH.{C_RESET}")
        print(f"{C_CYAN}Install MPV or run `anime-cli --config-player` to pick a different player.{C_RESET}")
        print(f"Stream URL: {stream_url}\n")
        return (0.0, 0.0)

    # Cross-platform temp files
    temp_dir = tempfile.gettempdir()
    safe_aid = (anime_id or "anime").replace("/", "_")
    safe_eid = (ep_id or "ep").replace("/", "_")
    pid = os.getpid()
    progress_file = os.path.join(temp_dir, f"anime_cli_prog_{pid}_{safe_aid}_{safe_eid}.txt")
    lua_script_path = os.path.join(temp_dir, f"anime_cli_mpv_{pid}_{safe_aid}_{safe_eid}.lua")

    # Clean lua path for Windows escape
    norm_prog = progress_file.replace("\\", "/")

    lua_code = [
        f'local progress_file = "{norm_prog}"',
        'local last_pos = 0',
        'local last_dur = 0',
        'mp.observe_property("time-pos", "number", function(name, val)',
        '    if val then last_pos = val end',
        'end)',
        'mp.observe_property("duration", "number", function(name, val)',
        '    if val then last_dur = val end',
        'end)',
        'mp.register_event("shutdown", function()',
        '    local f = io.open(progress_file, "w")',
        '    if f then',
        '        f:write(string.format("%.2f %.2f", last_pos, last_dur))',
        '        f:close()',
        '    end',
        'end)'
    ]

    # Arm AniSkip OP/ED triggers if available
    if skip_data:
        op = skip_data.get("op")
        ed = skip_data.get("ed")
        if op and isinstance(op, dict) and "start" in op and "end" in op:
            op_start = float(op["start"])
            op_end = float(op["end"])
            lua_code.extend([
                f'local op_start = {op_start}',
                f'local op_end = {op_end}',
                'local op_skipped = false',
                'mp.observe_property("time-pos", "number", function(name, pos)',
                '    if pos and not op_skipped and pos >= op_start and pos < (op_end - 1) then',
                '        op_skipped = true',
                '        mp.set_property_number("time-pos", op_end)',
                '        mp.osd_message("⚡ Skipped Opening Theme", 3)',
                '    end',
                'end)'
            ])
            print(f"{C_GOLD}⚡ AniSkip: Auto-skip Opening armed ({int(op_start)}s -> {int(op_end)}s){C_RESET}")

        if ed and isinstance(ed, dict) and "start" in ed and "end" in ed:
            ed_start = float(ed["start"])
            ed_end = float(ed["end"])
            lua_code.extend([
                f'local ed_start = {ed_start}',
                f'local ed_end = {ed_end}',
                'local ed_skipped = false',
                'mp.observe_property("time-pos", "number", function(name, pos)',
                '    if pos and not ed_skipped and pos >= ed_start and pos < (ed_end - 1) then',
                '        ed_skipped = true',
                '        mp.set_property_number("time-pos", ed_end)',
                '        mp.osd_message("⚡ Skipped Ending Theme", 3)',
                '    end',
                'end)'
            ])
            print(f"{C_GOLD}⚡ AniSkip: Auto-skip Ending armed ({int(ed_start)}s -> {int(ed_end)}s){C_RESET}")

    try:
        with open(lua_script_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lua_code))
    except Exception as e:
        print(f"{C_RED}Warning: Failed to write MPV lua hook: {e}{C_RESET}")

    mpv_cmd = [
        mpv_bin,
        f"--title={title_label}",
        "--hwdec=auto",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "--referrer=https://play.app/",
        f"--script={lua_script_path}",
        stream_url
    ]

    if resume_position > 10:
        mpv_cmd.insert(len(mpv_cmd) - 1, f"--start={int(resume_position)}")

    print(f"\n{C_GREEN}{C_BOLD}▶ Playing in MPV... (Press 'q' to quit, Space to pause, arrows to seek){C_RESET}")
    final_pos = 0.0
    final_dur = 0.0
    try:
        subprocess.run(mpv_cmd)
    finally:
        if os.path.exists(progress_file):
            try:
                with open(progress_file, "r", encoding="utf-8") as f:
                    parts = f.read().strip().split()
                    if len(parts) >= 2:
                        final_pos = float(parts[0])
                        final_dur = float(parts[1])
                os.remove(progress_file)
            except Exception:
                pass
        if os.path.exists(lua_script_path):
            try:
                os.remove(lua_script_path)
            except Exception:
                pass

    return (final_pos, final_dur)


def _play_vlc(stream_url: str, title_label: str, resume_position: float) -> Tuple[float, float]:
    """Launch VLC player."""
    vlc_bin = shutil.which("vlc")
    if not vlc_bin and is_windows():
        for p in [
            os.path.expandvars(r"%ProgramFiles%\VideoLAN\VLC\vlc.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe"),
        ]:
            if os.path.exists(p):
                vlc_bin = p
                break

    if not vlc_bin:
        print(f"\n{C_RED}VLC is not installed or not in PATH.{C_RESET}")
        print(f"Stream URL: {stream_url}\n")
        return (0.0, 0.0)

    cmd = [
        vlc_bin,
        "--meta-title", title_label,
        "--http-referrer", "https://play.app/",
        "--http-user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ]
    if resume_position > 10:
        cmd.extend(["--start-time", str(int(resume_position))])
    cmd.append(stream_url)

    print(f"\n{C_GREEN}{C_BOLD}▶ Playing in VLC Player...{C_RESET}")
    subprocess.run(cmd)
    return (1400.0, 1440.0)


def _play_potplayer(stream_url: str, resume_position: float) -> Tuple[float, float]:
    """Launch PotPlayer on Windows."""
    pot_bin = None
    for p in [
        os.path.expandvars(r"%ProgramFiles%\DAUM\PotPlayer\PotPlayer64.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\DAUM\PotPlayer\PotPlayerMini.exe"),
        os.path.expandvars(r"%ProgramFiles%\DAUM\PotPlayer\PotPlayerMini64.exe"),
    ]:
        if os.path.exists(p):
            pot_bin = p
            break

    if not pot_bin:
        pot_bin = shutil.which("PotPlayer64.exe") or shutil.which("PotPlayerMini64.exe")

    if not pot_bin:
        print(f"\n{C_RED}PotPlayer was not found on your system.{C_RESET}")
        return (0.0, 0.0)

    cmd = [pot_bin, stream_url]
    if resume_position > 10:
        cmd.append(f"/seek={int(resume_position)}")
    print(f"\n{C_GREEN}{C_BOLD}▶ Playing in PotPlayer...{C_RESET}")
    subprocess.run(cmd)
    return (1400.0, 1440.0)


def _play_mpc(stream_url: str, resume_position: float) -> Tuple[float, float]:
    """Launch MPC-HC on Windows."""
    mpc_bin = None
    for p in [
        os.path.expandvars(r"%ProgramFiles%\MPC-HC\mpc-hc64.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\MPC-HC\mpc-hc.exe"),
    ]:
        if os.path.exists(p):
            mpc_bin = p
            break

    if not mpc_bin:
        mpc_bin = shutil.which("mpc-hc64.exe") or shutil.which("mpc-hc.exe")

    if not mpc_bin:
        print(f"\n{C_RED}MPC-HC was not found on your system.{C_RESET}")
        return (0.0, 0.0)

    cmd = [mpc_bin, stream_url]
    if resume_position > 10:
        cmd.append(f"/start {int(resume_position * 1000)}")
    print(f"\n{C_GREEN}{C_BOLD}▶ Playing in MPC-HC...{C_RESET}")
    subprocess.run(cmd)
    return (1400.0, 1440.0)


def _play_system_default(stream_url: str) -> Tuple[float, float]:
    """Launch default system handler."""
    print(f"\n{C_GREEN}Opening stream in default system player...{C_RESET}")
    if is_windows():
        os.startfile(stream_url)
    elif is_macos():
        subprocess.run(["open", stream_url])
    elif is_termux():
        subprocess.run(["termux-open-url", stream_url])
    else:
        subprocess.run(["xdg-open", stream_url])
    return (1400.0, 1440.0)
