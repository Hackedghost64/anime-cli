"""LRU + TTL in-memory cache (no Redis) — for Anilab catalog + streams."""
from __future__ import annotations
import time
import threading
from collections import OrderedDict
from typing import Any, Optional

class LRUCache:
    """Thread-safe LRU with per-key TTL."""
    def __init__(self, max_size: int = 200, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self.misses += 1
                return None
            expires, value = entry
            if expires < now:
                del self._store[key]
                self.misses += 1
                return None
            # move to end (most recent)
            self._store.move_to_end(key)
            self.hits += 1
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        expires = time.time() + (ttl if ttl is not None else self.default_ttl)
        with self._lock:
            if key in self._store:
                del self._store[key]
            elif len(self._store) >= self.max_size:
                self._store.popitem(last=False)
            self._store[key] = (expires, value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        with self._lock:
            return {"size": len(self._store), "hits": self.hits, "misses": self.misses, "max": self.max_size}

# Global buckets used by routes/client
_anime_catalog = LRUCache(max_size=300, default_ttl=3600)  # 1 hr
_anime_stream = LRUCache(max_size=150, default_ttl=900)    # 15 min
_anime_episodes = LRUCache(max_size=200, default_ttl=900)

def catalog_cache() -> LRUCache:
    return _anime_catalog

def stream_cache() -> LRUCache:
    return _anime_stream

def episode_cache() -> LRUCache:
    return _anime_episodes
