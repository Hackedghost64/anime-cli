"""Kyoto Player async stream resolver — ported from anilab.html (NO Playwright).
CF bypass via curl_cffi impersonate=chrome (play.anidb.app is Cloudflare managed challenge)."""
from __future__ import annotations
import asyncio
import re
from typing import Any, Dict, List, Optional
import httpx
try:
    from config import settings
except ImportError:
    from ..config import settings
from .cache import stream_cache, episode_cache

M3U8_RE = re.compile(r"https?://[^\s\"'<>\\]+?\.m3u8[^\s\"'<>\\]*")

CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

def _curl_get_json_sync(url: str, headers: Optional[Dict[str,str]] = None, params: Optional[Dict[str,Any]] = None) -> Dict[str,Any]:
    """Fast sync fetch via httpx, falling back to curl_cffi (chrome impersonate) if needed."""
    clean_hdrs = dict(headers or {})
    clean_hdrs["User-Agent"] = CHROME_UA

    # 1. Try httpx first (fast pooled connections)
    import httpx as _httpx
    try:
        with _httpx.Client(follow_redirects=True, timeout=5) as c:
            r = c.get(url, headers=clean_hdrs, params=params)
            r.raise_for_status()
            txt = r.text.strip()
            if not txt:
                return {}
            try:
                return r.json()
            except Exception:
                return {"_raw": txt}
    except Exception:
        pass

    # 2. Fallback to curl_cffi with Chrome impersonation
    try:
        from curl_cffi import requests as creq
        if params:
            from urllib.parse import urlencode
            qs = urlencode({k:v for k,v in params.items() if v is not None})
            url = url + ("&" if "?" in url else "?") + qs
        r = creq.get(url, headers=clean_hdrs, impersonate="chrome", timeout=8)
        r.raise_for_status()
        txt = r.text.strip()
        if not txt:
            return {}
        try:
            return r.json()
        except Exception:
            return {"_raw": txt}
    except Exception as e_final:
        raise e_final

def _curl_get_text_sync(url: str, headers: Optional[Dict[str,str]] = None) -> str:
    clean_hdrs = dict(headers or {})
    clean_hdrs["User-Agent"] = CHROME_UA

    import httpx as _httpx
    try:
        with _httpx.Client(follow_redirects=True, timeout=5) as c:
            r = c.get(url, headers=clean_hdrs)
            r.raise_for_status()
            return r.text
    except Exception:
        pass

    try:
        from curl_cffi import requests as creq
        r = creq.get(url, headers=clean_hdrs, impersonate="chrome", timeout=8)
        r.raise_for_status()
        return r.text
    except Exception as e_final:
        raise e_final

class KyotoResolver:
    """Resolves Anilab post_id -> episodes -> servers -> .m3u8 URL via regex scrape."""

    def __init__(self, base_url: Optional[str] = None, headers: Optional[Dict[str,str]] = None, timeout: float = 15.0):
        cfg = settings()
        self.base_url = (base_url or cfg.get("kyoto.base_url", "https://app.kyotoplayer.com/api/v4")).rstrip("/")
        self.headers = headers or cfg.get("kyoto.headers", {}) or {}
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

    async def _get_json(self, url: str, params: Optional[Dict[str,Any]] = None, headers: Optional[Dict[str,str]] = None) -> Dict[str,Any]:
        c = await self._get_client()
        hdrs = headers or self.headers
        try:
            r = await c.get(url, params=params, headers=hdrs)
            r.raise_for_status()
            if not r.text.strip():
                return {}
            try:
                return r.json()
            except Exception:
                return {"_raw": r.text}
        except Exception:
            return await asyncio.to_thread(_curl_get_json_sync, url, hdrs, params)

    async def _get_text(self, url: str, headers: Optional[Dict[str,str]] = None) -> str:
        c = await self._get_client()
        # for embed HTML, don't send kyoto JSON headers — just accept html
        hdrs = {"User-Agent": self.headers.get("User-Agent", "okhttp/4.12.0"), "Accept": "text/html,*/*"}
        if headers:
            hdrs.update(headers)
        r = await c.get(url, headers=hdrs)
        r.raise_for_status()
        return r.text

    async def get_routes(self, post_id: str) -> Dict[str,str]:
        """Fetch routing URLs for a post_id -> {episodes, servers, iframe}."""
        key = f"routes:{post_id}"
        hit = episode_cache().get(key)
        if hit is not None:
            return hit
        url = f"{self.base_url}/post"
        data = await self._get_json(url, params={"id": str(post_id)})
        ep_url = data.get("episodes") if isinstance(data.get("episodes"), str) else None
        sv_url = data.get("servers") if isinstance(data.get("servers"), str) else None
        if_url = None
        srv = data.get("server")
        extra_headers = {}
        if isinstance(srv, str):
            if_url = srv
        elif isinstance(srv, dict):
            if_url = srv.get("url") if isinstance(srv.get("url"), str) else None
            # capture required headers for episode/servers fetch (Referer, X-Requested-With)
            for hdr in srv.get("headers") or []:
                if isinstance(hdr, (list, tuple)) and len(hdr)==2:
                    extra_headers[str(hdr[0])] = str(hdr[1])
        if not ep_url or not sv_url or not if_url:
            raise ValueError(f"No stream routes available for post_id {post_id}: got {list(data.keys())}")
        routes = {"episodes": ep_url, "servers": sv_url, "iframe": if_url, "extra_headers": extra_headers}
        episode_cache().set(key, routes, ttl=900)
        return routes

    async def get_episodes(self, post_id: str) -> List[Dict[str,Any]]:
        key = f"episodes:{post_id}"
        hit = episode_cache().get(key)
        if hit is not None:
            return hit
        routes = await self.get_routes(post_id)
        url = routes["episodes"].replace("%id%", str(post_id)).replace("{id}", str(post_id))
        # use curl_cffi (chrome) to bypass Cloudflare on play.anidb.app
        hdrs = {**self.headers, **(routes.get("extra_headers") or {}), "Referer":"https://play.app/", "X-Requested-With":"PLAY"}
        # ensure browser-like UA for CF if okhttp UA fails
        hdrs.setdefault("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        data = await asyncio.to_thread(_curl_get_json_sync, url, hdrs, None)
        lst = data.get("list") if isinstance(data, dict) else []
        # if empty, retry with minimal browser UA
        if not lst:
            hdrs2 = {"Referer":"https://play.app/", "X-Requested-With":"PLAY", "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            data2 = await asyncio.to_thread(_curl_get_json_sync, url, hdrs2, None)
            lst = data2.get("list") if isinstance(data2, dict) else []
            if lst: data = data2
        episodes = [{"id": str(e.get("id")), "num": e.get("number") if e.get("number") is not None else "", "name": e.get("name") or ""} for e in (lst or [])]
        episode_cache().set(key, episodes, ttl=900)
        return episodes

    async def get_servers(self, post_id: str, ep_id: str) -> List[Dict[str,Any]]:
        key = f"servers:{post_id}:{ep_id}"
        hit = episode_cache().get(key)
        if hit is not None:
            return hit
        routes = await self.get_routes(post_id)
        url = routes["servers"].replace("%id%", str(ep_id))
        hdrs = {**self.headers, **(routes.get("extra_headers") or {}), "Referer":"https://play.app/", "X-Requested-With":"PLAY"}
        hdrs.setdefault("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        data = await asyncio.to_thread(_curl_get_json_sync, url, hdrs, None)
        lst = data.get("list") if isinstance(data, dict) else []
        if not lst:
            hdrs2 = {"Referer":"https://play.app/", "X-Requested-With":"PLAY", "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            data2 = await asyncio.to_thread(_curl_get_json_sync, url, hdrs2, None)
            lst = data2.get("list") if isinstance(data2, dict) else []
            if lst: data = data2
        servers = [{"id": str(s.get("id")), "lang": "dub" if s.get("lang") == "dub" else "sub", "name": s.get("name") or f"Server {s.get('id')}"} for s in (lst or [])]
        episode_cache().set(key, servers, ttl=900)
        return servers

    async def resolve_stream(self, post_id: str, server_id: str) -> Dict[str,Any]:
        """Resolve server_id -> {url, embed, alternates} by regexing .m3u8 from embed HTML."""
        key = f"stream:{post_id}:{server_id}"
        hit = stream_cache().get(key)
        if hit is not None:
            return hit
        routes = await self.get_routes(post_id)
        iframe_url = routes["iframe"].replace("%id%", str(server_id))
        # Step 1: GET iframe url -> {link} (via curl_cffi for CF)
        hdrs = {**self.headers, **(routes.get("extra_headers") or {}), "Referer":"https://play.app/", "X-Requested-With":"PLAY"}
        data = await asyncio.to_thread(_curl_get_json_sync, iframe_url, hdrs, None)
        link = data.get("link")
        if not link or not isinstance(link, str):
            # retry with browser UA only
            hdrs2 = {"Referer":"https://play.app/", "X-Requested-With":"PLAY", "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            data = await asyncio.to_thread(_curl_get_json_sync, iframe_url, hdrs2, None)
            link = data.get("link")
            if not link or not isinstance(link, str):
                raise ValueError(f"Embedder returned no link for server {server_id}: {data}")
        # If link is already a direct m3u8 URL, return it immediately
        if ".m3u8" in link.lower():
            out = {"url": link, "embed": link, "alternates": [link]}
            stream_cache().set(key, out, ttl=900)
            return out

        # Step 2: GET link -> raw HTML (curl_cffi)
        html = await asyncio.to_thread(_curl_get_text_sync, link, {"Referer":"https://play.app/", "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        urls = list(dict.fromkeys(M3U8_RE.findall(html)))  # dedup preserve order
        if not urls:
            raise ValueError(f"No .m3u8 found on embed page {link}")
        best = next((u for u in urls if "master.m3u8" in u.lower()), urls[0])
        out = {"url": best, "embed": link, "alternates": urls}
        stream_cache().set(key, out, ttl=900)
        return out
