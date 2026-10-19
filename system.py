"""
Decoupled module: system
Extracted from cli.py
"""
import os
import time
import socket
import shutil
import urllib.parse
import subprocess
import re
from typing import Any, Dict, List, Optional

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class SleepInhibitor:
    """Inhibits system sleep, idle timeout, and lid-close suspend while server is active."""
    def __init__(self, reason: str = "Streaming anime to mobile device"):
        self.reason = reason
        self._proc: Optional[subprocess.Popen] = None

    def build_command(self) -> list[str]:
        has_systemd = bool(shutil.which("systemd-inhibit"))
        has_gnome = bool(shutil.which("gnome-session-inhibit"))

        if has_systemd and has_gnome:
            return [
                "systemd-inhibit",
                "--what=sleep:idle:handle-lid-switch",
                "--who=anime-cli",
                f"--why={self.reason}",
                "gnome-session-inhibit",
                "--inhibit", "suspend:idle",
                "--app-id", "anime-cli",
                "--reason", self.reason,
                "sleep", "infinity"
            ]
        elif has_gnome:
            return [
                "gnome-session-inhibit",
                "--inhibit", "suspend:idle",
                "--app-id", "anime-cli",
                "--reason", self.reason,
                "sleep", "infinity"
            ]
        elif has_systemd:
            return [
                "systemd-inhibit",
                "--what=sleep:idle:handle-lid-switch",
                "--who=anime-cli",
                f"--why={self.reason}",
                "sleep", "infinity"
            ]
        return ["sleep", "infinity"]

    def start(self):
        cmd = self.build_command()
        if len(cmd) > 2:
            try:
                self._proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass

    def stop(self):
        if self._proc:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=1.0)
            except Exception:
                pass
            self._proc = None

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()


def start_cloudflared_tunnel(port: int) -> Optional[tuple[subprocess.Popen, str]]:
    """Starts a cloudflared quick tunnel and extracts the https:// trycloudflare.com URL."""
    cf_bin = shutil.which("cloudflared") or os.path.expanduser("~/.local/bin/cloudflared")
    if not os.path.exists(cf_bin):
        return None

    log_path = f"/tmp/cf_tunnel_{port}.log"
    if os.path.exists(log_path):
        try:
            os.remove(log_path)
        except Exception:
            pass

    cmd = [
        cf_bin, "tunnel", 
        "--url", f"http://127.0.0.1:{port}", 
        "--edge-ip-version", "4",
        "--retries", "10",
        "--logfile", log_path
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    url = None
    start = time.time()
    import re
    while time.time() - start < 20:
        time.sleep(0.5)
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", errors="ignore") as f:
                    content = f.read()
                    if not url:
                        m = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", content)
                        if m:
                            url = m.group(0)
                    if url and "Registered tunnel connection" in content:
                        break
            except Exception:
                pass
        if p.poll() is not None:
            break

    if url:
        # Verify Cloudflare DNS propagation via DoH so phone never hits NXDOMAIN
        m = re.search(r"https://([a-zA-Z0-9\-]+\.trycloudflare\.com)", url)
        if m:
            domain = m.group(1)
            import urllib.request, json
            for _ in range(12):
                try:
                    doh_url = f"https://1.1.1.1/dns-query?name={domain}&type=A"
                    req = urllib.request.Request(doh_url, headers={"Accept": "application/dns-json"})
                    with urllib.request.urlopen(req, timeout=2.0) as resp:
                        d = json.loads(resp.read().decode())
                        if d.get("Status") == 0 and d.get("Answer"):
                            break
                except Exception:
                    pass
                time.sleep(1.0)
        time.sleep(1.0)
        return p, url
    p.terminate()
    return None
