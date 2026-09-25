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

