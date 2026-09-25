"""Unit tests for P2P sync and relative-age conflict resolution."""
import os
import sys
import time
import pytest
import aiosqlite

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db
from cli import create_sync_app
from starlette.testclient import TestClient

@pytest.mark.asyncio
async def test_relative_age_conflict_resolution(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_sync.db")
    monkeypatch.setattr(db, "DB_FILE", test_db)
    monkeypatch.setattr(db, "_initialized", False)
    await db.init_db()

    now = int(time.time())
    
    # 1. Seed PC watch progress: Episode 1 watched 100 seconds ago
    async with db.get_db() as conn:
        await conn.execute("""
            INSERT INTO watch_progress 
            (anime_id, ep_id, anime_title, anime_poster, ep_num, ep_name, position, duration, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("101", "ep1", "Demon Slayer", "", "1", "Ep 1", 500.0, 1440.0, now - 100))
        await conn.commit()

    # 2. Incoming phone delta: Episode 1 watched 10 seconds ago on phone (phone clock has 300s clock drift!)
    phone_now = now + 300
    phone_delta = [{
        "anime_id": "101",
        "ep_id": "ep1",
        "position": 1200.0,
        "duration": 1440.0,
        "anime_title": "Demon Slayer",
        "ep_num": "1",
        "updated_at": phone_now - 10 # 10s ago on phone
    }]

    # Merge deltas
    merged = await db.merge_progress_deltas(phone_delta, client_timestamp=phone_now)
    assert merged == 1

    # Verify that the phone's position (1200.0) won because it was watched more recently (10s ago vs 100s ago)
    prog = await db.get_anime_progress("101")
    assert prog["ep1"]["position"] == 1200.0

    # 3. Incoming older delta: Episode 1 watched 500 seconds ago on phone
    older_phone_delta = [{
        "anime_id": "101",
        "ep_id": "ep1",
        "position": 200.0,
        "duration": 1440.0,
        "updated_at": phone_now - 500
    }]
    merged_older = await db.merge_progress_deltas(older_phone_delta, client_timestamp=phone_now)
    assert merged_older == 0

    # Ensure position is still 1200.0
    prog_after = await db.get_anime_progress("101")
    assert prog_after["ep1"]["position"] == 1200.0


@pytest.mark.asyncio
async def test_sync_api_endpoint(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_api_sync.db")
    monkeypatch.setattr(db, "DB_FILE", test_db)
    monkeypatch.setattr(db, "_initialized", False)
    await db.init_db()

    token = "test-secret-token-123"
    app = create_sync_app(token)
    client = TestClient(app)

    # 1. Unauthorized request (no token)
    res_no_auth = client.post("/api/sync", json={})
    assert res_no_auth.status_code == 401

    # 2. Unauthorized request (wrong token)
    res_bad_auth = client.post("/api/sync", json={}, headers={"X-Sync-Token": "wrong-token"})
    assert res_bad_auth.status_code == 401

    # 3. Authorized sync exchange
    payload = {
        "client_timestamp": int(time.time()),
        "progress_deltas": [{
            "anime_id": "999",
            "ep_id": "ep1",
            "anime_title": "Attack on Titan",
            "ep_num": "1",
            "position": 600.0,
            "duration": 1420.0,
            "updated_at": int(time.time())
        }]
    }

    res_ok = client.post("/api/sync", json=payload, headers={"X-Sync-Token": token})
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["ok"] is True
    assert data["merged"] == 1
    assert "progress_deltas" in data
    assert any(p["anime_id"] == "999" for p in data["progress_deltas"])
    # latest_script should be present or None if file not there
    assert "latest_script" in data

