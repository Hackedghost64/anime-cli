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
    # Verify TCP socket connect probe works on open port
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
