"""Database layer for anime watch progress and watchlist using aiosqlite."""
from __future__ import annotations
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
import aiosqlite
from config import settings

DB_FILE = settings().db_path
_initialized = False

async def init_db():
    global _initialized
    os.makedirs(os.path.dirname(os.path.abspath(DB_FILE)), exist_ok=True)
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute("PRAGMA journal_mode = WAL;")
        await db.execute("PRAGMA synchronous = NORMAL;")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS watch_progress (
                anime_id TEXT NOT NULL,
                ep_id TEXT NOT NULL,
                anime_title TEXT DEFAULT '',
                anime_poster TEXT DEFAULT '',
                ep_num TEXT DEFAULT '',
                ep_name TEXT DEFAULT '',
                position REAL DEFAULT 0,
                duration REAL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (anime_id, ep_id)
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_watch_progress_updated 
            ON watch_progress (updated_at DESC)
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                anime_id TEXT PRIMARY KEY,
                anime_title TEXT DEFAULT '',
                anime_poster TEXT DEFAULT '',
                anime_type TEXT DEFAULT '',
                status TEXT DEFAULT 'watching',
                added_at INTEGER NOT NULL
            )
        """)
        await db.commit()
    _initialized = True

@asynccontextmanager
async def get_db():
    if not _initialized:
        await init_db()
    async with aiosqlite.connect(DB_FILE) as db:
        yield db

async def save_progress(
    anime_id: str,
    ep_id: str,
    position: float,
    duration: float,
    anime_title: str = "",
    anime_poster: str = "",
    ep_num: str = "",
    ep_name: str = ""
):
    now = int(time.time())
    async with get_db() as db:
        await db.execute("""
            INSERT INTO watch_progress 
            (anime_id, ep_id, anime_title, anime_poster, ep_num, ep_name, position, duration, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(anime_id, ep_id) DO UPDATE SET
                position=excluded.position,
                duration=excluded.duration,
                updated_at=excluded.updated_at,
                anime_title=CASE WHEN excluded.anime_title != '' THEN excluded.anime_title ELSE watch_progress.anime_title END,
                anime_poster=CASE WHEN excluded.anime_poster != '' THEN excluded.anime_poster ELSE watch_progress.anime_poster END,
                ep_num=CASE WHEN excluded.ep_num != '' THEN excluded.ep_num ELSE watch_progress.ep_num END,
                ep_name=CASE WHEN excluded.ep_name != '' THEN excluded.ep_name ELSE watch_progress.ep_name END
        """, (str(anime_id), str(ep_id), anime_title, anime_poster, str(ep_num), ep_name, position, duration, now))
        await db.commit()

async def get_anime_progress(anime_id: str) -> Dict[str, Dict[str, Any]]:
    """Return dict of {ep_id: {position, duration, updated_at}} for an anime."""
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT ep_id, position, duration, updated_at FROM watch_progress WHERE anime_id=?", 
            (str(anime_id),)
        ) as cursor:
            rows = await cursor.fetchall()
            return {r["ep_id"]: dict(r) for r in rows}

async def get_continue_watching(limit: int = 20) -> List[Dict[str, Any]]:
    """Return the most recently watched anime with their latest episode progress."""
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT wp.* FROM watch_progress wp
            INNER JOIN (
                SELECT anime_id, MAX(updated_at) as max_updated
                FROM watch_progress
                GROUP BY anime_id
            ) latest ON wp.anime_id = latest.anime_id AND wp.updated_at = latest.max_updated
            ORDER BY wp.updated_at DESC
            LIMIT ?
        """, (limit,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def remove_progress(anime_id: str) -> bool:
    """Deletes watch progress for a given anime_id."""
    async with get_db() as db:
        await db.execute("DELETE FROM watch_progress WHERE anime_id=?", (str(anime_id),))
        await db.commit()
        return True

async def toggle_watchlist(
    anime_id: str,
    anime_title: str = "",
    anime_poster: str = "",
    anime_type: str = ""
) -> bool:
    """Toggles anime in watchlist. Returns True if added, False if removed."""
    async with get_db() as db:
        async with db.execute("SELECT 1 FROM watchlist WHERE anime_id=?", (str(anime_id),)) as cursor:
            exists = await cursor.fetchone()
            
        if exists:
            await db.execute("DELETE FROM watchlist WHERE anime_id=?", (str(anime_id),))
            await db.commit()
            return False
        else:
            now = int(time.time())
            await db.execute("""
                INSERT INTO watchlist (anime_id, anime_title, anime_poster, anime_type, added_at)
                VALUES (?, ?, ?, ?, ?)
            """, (str(anime_id), anime_title, anime_poster, anime_type, now))
            await db.commit()
            return True

async def get_watchlist() -> List[Dict[str, Any]]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM watchlist ORDER BY added_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def is_in_watchlist(anime_id: str) -> bool:
    async with get_db() as db:
        async with db.execute("SELECT 1 FROM watchlist WHERE anime_id=?", (str(anime_id),)) as cursor:
            return (await cursor.fetchone()) is not None

async def get_all_progress() -> List[Dict[str, Any]]:
    """Return all watch progress records for P2P synchronization."""
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM watch_progress ORDER BY updated_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def merge_progress_deltas(deltas: List[Dict[str, Any]], client_timestamp: int) -> int:
    """Merge incoming deltas using relative-age conflict resolution.
    
    age = client_timestamp - delta['updated_at']
    pc_age = now - existing['updated_at']
    If incoming record is newer (smaller relative age), update.
    """
    now = int(time.time())
    updated_count = 0
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        for d in deltas:
            anime_id = str(d.get("anime_id", ""))
            ep_id = str(d.get("ep_id", ""))
            if not anime_id or not ep_id:
                continue

            client_updated_at = int(d.get("updated_at") or 0)
            incoming_age = max(0, client_timestamp - client_updated_at)
            normalized_updated_at = max(0, now - incoming_age)

            async with db.execute(
                "SELECT position, duration, updated_at FROM watch_progress WHERE anime_id=? AND ep_id=?",
                (anime_id, ep_id)
            ) as cursor:
                existing = await cursor.fetchone()

            should_update = False
            if not existing:
                should_update = True
            else:
                existing_age = max(0, now - int(existing["updated_at"]))
                if incoming_age < existing_age:
                    should_update = True

            if should_update:
                await db.execute("""
                    INSERT INTO watch_progress
                    (anime_id, ep_id, anime_title, anime_poster, ep_num, ep_name, position, duration, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(anime_id, ep_id) DO UPDATE SET
                        position=excluded.position,
                        duration=excluded.duration,
                        updated_at=excluded.updated_at,
                        anime_title=CASE WHEN excluded.anime_title != '' THEN excluded.anime_title ELSE watch_progress.anime_title END,
                        anime_poster=CASE WHEN excluded.anime_poster != '' THEN excluded.anime_poster ELSE watch_progress.anime_poster END,
                        ep_num=CASE WHEN excluded.ep_num != '' THEN excluded.ep_num ELSE watch_progress.ep_num END,
                        ep_name=CASE WHEN excluded.ep_name != '' THEN excluded.ep_name ELSE watch_progress.ep_name END
                """, (
                    anime_id,
                    ep_id,
                    d.get("anime_title") or "",
                    d.get("anime_poster") or "",
                    str(d.get("ep_num")) if d.get("ep_num") is not None else "",
                    d.get("ep_name") or "",
                    float(d.get("position") or 0.0),
                    float(d.get("duration") or 0.0),
                    normalized_updated_at
                ))
                updated_count += 1
        await db.commit()
    return updated_count

