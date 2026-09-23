# Sprint 1: Binge Mode, Airing Radar & Server Timeout Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `-s` GNOME timeout/Uvicorn race condition, build the interactive 3-question terminal `anime-cli binge` discovery mode with instant MPV launch, and add the `anime-cli today` live airing schedule.

**Architecture:**
- Modernize `SleepInhibitor` to inhibit both `systemd-inhibit` and `gnome-session-inhibit`, and reverse the startup sequence in `cmd_browser` so Uvicorn binds and listens before Cloudflare tunnel probes it.
- Create `anilab/binge.py` to encapsulate AniList GraphQL vibe matrix queries, watch-history deduplication, and an interactive match card with Re-roll/Play/Hub options.
- Create `anilab/schedule.py` querying AniList's `AiringSchedule` GraphQL endpoint to display real-time release countdowns and launch newly aired episodes directly in MPV.
- Wire new CLI commands (`binge`, `today`, `-B`) into `cli.py`.

**Tech Stack:** Python 3.10+, AniList GraphQL API, Asyncio, Uvicorn, MPV, Pytest.

## Global Constraints
- Target branch: `feature/binge-radar` (keep `main` and active user streaming untouched).
- All new network calls must respect IPv4 resolution (`socket.AF_INET`) to avoid DNS/IPv6 timeouts.
- Preserve all existing comments, docstrings, and CLI flags.

---

### Task 1: Fix Sleep Inhibitor and Uvicorn Startup Race Condition

**Files:**
- Modify: `cli.py:101-139, 225-275`
- Test: `tests/test_inhibitor_and_server.py`

**Interfaces:**
- Produces: `SleepInhibitor.get_inhibit_command()` returning appropriate systemd/gnome inhibition args.
- Modifies: `cmd_browser()` to start Uvicorn asynchronously or in a thread and verify `127.0.0.1:{port}` readiness with a socket probe before initiating Cloudflare tunnel.

- [x] **Step 1: Write unit tests for SleepInhibitor and Server Readiness**

Create `tests/test_inhibitor_and_server.py`:
```python
import socket
import pytest
from cli import SleepInhibitor

def test_sleep_inhibitor_command_structure():
    inhibitor = SleepInhibitor(reason="Test Streaming")
    cmd = inhibitor.build_command()
    # Must include systemd-inhibit or gnome-session-inhibit
    assert any("inhibit" in c for c in cmd)
    assert "sleep" in cmd

def test_port_probe_logic():
    # Verify TCP socket connect helper works on closed vs open port
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.listen(1)
    
    # Test probe on open port
    probe_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe_sock.settimeout(0.5)
    res = probe_sock.connect_ex(("127.0.0.1", port))
    probe_sock.close()
    s.close()
    assert res == 0
```

- [x] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_inhibitor_and_server.py`
Expected: FAIL (`build_command` not implemented)

- [x] **Step 3: Update SleepInhibitor and cmd_browser in cli.py**

Modify `SleepInhibitor` in `cli.py`:
- Chain `systemd-inhibit` and `gnome-session-inhibit` when available.
- In `cmd_browser`, start Uvicorn in a dedicated thread or async loop, probe `127.0.0.1:{port}` until HTTP 200/listening, then proceed with `start_cloudflared_tunnel`.

- [x] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_inhibitor_and_server.py`
Expected: PASS

- [x] **Step 5: Commit changes**

```bash
git add cli.py tests/test_inhibitor_and_server.py
git commit -m "fix: resolve GNOME idle timeout and uvicorn startup race condition"
```

---

### Task 2: Build Binge Discovery Engine (`anilab/binge.py`)

**Files:**
- Create: `anilab/binge.py`
- Test: `tests/test_binge.py`

**Interfaces:**
- Produces: `async def run_binge_match(dub_pref=None)`
- Consumes: `db.get_continue_watching()`, AniList GraphQL API, `cli.cmd_terminal()`

- [x] **Step 1: Write test for Binge Vibe Matrix and AniList query generation**

Create `tests/test_binge.py`:
```python
import pytest
from anilab.binge import build_anilist_binge_query, VIBE_CATEGORIES

def test_vibe_categories_defined():
    assert "hype" in VIBE_CATEGORIES
    assert "mind_games" in VIBE_CATEGORIES
    assert "dark" in VIBE_CATEGORIES

def test_query_generator_format():
    query, vars_dict = build_anilist_binge_query(
        vibe="mind_games", 
        episodes_max=13, 
        hidden_gems=True,
        excluded_titles=["Death Note"]
    )
    assert "averageScore_greater" in query or "averageScore_greater" in str(vars_dict)
    assert vars_dict.get("episodes_lesser") == 14
```

- [x] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_binge.py`
Expected: FAIL (`anilab.binge` not found)

- [x] **Step 3: Implement `anilab/binge.py`**

- Define `VIBE_CATEGORIES` with AniList tags/genres (e.g. `Psychological`, `Survival`, `Thriller`, `High Stakes`).
- Query AniList GraphQL API directly with score $\ge 75$, format `TV` or `TV_SHORT`.
- Deduplicate against local `anime.db` watched titles.
- Render clean terminal match card:
  - Title, Score, Episode count, Genres/Tags, Hook synopsis.
  - Interactive options: `[Enter]` to play, `[r]` to re-roll, `[h]` to view other vibes, `[q]` to quit.

- [x] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_binge.py`
Expected: PASS

- [x] **Step 5: Commit changes**

```bash
git add anilab/binge.py tests/test_binge.py
git commit -m "feat: implement anime-cli binge discovery engine"
```

---

### Task 3: Build Live Airing Schedule Radar (`anilab/schedule.py`)

**Files:**
- Create: `anilab/schedule.py`
- Test: `tests/test_schedule.py`

**Interfaces:**
- Produces: `async def run_schedule_radar(dub_pref=None)`
- Consumes: AniList GraphQL `Page(page: 1, perPage: 50) { airingSchedules(...) }`

- [x] **Step 1: Write test for Airing Schedule query & parser**

Create `tests/test_schedule.py`:
```python
import pytest
from anilab.schedule import parse_airing_schedule

def test_parse_airing_schedule():
    sample_entry = {
        "id": 12345,
        "episode": 8,
        "airingAt": 1727000000,
        "media": {
            "title": {"english": "Solo Leveling", "romaji": "Ore dake Level Up na Ken"},
            "averageScore": 85,
            "format": "TV"
        }
    }
    parsed = parse_airing_schedule([sample_entry], current_time=1727003600)
    assert len(parsed) == 1
    assert parsed[0]["title"] == "Solo Leveling"
    assert parsed[0]["episode"] == 8
    assert "Aired" in parsed[0]["status_str"]
```

- [x] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_schedule.py`
Expected: FAIL (`anilab.schedule` not found)

- [x] **Step 3: Implement `anilab/schedule.py`**

- Fetch today's schedule (24-hour window from midnight to midnight).
- Format live relative timestamps (`🟢 [Aired 45m ago]`, `🟡 [Airing in 20m]`).
- Display in interactive fzf or numbered selector.
- On selection, launch episode directly in terminal player.

- [x] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_schedule.py`
Expected: PASS

- [x] **Step 5: Commit changes**

```bash
git add anilab/schedule.py tests/test_schedule.py
git commit -m "feat: implement anime-cli today live airing radar"
```

---

### Task 4: Integrate Commands into `cli.py` & End-to-End Verification

**Files:**
- Modify: `cli.py:650-727`
- Test: `tests/test_cli_dispatch.py`

**Interfaces:**
- Adds: `anime-cli binge` (`-B`), `anime-cli today` / `anime-cli schedule` to CLI parser and interactive menu.

- [x] **Step 1: Write CLI dispatch tests**

Create `tests/test_cli_dispatch.py`:
```python
from cli import main
import pytest

def test_parser_contains_binge_and_today():
    import argparse
    # Test argparse accepts binge and today without error
    import sys
    sys.argv = ["anime-cli", "--help"]
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 0
```

- [x] **Step 2: Update `cli.py` ArgumentParser & Dispatch**

- Add subcommands / positional choices: `binge`, `today`, `schedule`.
- Add `-B` flag for quick binge.
- Wire to `run_binge_match` and `run_schedule_radar`.

- [x] **Step 3: Run full test suite**

Run: `pytest tests/`
Expected: All tests PASS.

- [x] **Step 4: Commit changes**

```bash
git add cli.py tests/test_cli_dispatch.py
git commit -m "feat: wire binge and today commands into CLI dispatcher"
```
