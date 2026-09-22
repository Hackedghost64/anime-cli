"""Configuration module for anime-app."""
from __future__ import annotations
import os
from typing import Any, Dict

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
        
        # Database
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        self.db_path = os.environ.get("DATABASE_PATH", os.path.join(data_dir, "anime.db"))

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
