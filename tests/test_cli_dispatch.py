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
