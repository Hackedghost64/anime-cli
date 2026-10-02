"""AniSkip API integration for looking up anime intros (OP) and outros (ED)."""
from __future__ import annotations
import asyncio
import re
from typing import Any, Dict, List, Optional
import httpx

try:
    from fastapi import APIRouter
    router = APIRouter(prefix="/skip", tags=["skip"])
except ImportError:
    router = None

_client: Optional[httpx.AsyncClient] = None
_mal_id_cache: Dict[str, Optional[int]] = {}

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"User-Agent": "anime-cli/1.0 (https://github.com/Hackedghost64/anime-cli)"}
        )
    return _client

def clean_anime_title(title: str) -> str:
    """Clean title by removing season suffixes, TV, dub tags, etc."""
    t = re.sub(r"\(.*?\)", "", title)
    t = re.sub(r"\[.*?\]", "", t)
    t = re.sub(r"\b(TV|Season\s*\d+|Part\s*\d+|2nd Season|3rd Season|Cour\s*\d+)\b", "", t, flags=re.IGNORECASE)
    t = re.sub(r"[:\-_]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

async def lookup_mal_id(title: str) -> Optional[int]:
    """Resolve anime title to MyAnimeList ID using AniList GraphQL (primary) and Jikan (fallback)."""
    clean_title = clean_anime_title(title)
    if not clean_title:
        clean_title = title.strip()

    if clean_title in _mal_id_cache:
        return _mal_id_cache[clean_title]

    client = get_http_client()

    # 1. Primary: AniList GraphQL (Fast, reliable, no 504 errors)
    try:
        query = """
        query ($search: String) {
          Media (search: $search, type: ANIME) {
            id
            idMal
          }
        }
        """
        r = await client.post(
            "https://graphql.anilist.co",
            json={"query": query, "variables": {"search": clean_title}},
            timeout=5.0
        )
        if r.status_code == 200:
            data = r.json()
            media = data.get("data", {}).get("Media")
            if media and media.get("idMal"):
                mal_id = int(media["idMal"])
                _mal_id_cache[clean_title] = mal_id
                return mal_id
    except Exception:
        pass

    # 2. Secondary fallback: Jikan API
    try:
        r = await client.get(
            "https://api.jikan.moe/v4/anime",
            params={"q": clean_title, "limit": 1},
            timeout=5.0
        )
        if r.status_code == 200:
            data = r.json().get("data", [])
            if data and data[0].get("mal_id"):
                mal_id = int(data[0]["mal_id"])
                _mal_id_cache[clean_title] = mal_id
                return mal_id
    except Exception:
        pass

    _mal_id_cache[clean_title] = None
    return None

async def get_skip_times(
    title: str, 
    episode: int,
    duration: float = 0.0
) -> Dict[str, Any]:
    """Fetch skip intervals (OP / ED) for a given anime title and episode number."""
    mal_id = await lookup_mal_id(title)
    if not mal_id:
        return {"found": False, "results": []}

    client = get_http_client()
    try:
        url = f"https://api.aniskip.com/v2/skip-times/{mal_id}/{episode}"
        # Zero tells AniSkip not to filter by duration when the exact runtime is unknown.
        params = [
            ("types[]", "op"),
            ("types[]", "ed"),
            ("episodeLength", str(int(duration)) if duration > 0 else "0")
        ]
        for attempt in range(2):
            try:
                r = await client.get(url, params=params, timeout=5.0)
                if r.status_code == 200:
                    data = r.json()
                    if data.get("found"):
                        results = []
                        op_dict = None
                        ed_dict = None
                        for res in data.get("results", []):
                            interval = res.get("interval", {})
                            skip_type = str(res.get("skipType", "")).lower()
                            item = {
                                "type": skip_type,  # 'op' or 'ed'
                                "start": float(interval.get("startTime", 0)),
                                "end": float(interval.get("endTime", 0))
                            }
                            results.append(item)
                            if skip_type == "op" and not op_dict:
                                op_dict = item
                            elif skip_type == "ed" and not ed_dict:
                                ed_dict = item
                        return {
                            "found": True,
                            "results": results,
                            "op": op_dict,
                            "ed": ed_dict,
                            "mal_id": mal_id
                        }
                    return {"found": False, "results": [], "mal_id": mal_id}
                if attempt == 0:
                    await asyncio.sleep(0.75)
            except Exception:
                if attempt == 0:
                    await asyncio.sleep(0.75)
    except Exception:
        pass

    return {"found": False, "results": [], "mal_id": mal_id}

if router is not None:
    router.add_api_route("/times", get_skip_times, methods=["GET"])
