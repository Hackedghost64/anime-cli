"""FastAPI router for /anime/* — Anilab2 catalog + Kyoto stream resolver."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from .client import AnilabClient
from .kyoto import KyotoResolver

router = APIRouter()

# Shared singletons (lazy)
_anilab: Optional[AnilabClient] = None
_kyoto: Optional[KyotoResolver] = None

def get_anilab() -> AnilabClient:
    global _anilab
    if _anilab is None:
        _anilab = AnilabClient()
    return _anilab

def get_kyoto() -> KyotoResolver:
    global _kyoto
    if _kyoto is None:
        _kyoto = KyotoResolver()
    return _kyoto

@router.get("/search")
async def anime_search(q: str = Query(..., min_length=1), page: int = 1):
    try:
        posts = await get_anilab().search(q, page=page)
        return {"ok": True, "posts": posts, "count": len(posts)}
    except Exception as e:
        raise HTTPException(502, f"anilab search failed: {e}")

@router.get("/home")
async def anime_home():
    try:
        data = await get_anilab().home()
        return {"ok": True, "data": data}
    except Exception as e:
        raise HTTPException(502, f"anilab home failed: {e}")

@router.get("/latest")
async def anime_latest(page: int = 1):
    try:
        posts = await get_anilab().latest(page=page)
        return {"ok": True, "posts": posts, "count": len(posts)}
    except Exception as e:
        raise HTTPException(502, f"anilab latest failed: {e}")

@router.get("/categories")
async def anime_categories():
    try:
        cats = await get_anilab().categories()
        return {"ok": True, "categories": cats}
    except Exception as e:
        raise HTTPException(502, f"anilab categories failed: {e}")

@router.get("/category")
async def anime_category(id: str = Query(...), page: int = 1):
    try:
        posts = await get_anilab().category(id, page=page)
        return {"ok": True, "posts": posts, "count": len(posts)}
    except Exception as e:
        raise HTTPException(502, f"anilab category failed: {e}")

# Backwards-compat aliases
@router.get("/post/{post_id}")
async def anime_post(post_id: str):
    try:
        data = await get_anilab().post(post_id)
        return {"ok": True, "data": data}
    except Exception as e:
        raise HTTPException(502, f"anilab post failed: {e}")

@router.get("/post/{post_id}/episodes")
async def anime_episodes(post_id: str):
    try:
        eps = await get_kyoto().get_episodes(post_id)
        return {"ok": True, "post_id": post_id, "episodes": eps, "count": len(eps)}
    except Exception as e:
        raise HTTPException(502, f"kyoto episodes failed: {e}")

@router.get("/post/{post_id}/servers/{ep_id}")
async def anime_servers(post_id: str, ep_id: str):  # ep_id is numeric, no slash
    try:
        srvs = await get_kyoto().get_servers(post_id, ep_id)
        return {"ok": True, "post_id": post_id, "episode_id": ep_id, "servers": srvs, "count": len(srvs)}
    except Exception as e:
        raise HTTPException(502, f"kyoto servers failed: {e}")

@router.get("/post/{post_id}/stream/{server_id:path}")
async def anime_stream(post_id: str, server_id: str):
    try:
        import urllib.parse
        res = await get_kyoto().resolve_stream(post_id, server_id)
        raw_url = res.get("url", "")
        proxy_url = f"/api/proxy/m3u8?url={urllib.parse.quote(raw_url)}" if raw_url else ""
        return {"ok": True, "post_id": post_id, "server_id": server_id, "proxy_url": proxy_url, **res}
    except Exception as e:
        raise HTTPException(502, f"kyoto stream resolve failed: {e}")

# Top-level convenient aliases matching plan spec
@router.get("/search-alias")
async def _alias_search(q: str = Query(...), page: int = 1):
    return await anime_search(q, page)

@router.get("/config")
async def anime_config():
    try:
        data = await get_anilab().config()
        return {"ok": True, "data": data}
    except Exception as e:
        raise HTTPException(502, f"anilab config failed: {e}")
