"""Configuration module for anime-app."""
from __future__ import annotations
import os
import socket
from typing import Any, Dict

def _patch_ipv4():
    """If system lacks working IPv6 connectivity, prefer IPv4 to avoid 3-10s connect timeouts on dual-stack hosts."""
    try:
        s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
        s.connect(("2001:4860:4860::8888", 80))
        s.close()
    except Exception:
        _orig_getaddrinfo = socket.getaddrinfo
        def _getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            res = None
            if family == 0 or family == socket.AF_UNSPEC:
                try:
                    res = _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
                except Exception:
                    pass
            if not res:
                res = _orig_getaddrinfo(host, port, family, type, proto, flags)
            if host == "app.kyotoplayer.com" and res:
                res = sorted(res, key=lambda x: 1 if "104.21.87.227" in str(x[4]) else 0)
            return res
        socket.getaddrinfo = _getaddrinfo

_patch_ipv4()

class Settings:
    def __init__(self):
        self.host = os.environ.get("HOST", "0.0.0.0")
        self.port = int(os.environ.get("PORT", "8000"))
        
        # Anilab API
        self.anilab_base_url = os.environ.get("ANILAB_BASE_URL", "https://anilab2.amdapi.click/api")
        self.anilab_headers: Dict[str, str] = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "os-version": "35",
            "app-id": "com.xo.anilab",
            "app-version": "105",
            "os-id": "",
            "User-Agent": "okhttp/4.12.0"
        }
        
        # Kyoto API
        self.kyoto_base_url = os.environ.get("KYOTO_BASE_URL", "https://app.kyotoplayer.com/api/v4")
        self.kyoto_headers: Dict[str, str] = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "os-version": "35",
            "app-id": "com.kyotoplayer",
            "app-version": "126",
            "User-Agent": "okhttp/4.12.0"
        }
        
        # Database in standard user data dir (~/.local/share/anime-cli/anime.db)
        user_data_dir = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))
        app_data_dir = os.path.join(user_data_dir, "anime-cli")
        os.makedirs(app_data_dir, exist_ok=True)
        default_db = os.path.join(app_data_dir, "anime.db")

        # Migrate from old locations if standard db does not exist yet
        if not os.path.exists(default_db):
            old_candidates = [
                os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "anime.db"),
                os.path.expanduser("~/.local/lib/python3.10/site-packages/data/anime.db")
            ]
            for old_path in old_candidates:
                if os.path.exists(old_path):
                    import shutil
                    try:
                        shutil.copy2(old_path, default_db)
                        break
                    except Exception:
                        pass

        self.db_path = os.environ.get("DATABASE_PATH", default_db)

    def get(self, key: str, default: Any = None) -> Any:
        mapping = {
            "anilab.base_url": self.anilab_base_url,
            "anilab.headers": self.anilab_headers,
            "kyoto.base_url": self.kyoto_base_url,
            "kyoto.headers": self.kyoto_headers,
            "server.host": self.host,
            "server.port": self.port,
            "db_path": self.db_path,
        }
        return mapping.get(key, default)

_settings = Settings()

def settings() -> Settings:
    return _settings
