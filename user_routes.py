"""API routes for user progress, history, and watchlist."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import db

router = APIRouter(prefix="/user", tags=["user"])

class ProgressPayload(BaseModel):
    anime_id: str
    ep_id: str
    position: float
    duration: float
    anime_title: Optional[str] = ""
    anime_poster: Optional[str] = ""
    ep_num: Optional[str] = ""
    ep_name: Optional[str] = ""

class WatchlistPayload(BaseModel):
    anime_id: str
    anime_title: Optional[str] = ""
    anime_poster: Optional[str] = ""
    anime_type: Optional[str] = ""

@router.post("/progress")
async def record_progress(payload: ProgressPayload):
    await db.save_progress(
        anime_id=payload.anime_id,
        ep_id=payload.ep_id,
        position=payload.position,
        duration=payload.duration,
        anime_title=payload.anime_title or "",
        anime_poster=payload.anime_poster or "",
        ep_num=payload.ep_num or "",
        ep_name=payload.ep_name or ""
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
