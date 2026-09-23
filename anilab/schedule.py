"""Live Airing Schedule & Radar for anime-cli.
Fetches real-time release schedules from AniList and allows 1-click playback.
"""
from __future__ import annotations
import html
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

# -----------------------------------------------------------------------------
# ANSI Color Palette
# -----------------------------------------------------------------------------
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_CYAN = "\033[36m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_ORANGE = "\033[38;5;208m"
C_PURPLE = "\033[38;5;141m"
C_RED = "\033[31m"

def format_relative_time(airing_at: int, current_time: int) -> Tuple[str, str]:
    """Returns (status_icon, status_string)."""
    diff = airing_at - current_time
    if diff <= 0:
        elapsed = abs(diff)
        mins = elapsed // 60
        hours = mins // 60
        mins = mins % 60
        if hours > 0:
            return "🟢", f"Aired {hours}h {mins}m ago"
        return "🟢", f"Aired {mins}m ago"
    else:
        mins = diff // 60
        hours = mins // 60
        mins = mins % 60
        if hours < 2:
            return "🟡", f"Airing in {mins if hours == 0 else f'{hours}h {mins}m'}"
        return "⚪", f"Airing in {hours}h {mins}m"

def parse_airing_schedule(entries: List[Dict[str, Any]], current_time: Optional[int] = None) -> List[Dict[str, Any]]:
    """Parses raw AniList airing entries into clean display objects."""
    if current_time is None:
        current_time = int(time.time())

    parsed = []
    for item in entries:
        media = item.get("media") or {}
        title_eng = (media.get("title", {}).get("english") or "").strip()
        title_rom = (media.get("title", {}).get("romaji") or "").strip()
        display_title = title_eng or title_rom
        if not display_title:
            continue

        airing_at = item.get("airingAt", 0)
        icon, status_str = format_relative_time(airing_at, current_time)
        ep_num = item.get("episode", 1)
        score = media.get("averageScore", 0)
        genres = media.get("genres", [])

        parsed.append({
            "id": item["id"],
            "title": display_title,
            "title_romaji": title_rom,
            "episode": ep_num,
            "airing_at": airing_at,
            "is_aired": (airing_at <= current_time),
            "status_icon": icon,
            "status_str": status_str,
            "score": score,
            "format": media.get("format", "TV"),
            "genres": genres
        })

    # Sort: Aired shows first (newest to oldest), then upcoming shows
    parsed.sort(key=lambda x: (not x["is_aired"], -x["airing_at"] if x["is_aired"] else x["airing_at"]))
    return parsed

async def fetch_today_airing_schedule() -> List[Dict[str, Any]]:
    """Fetches today's full 24h airing schedule from AniList."""
    now = int(time.time())
    start_window = now - 43200  # -12h
    end_window = now + 43200    # +12h

    query = """
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id
          airingAt
          episode
          media {
            id
            title {
              english
              romaji
            }
            averageScore
            format
            genres
          }
        }
      }
    }
    """

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://graphql.anilist.co",
                json={"query": query, "variables": {"start": start_window, "end": end_window}},
                headers={"Content-Type": "application/json", "User-Agent": "anime-cli/1.0"}
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            raw_entries = data.get("data", {}).get("Page", {}).get("airingSchedules", [])
            return parse_airing_schedule(raw_entries, current_time=now)
    except Exception:
        return []

async def run_schedule_radar(dub_pref: Optional[bool] = None) -> Optional[Tuple[str, int]]:
    """Displays today's schedule and allows selecting an episode to play."""
    import shutil
    has_fzf = bool(shutil.which("fzf"))

    print(f"\n{C_BOLD}{C_GREEN}📅 TODAY'S ANIME AIRING RADAR (Live Schedule){C_RESET}\n")
    print(f"{C_CYAN}Fetching today's schedule from AniList...{C_RESET}")
    
    schedule = await fetch_today_airing_schedule()
    if not schedule:
        print(f"{C_RED}Could not fetch today's airing schedule. Please try again later.{C_RESET}")
        return None

    options = []
    for item in schedule:
        score_str = f"★ {item['score']}%" if item['score'] else "       "
        opt_text = f"{item['status_icon']} {item['status_str']:<20} | {item['title'][:40]:<40} | Ep {item['episode']:<2} | {score_str}"
        options.append(opt_text)

    sel_idx = None
    if has_fzf:
        from cli import fzf_select
        sel_idx = fzf_select(options, prompt="Select episode to watch > ")
    else:
        for idx, opt in enumerate(options[:25], 1):
            print(f"  [{idx:2d}] {opt}")
        try:
            choice = input(f"\n{C_CYAN}Select an episode to watch (1-{min(len(options), 25)}): {C_RESET}").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(options):
                sel_idx = int(choice) - 1
        except (KeyboardInterrupt, EOFError):
            pass

    if sel_idx is not None and 0 <= sel_idx < len(schedule):
        selected = schedule[sel_idx]
        return selected["title"], selected["episode"]

    return None
