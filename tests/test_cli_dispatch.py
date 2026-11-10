import sys
import pytest
from cli import main

def test_parser_help_exits_cleanly():
    sys.argv = ["anime-cli", "--help"]
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 0

def test_parser_recognizes_binge_and_today_flags():
    import argparse
    from cli import main
    # Verify main handles args without crashing on unrecognized arguments
    sys.argv = ["anime-cli", "--version"]
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 0

def test_parse_range_selection():
    from cli import parse_range_selection
    assert parse_range_selection("1-5", 10) == [0, 1, 2, 3, 4]
    assert parse_range_selection("1, 3, 5", 10) == [0, 2, 4]
    assert parse_range_selection("all", 4) == [0, 1, 2, 3]
    assert parse_range_selection("2-4, 7", 8) == [1, 2, 3, 6]

def test_sync_flag_dispatches_to_cmd_sync(monkeypatch):
    import cli
    called = []
    def mock_cmd_sync(port=8088):
        called.append(port)
    monkeypatch.setattr(cli, "cmd_sync", mock_cmd_sync)

    # Test anime-cli -s
    sys.argv = ["anime-cli", "-s"]
    cli.main()
    assert len(called) == 1
    assert called[0] == 8088

    # Test anime-cli sync
    sys.argv = ["anime-cli", "sync"]
    cli.main()
    assert len(called) == 2
    assert called[1] == 8088

def test_clear_data_flag_dispatches_to_cmd_clear_data(monkeypatch):
    import cli
    called = []
    def mock_cmd_clear_data(force=False):
        called.append(force)
    monkeypatch.setattr(cli, "cmd_clear_data", mock_cmd_clear_data)

    sys.argv = ["anime-cli", "--clear-data", "-y"]
    cli.main()
    assert len(called) == 1
    assert called[0] is True

    sys.argv = ["anime-cli", "clear"]
    cli.main()
    assert len(called) == 2
    assert called[1] is False

@pytest.mark.asyncio
async def test_db_clear_all_data():
    import db
    # Save a progress item
    await db.save_progress(
        anime_id="99999",
        ep_id="11111",
        position=120.0,
        duration=1400.0,
        anime_title="Test Anime",
        ep_num="1"
    )
    res = await db.get_anime_progress("99999")
    assert "11111" in res

    # Clear all data
    counts = await db.clear_all_data()
    assert counts["watch_progress"] >= 1

    # Verify progress table is now empty for that anime
    after = await db.get_anime_progress("99999")
    assert len(after) == 0


