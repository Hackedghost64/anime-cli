"""Binge Discovery Engine for anime-cli.
Provides mood/vibe based matching, AniList querying, and 1-click play.
"""
from __future__ import annotations
import asyncio
import html
import random
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
import db

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
C_CARD_BG = "\033[48;5;236m"

# -----------------------------------------------------------------------------
# Curated Vibe Definitions
# -----------------------------------------------------------------------------
VIBE_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "hype": {
        "key": "hype",
        "name": "🔥 Hype & High-Octane",
        "description": "Adrenaline-fueled battles, God-tier animation, zero drag",
        "genres": ["Action"],
        "min_score": 78
    },
    "mind_games": {
        "key": "mind_games",
        "name": "🧠 200 IQ Mind Games",
        "description": "Psychological warfare, masterminds, cat-and-mouse deception",
        "genres": ["Psychological", "Mystery"],
        "min_score": 76
    },
    "dark": {
        "key": "dark",
        "name": "🔪 Dark & Gripping",
        "description": "Gritty thrillers, relentless tension, high-stakes survival",
        "genres": ["Thriller", "Mystery", "Horror"],
        "min_score": 76
    },
    "chill": {
        "key": "chill",
        "name": "🌙 Chill & Comedy",
        "description": "Peak laughs, wholesome vibes, low-stress comfort watching",
        "genres": ["Comedy", "Slice of Life"],
        "min_score": 75
    },
    "feels": {
        "key": "feels",
        "name": "😭 Emotional Wreck",
        "description": "Deep character bonds, tearjerkers, bittersweet profound drama",
        "genres": ["Drama", "Romance"],
        "min_score": 78
    }
}

def clean_description(text: Optional[str], max_len: int = 240) -> str:
    """Strips HTML tags, resolves entities, and trims description."""
    if not text:
        return "No synopsis available."
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = html.unescape(cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > max_len:
        return cleaned[:max_len].rsplit(" ", 1)[0] + "..."
    return cleaned

def build_anilist_binge_query(
    vibe: str,
    length_mode: str = "any",
    hidden_gems: bool = True,
    excluded_titles: Optional[List[str]] = None
) -> Tuple[str, Dict[str, Any]]:
    """Builds the AniList GraphQL query and variable dictionary."""
    vibe_cfg = VIBE_CATEGORIES.get(vibe, VIBE_CATEGORIES["hype"])
    
    query = """
    query (
      $page: Int,
      $perPage: Int,
      $genre_in: [String],
      $averageScore_greater: Int,
      $episodes_lesser: Int,
      $episodes_greater: Int,
      $popularity_lesser: Int,
      $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME,
          genre_in: $genre_in,
          averageScore_greater: $averageScore_greater,
          episodes_lesser: $episodes_lesser,
          episodes_greater: $episodes_greater,
          popularity_lesser: $popularity_lesser,
          format_in: [TV, TV_SHORT, ONA],
          status_in: [FINISHED, RELEASING],
          sort: $sort
        ) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          description(asHtml: false)
          episodes
          status
          averageScore
          popularity
          genres
        }
      }
    }
    """

    variables: Dict[str, Any] = {
        "page": 1,
        "perPage": 40,
        "genre_in": vibe_cfg["genres"],
        "averageScore_greater": vibe_cfg["min_score"],
        "sort": ["SCORE_DESC"]
    }

    if length_mode == "short":
        variables["episodes_lesser"] = 14
    elif length_mode == "medium":
        variables["episodes_greater"] = 13
        variables["episodes_lesser"] = 27
    elif length_mode == "long":
        variables["episodes_greater"] = 26

    if hidden_gems:
        # Avoid the ubiquitous top 100 anime
        variables["popularity_lesser"] = 95000
    else:
        variables["sort"] = ["POPULARITY_DESC"]

    return query, variables

async def fetch_binge_pool(
    vibe: str,
    length_mode: str = "any",
    hidden_gems: bool = True
) -> List[Dict[str, Any]]:
    """Fetches recommendation pool from AniList and filters out watched shows."""
    query, variables = build_anilist_binge_query(vibe, length_mode, hidden_gems)
    
    # 1. Get already watched titles from local SQLite db
    watched_titles = set()
    try:
        async with db.get_db() as conn:
            cursor = await conn.execute("SELECT DISTINCT anime_title FROM watch_progress WHERE anime_title != ''")
            rows = await cursor.fetchall()
            watched_titles = {r[0].strip().lower() for r in rows if r[0]}
    except Exception:
        pass

    # 2. Query AniList GraphQL
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://graphql.anilist.co",
                json={"query": query, "variables": variables},
                headers={"Content-Type": "application/json", "User-Agent": "anime-cli/1.0"}
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            media_list = data.get("data", {}).get("Page", {}).get("media", [])
    except Exception:
        return []

    # 3. Filter out watched and invalid items
    valid_pool = []
    for m in media_list:
        title_eng = (m.get("title", {}).get("english") or "").strip()
        title_rom = (m.get("title", {}).get("romaji") or "").strip()
        display_title = title_eng or title_rom
        if not display_title:
            continue
        
        # Check against watched history
        if display_title.lower() in watched_titles or (title_rom and title_rom.lower() in watched_titles):
            continue

        valid_pool.append({
            "id": m["id"],
            "title": display_title,
            "title_romaji": title_rom,
            "score": m.get("averageScore", 0),
            "episodes": m.get("episodes") or "?",
            "genres": m.get("genres", []),
            "description": clean_description(m.get("description")),
            "cover": (m.get("coverImage") or {}).get("large", "")
        })

    # Shuffle pool to keep recommendations spontaneous
    random.shuffle(valid_pool)
    return valid_pool

def render_binge_card(anime: Dict[str, Any], vibe_name: str) -> None:
    """Renders a sleek terminal recommendation card."""
    width = 68
    sep = "─" * (width - 2)
    genres_str = " • ".join(anime.get("genres", [])[:4])
    
    print()
    print(f"{C_PURPLE}╭{sep}╮{C_RESET}")
    print(f"{C_PURPLE}│{C_RESET} {C_BOLD}{C_GREEN}⚡ BINGE MATCH:{C_RESET} {C_BOLD}{anime['title'][:width-18]:<{width-18}}{C_RESET} {C_PURPLE}│{C_RESET}")
    print(f"{C_PURPLE}│{C_RESET} {C_YELLOW}★ {anime['score']}%{C_RESET} {C_DIM}|{C_RESET} {C_CYAN}Episodes: {anime['episodes']}{C_RESET} {C_DIM}|{C_RESET} {C_ORANGE}{vibe_name}{C_RESET}{' ' * max(0, width - len(str(anime['score'])) - len(str(anime['episodes'])) - len(vibe_name) - 24)}{C_PURPLE}│{C_RESET}")
    if genres_str:
        print(f"{C_PURPLE}│{C_RESET} {C_DIM}Vibe:{C_RESET} {genres_str[:width-10]:<{width-10}} {C_PURPLE}│{C_RESET}")
    print(f"{C_PURPLE}├{sep}┤{C_RESET}")
    
    # Word wrap description
    desc = anime.get("description", "")
    lines = []
    current_line = []
    current_len = 0
    for word in desc.split():
        if current_len + len(word) + 1 > (width - 6):
            lines.append(" ".join(current_line))
            current_line = [word]
            current_len = len(word)
        else:
            current_line.append(word)
            current_len += len(word) + 1
    if current_line:
        lines.append(" ".join(current_line))
    
    for l in lines[:4]:
        print(f"{C_PURPLE}│{C_RESET}  {l:<{width-5}} {C_PURPLE}│{C_RESET}")
    print(f"{C_PURPLE}╰{sep}╯{C_RESET}\n")

async def run_binge_match(dub_pref: Optional[bool] = None) -> Optional[str]:
    """Runs the 3-question quick match and returns chosen anime title to stream."""
    import shutil
    has_fzf = bool(shutil.which("fzf"))
    
    # Helper for fast selection
    def prompt_select(options: List[str], prompt: str) -> int:
        if has_fzf:
            from cli import fzf_select
            res = fzf_select(options, prompt=prompt)
            return res if res is not None else 0
        else:
            print(f"\n{C_BOLD}{prompt}{C_RESET}")
            for idx, opt in enumerate(options, 1):
                print(f"  [{idx}] {opt}")
            try:
                choice = input(f"{C_CYAN}Select option (1-{len(options)}): {C_RESET}").strip()
                if choice.isdigit() and 1 <= int(choice) <= len(options):
                    return int(choice) - 1
            except (KeyboardInterrupt, EOFError):
                pass
            return 0

    print(f"\n{C_BOLD}{C_PURPLE}🎲 BINGE ROULETTE — Quick Match (3 Questions){C_RESET}\n")

    # Question 1: Mood / Vibe
    vibe_keys = list(VIBE_CATEGORIES.keys())
    vibe_opts = [f"{v['name']}  {C_DIM}— {v['description']}{C_RESET}" for v in VIBE_CATEGORIES.values()]
    sel_vibe_idx = prompt_select(vibe_opts, "Select your vibe > ")
    sel_vibe_key = vibe_keys[sel_vibe_idx]
    vibe_name = VIBE_CATEGORIES[sel_vibe_key]["name"]

    # Question 2: Time Commitment
    length_opts = [
        "⚡ One-Night Sprint (≤ 13 Episodes)",
        "⚔️ Weekend Ride (14 - 26 Episodes)",
        "🏔️ Deep Dive Saga (27+ Episodes)",
        "🎲 Any Length"
    ]
    sel_len_idx = prompt_select(length_opts, "Select time commitment > ")
    length_mode = ["short", "medium", "long", "any"][sel_len_idx]

    # Question 3: Discovery Style
    discovery_opts = [
        "💎 Hidden Gems (Under-the-radar masterpieces, skip mainstream)",
        "👑 All-Time Bangers (Top-rated popularity hits)"
    ]
    sel_disc_idx = prompt_select(discovery_opts, "Select discovery style > ")
    hidden_gems = (sel_disc_idx == 0)

    # Fetch pool
    print(f"\n{C_CYAN}Scanning AniList for {vibe_name}...{C_RESET}")
    pool = await fetch_binge_pool(sel_vibe_key, length_mode=length_mode, hidden_gems=hidden_gems)

    if not pool:
        print(f"{C_RED}No uncompleted matches found for these filters. Relaxing gem filter...{C_RESET}")
        pool = await fetch_binge_pool(sel_vibe_key, length_mode="any", hidden_gems=False)

    if not pool:
        print(f"{C_RED}Could not reach AniList or no shows matched. Try a different vibe.{C_RESET}")
        return None

    card_idx = 0
    while card_idx < len(pool):
        current = pool[card_idx]
        render_binge_card(current, vibe_name)
        
        print(f"{C_BOLD}Actions:{C_RESET}")
        print(f"  [{C_GREEN}Enter{C_RESET}] ▶ Play Episode 1 Now")
        print(f"  [{C_YELLOW}r{C_RESET}]     🎲 Re-roll (Show another match in this vibe)")
        print(f"  [{C_PURPLE}h{C_RESET}]     📂 Switch Vibe")
        print(f"  [{C_RED}q{C_RESET}]     ❌ Exit")

        try:
            cmd = input(f"\n{C_CYAN}Your choice > {C_RESET}").strip().lower()
        except (KeyboardInterrupt, EOFError):
            print("\n")
            return None

        if cmd in ("", "enter", "play", "p"):
            return current["title"]
        elif cmd == "r":
            card_idx += 1
            if card_idx >= len(pool):
                print(f"{C_YELLOW}You've reached the end of this batch! Shuffling new results...{C_RESET}")
                random.shuffle(pool)
                card_idx = 0
        elif cmd == "h":
            return await run_binge_match(dub_pref=dub_pref)
        elif cmd == "q":
            return None
        else:
            return current["title"]

    return None
