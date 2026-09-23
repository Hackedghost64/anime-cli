"""API routes for user progress, history, and watchlist."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import db

from fastapi import APIRouter, HTTPException, Request
import json
import db

router = APIRouter(prefix="/user", tags=["user"])

class WatchlistPayload(BaseModel):
    anime_id: str
    anime_title: Optional[str] = ""
    anime_poster: Optional[str] = ""
    anime_type: Optional[str] = ""

@router.post("/progress")
async def record_progress(request: Request):
    try:
        data = await request.json()
    except Exception:
        body = await request.body()
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            return {"ok": False, "error": "Invalid payload"}

    anime_id = str(data.get("anime_id", ""))
    ep_id = str(data.get("ep_id", ""))
    if not anime_id or not ep_id:
        return {"ok": False, "error": "Missing anime_id or ep_id"}

    try:
        position = float(data.get("position", 0))
        duration = float(data.get("duration", 0))
    except (ValueError, TypeError):
        position = 0.0
        duration = 0.0

    await db.save_progress(
        anime_id=anime_id,
        ep_id=ep_id,
        position=position,
        duration=duration,
        anime_title=data.get("anime_title") or "",
        anime_poster=data.get("anime_poster") or "",
        ep_num=str(data.get("ep_num") or ""),
        ep_name=data.get("ep_name") or ""
    )
    return {"ok": True}

@router.get("/progress/continue")
async def continue_watching(limit: int = 20):
    items = await db.get_continue_watching(limit=limit)
    return {"ok": True, "items": items}

@router.get("/progress/{anime_id}")
async def anime_progress(anime_id: str):
    progress = await db.get_anime_progress(anime_id)
    return {"ok": True, "progress": progress}

@router.delete("/progress/{anime_id}")
@router.post("/progress/remove/{anime_id}")
async def delete_progress(anime_id: str):
    await db.remove_progress(anime_id)
    return {"ok": True, "removed": anime_id}

@router.get("/watchlist")
async def get_watchlist():
    items = await db.get_watchlist()
    return {"ok": True, "items": items}

@router.post("/watchlist/toggle")
async def toggle_watchlist(payload: WatchlistPayload):
    added = await db.toggle_watchlist(
        anime_id=payload.anime_id,
        anime_title=payload.anime_title or "",
        anime_poster=payload.anime_poster or "",
        anime_type=payload.anime_type or ""
    )
    return {"ok": True, "added": added}

@router.get("/watchlist/check/{anime_id}")
async def check_watchlist(anime_id: str):
    exists = await db.is_in_watchlist(anime_id)
    return {"ok": True, "in_watchlist": exists}
