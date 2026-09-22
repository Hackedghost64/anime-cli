"""AniSkip API integration for auto-skipping anime intros (OP) and outros (ED)."""
from __future__ import annotations
from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/skip", tags=["skip"])

_client: Optional[httpx.AsyncClient] = None
_mal_id_cache: Dict[str, Optional[int]] = {}

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client

async def lookup_mal_id(title: str) -> Optional[int]:
    """Resolve anime title to MyAnimeList ID using Jikan API."""
    clean_title = title.split("(")[0].strip()
    if clean_title in _mal_id_cache:
        return _mal_id_cache[clean_title]
    
    client = get_http_client()
    try:
        url = "https://api.jikan.moe/v4/anime"
        r = await client.get(url, params={"q": clean_title, "limit": 1})
        if r.status_code == 200:
            data = r.json().get("data", [])
            if data:
                mal_id = data[0].get("mal_id")
                _mal_id_cache[clean_title] = mal_id
                return mal_id
    except Exception:
        pass
    
    _mal_id_cache[clean_title] = None
    return None

@router.get("/times")
async def get_skip_times(
    title: str = Query(...), 
    episode: int = Query(...),
    duration: float = Query(0.0)
) -> Dict[str, Any]:
    """Fetch skip intervals (OP / ED) for a given anime title and episode number."""
    mal_id = await lookup_mal_id(title)
    if not mal_id:
        return {"found": False, "results": []}

    client = get_http_client()
    try:
        url = f"https://api.aniskip.com/v2/skip-times/{mal_id}/{episode}"
        params = [
            ("types[]", "op"),
            ("types[]", "ed"),
            ("episodeLength", str(int(duration)))
        ]
        r = await client.get(url, params=params)
        if r.status_code == 200:
            data = r.json()
            if data.get("found"):
                results = []
                for res in data.get("results", []):
                    interval = res.get("interval", {})
                    results.append({
                        "type": res.get("skipType"), # 'op' or 'ed'
                        "start": interval.get("startTime", 0),
                        "end": interval.get("endTime", 0)
                    })
                return {"found": True, "results": results}
    except Exception:
        pass

    return {"found": False, "results": []}
