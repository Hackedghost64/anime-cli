"""Anilab2 async client — ported from hacking/anilab_cli.py, now typed & cached."""
from __future__ import annotations
import asyncio
from typing import Any, Dict, List, Optional
import httpx
try:
    from config import settings
except ImportError:
    from ..config import settings
from .cache import catalog_cache

class AnilabClient:
    """Async client for Anilab2 catalog API. All headers from config.yaml."""

    def __init__(self, base_url: Optional[str] = None, headers: Optional[Dict[str,str]] = None, timeout: float = 15.0):
        cfg = settings()
        self.base_url = (base_url or cfg.get("anilab.base_url", "https://anilab2.amdapi.click/api")).rstrip("/")
        self.headers = headers or cfg.get("anilab.headers", {}) or {}
        # Ensure headers are str -> str
        self.headers = {str(k): str(v) for k, v in self.headers.items() if v is not None}
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _get(self, endpoint: str, params: Optional[Dict[str,Any]] = None) -> Dict[str,Any]:
        c = await self._get_client()
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        r = await c.get(url, params=params)
        r.raise_for_status()
        if not r.text.strip():
            return {}
        return r.json()

    async def _post(self, endpoint: str, data: Dict[str,Any], params: Optional[Dict[str,Any]] = None) -> Dict[str,Any]:
        c = await self._get_client()
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        r = await c.post(url, json=data, params=params)
        r.raise_for_status()
        if not r.text.strip():
            return {}
        return r.json()

    # ---- public API (cached where sensible) ----
    async def search(self, query: str, page: int = 1) -> List[Dict[str,Any]]:
        key = f"search:{query}:{page}"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("search", params={"query": query, "page": page})
        posts = data.get("posts", []) if isinstance(data, dict) else []
        
        # Hydrate titles and metadata in parallel for top search results
        if posts:
            ids_to_fetch = [p["id"] for p in posts[:8] if isinstance(p, dict) and "id" in p]
            detailed_list = await asyncio.gather(*[self.post(i) for i in ids_to_fetch], return_exceptions=True)
            hydrated_posts = []
            for idx, p in enumerate(posts):
                if idx < len(detailed_list) and isinstance(detailed_list[idx], dict) and detailed_list[idx].get("title"):
                    hydrated_posts.append(detailed_list[idx])
                else:
                    hydrated_posts.append(p)
            posts = hydrated_posts

        catalog_cache().set(key, posts, ttl=3600)
        return posts

    async def home(self) -> Dict[str,Any]:
        key = "home"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("home")
        catalog_cache().set(key, data, ttl=3600)
        return data

    async def latest(self, page: int = 1) -> List[Dict[str,Any]]:
        key = f"latest:{page}"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("latest", params={"page": page})
        posts = data.get("posts", []) if isinstance(data, dict) else []
        catalog_cache().set(key, posts, ttl=3600)
        return posts

    async def post(self, post_id: str) -> Dict[str,Any]:
        key = f"post:{post_id}"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("post", params={"id": str(post_id)})
        catalog_cache().set(key, data, ttl=3600)
        return data

    async def categories(self) -> List[Dict[str,Any]]:
        key = "categories"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("categories")
        cats = data.get("categories", []) if isinstance(data, dict) else []
        catalog_cache().set(key, cats, ttl=3600)
        return cats

    async def category(self, cat_id: str, page: int = 1) -> List[Dict[str,Any]]:
        key = f"category:{cat_id}:{page}"
        hit = catalog_cache().get(key)
        if hit is not None:
            return hit
        data = await self._get("category", params={"id": str(cat_id), "page": page})
        posts = data.get("posts", []) if isinstance(data, dict) else []
        catalog_cache().set(key, posts, ttl=3600)
        return posts

    async def config(self) -> Dict[str,Any]:
        return await self._get("config")

    async def list_ids(self, ids: List[int], page: int = 1) -> List[Dict[str,Any]]:
        data = await self._post("list", data={"ids": ids}, params={"page": page})
        return data.get("posts", []) if isinstance(data, dict) else []
