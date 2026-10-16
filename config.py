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
        # 1. Base Defaults
        default_anilab_url = "https://anilab2.amdapi.click/api"
        default_anilab_headers: Dict[str, str] = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "os-version": "35",
            "app-id": "com.xo.anilab",
            "app-version": "105",
            "os-id": "",
            "User-Agent": "okhttp/4.12.0"
        }
        default_kyoto_url = "https://app.kyotoplayer.com/api/v4"
        default_kyoto_headers: Dict[str, str] = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "os-version": "35",
            "app-id": "com.kyotoplayer",
            "app-version": "126",
            "User-Agent": "okhttp/4.12.0"
        }
        default_stream_headers: Dict[str, str] = {
            "Referer": "https://play.app/",
            "X-Requested-With": "PLAY",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        default_host = "0.0.0.0"
        default_port = 8000

        # 2. Search for shared config.json
        config_candidates = [
            os.environ.get("ANIME_CLI_CONFIG"),
            os.path.expanduser("~/.config/anime-cli/config.json"),
            os.path.expanduser("~/.local/share/anime-cli/config.json"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json"),
            os.path.join(os.getcwd(), "config.json"),
        ]
        self.config_file = None
        for candidate in config_candidates:
            if candidate and os.path.isfile(candidate):
                try:
                    import json
                    with open(candidate, "r", encoding="utf-8") as f:
                        cfg_data = json.load(f)
                    if isinstance(cfg_data, dict):
                        self.config_file = candidate
                        if "anilab" in cfg_data and isinstance(cfg_data["anilab"], dict):
                            default_anilab_url = cfg_data["anilab"].get("base_url", default_anilab_url)
                            if "headers" in cfg_data["anilab"]:
                                default_anilab_headers.update(cfg_data["anilab"]["headers"])
                        if "kyoto" in cfg_data and isinstance(cfg_data["kyoto"], dict):
                            default_kyoto_url = cfg_data["kyoto"].get("base_url", default_kyoto_url)
                            if "headers" in cfg_data["kyoto"]:
                                default_kyoto_headers.update(cfg_data["kyoto"]["headers"])
                            if "stream_headers" in cfg_data["kyoto"]:
                                default_stream_headers.update(cfg_data["kyoto"]["stream_headers"])
                        if "server" in cfg_data and isinstance(cfg_data["server"], dict):
                            default_host = cfg_data["server"].get("host", default_host)
                            default_port = int(cfg_data["server"].get("port", default_port))
                        break
                except Exception:
                    pass

        # 3. Environment overrides take precedence
        self.host = os.environ.get("HOST", default_host)
        self.port = int(os.environ.get("PORT", str(default_port)))
        self.anilab_base_url = os.environ.get("ANILAB_BASE_URL", default_anilab_url)
        self.anilab_headers = default_anilab_headers
        self.kyoto_base_url = os.environ.get("KYOTO_BASE_URL", default_kyoto_url)
        self.kyoto_headers = default_kyoto_headers
        self.stream_headers = default_stream_headers
        
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
