"""Kyoto Player async stream resolver — direct signed API integration with api.kyotoplayer.com.
Cryptographic HMAC-SHA256 request signing replaces legacy play.anidb.app scraping."""
from __future__ import annotations
import asyncio
import base64
import hashlib
import hmac
import os
import re
import time
import urllib.parse
from typing import Any, Dict, List, Optional
import httpx
try:
    from config import settings
except ImportError:
    from ..config import settings
from .cache import stream_cache, episode_cache

M3U8_RE = re.compile(r"https?://[^\s\"'<>\\]+?\.m3u8[^\s\"'<>\\]*")
CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

# Upstream Kyoto cryptographic signing parameters
KYOTO_CERT_HEX = "482a900b2906766b2e8d3cf19fcf6d06d0b6c9569cb6305c9c43200a8e20979e"
KYOTO_SECRET_HEX = "9589ba06efeb990bafe302235854766f4d5b9cabcb57ad6ad6bb41cd7b6a8408"
KYOTO_APP_VERSION = "132"
KYOTO_OS_VERSION = "36"
KYOTO_APP_ID = "com.kyotoplayer"
KYOTO_DEVICE_MODEL = "Google Pixel 8"

_SIGNING_KEY = hmac.new(
    bytes.fromhex(KYOTO_SECRET_HEX),
    bytes.fromhex(KYOTO_CERT_HEX),
    hashlib.sha256
).digest()

_LANG_MAP = {
    "jpn": ("Japanese", "🇯🇵"), "eng": ("English", "🇺🇸"), "kor": ("Korean", "🇰🇷"),
    "spa": ("Spanish", "🇪🇸"), "por": ("Portuguese", "🇧🇷"), "fra": ("French", "🇫🇷"),
    "deu": ("German", "🇩🇪"), "ita": ("Italian", "🇮🇹"), "ara": ("Arabic", "🇸🇦"),
    "hin": ("Hindi", "🇮🇳"), "zho": ("Chinese", "🇨🇳"), "tha": ("Thai", "🇹🇭"),
    "ind": ("Indonesian", "🇮🇩"), "vie": ("Vietnamese", "🇻🇳"), "fil": ("Filipino", "🇵🇭"),
    "msa": ("Malay", "🇲🇾"), "tur": ("Turkish", "🇹🇷"), "rus": ("Russian", "🇷🇺"),
}


def sign_kyoto_request(
    method: str,
    path: str,
    body_bytes: bytes = b"",
    time_offset: int = 0,
    device_model: str = KYOTO_DEVICE_MODEL
) -> Dict[str, str]:
    """Generates the HMAC-SHA256 authenticated headers required by api.kyotoplayer.com."""
    ts = str(int(time.time()) + time_offset)
    nonce = base64.urlsafe_b64encode(os.urandom(16)).decode("ascii").rstrip("=")
    body_sha256 = hashlib.sha256(body_bytes).hexdigest()

    parts = [method.upper(), path, body_sha256, ts, nonce, KYOTO_APP_VERSION]
    payload = "\n".join(parts)
    sig = hmac.new(_SIGNING_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()

    return {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "os-version": KYOTO_OS_VERSION,
        "app-id": KYOTO_APP_ID,
        "app-version": KYOTO_APP_VERSION,
        "device-model": device_model,
        "X-Kyoto-Ts": ts,
        "X-Kyoto-Nonce": nonce,
        "X-Kyoto-Sig": sig,
        "X-Kyoto-Cert": KYOTO_CERT_HEX,
        "User-Agent": "okhttp/4.12.0",
    }


def _curl_post_form_sync(
    url: str,
    form_data: Dict[str, Any],
    time_offset: int = 0,
    extra_headers: Optional[Dict[str, str]] = None
) -> tuple[Dict[str, Any], int]:
    """Post form data with cryptographic Kyoto signatures using curl_cffi."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path or "/"
    body_bytes = urllib.parse.urlencode({k: str(v) for k, v in form_data.items() if v is not None}).encode("utf-8")
    headers = sign_kyoto_request("POST", path, body_bytes, time_offset=time_offset)
    if extra_headers:
        headers.update(extra_headers)

    from curl_cffi import requests as creq
    from curl_cffi.curl import CurlOpt

    r = creq.post(
        url,
        data=body_bytes,
        headers=headers,
        impersonate="chrome",
        timeout=15,
        curl_options={CurlOpt.IPRESOLVE: 1}
    )

    # Check for clock drift adjustment if 401
    new_offset = time_offset
    if r.status_code == 401:
        date_hdr = r.headers.get("Date") or r.headers.get("date")
        if date_hdr:
            try:
                import email.utils
                server_time = email.utils.parsedate_to_datetime(date_hdr).timestamp()
                new_offset = int(server_time - time.time())
            except Exception:
                pass

    if r.status_code == 200:
        txt = r.text.strip()
        if not txt:
            return {}, new_offset
        try:
            return r.json(), new_offset
        except Exception:
            return {"_raw": txt}, new_offset

    r.raise_for_status()
    return {}, new_offset


def _curl_get_text_sync(url: str, headers: Optional[Dict[str, str]] = None) -> str:
    clean_hdrs = dict(headers or {})
    clean_hdrs.setdefault("User-Agent", CHROME_UA)

    import httpx as _httpx
    try:
        with _httpx.Client(follow_redirects=True, timeout=10) as c:
            r = c.get(url, headers=clean_hdrs)
            r.raise_for_status()
            return r.text
    except Exception:
        pass

    try:
        from curl_cffi import requests as creq
        from curl_cffi.curl import CurlOpt
        r = creq.get(
            url,
            headers=clean_hdrs,
            impersonate="chrome",
            timeout=10,
            curl_options={CurlOpt.IPRESOLVE: 1}
        )
        r.raise_for_status()
        return r.text
    except Exception as e_final:
        raise e_final


class KyotoResolver:
    """Resolves Anilab post_id -> episodes -> servers -> .m3u8 URL via signed api.kyotoplayer.com."""

    def __init__(self, base_url: Optional[str] = None, headers: Optional[Dict[str, str]] = None, timeout: float = 15.0):
        cfg = settings()
        raw_url = base_url or cfg.get("kyoto.base_url", "https://api.kyotoplayer.com")
        # Ensure base URL points to the operational signed API host
        if "app.kyotoplayer.com" in raw_url:
            raw_url = "https://api.kyotoplayer.com"
        self.base_url = raw_url.rstrip("/")
        self.headers = headers or cfg.get("kyoto.headers", {}) or {}
        self.headers = {str(k): str(v) for k, v in self.headers.items() if v is not None}
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._time_offset = 0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _post_form(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Post form to Kyoto signed API with automatic 401 timestamp drift retry."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            res, new_offset = await asyncio.to_thread(_curl_post_form_sync, url, data, self._time_offset)
            self._time_offset = new_offset
            return res
        except Exception as e:
            # If failed, retry once with updated time offset if drift occurred
            if self._time_offset != 0:
                res, _ = await asyncio.to_thread(_curl_post_form_sync, url, data, self._time_offset)
                return res
            raise e

    async def get_routes(self, post_id: str) -> Dict[str, str]:
        """Backward-compatibility stub for legacy callers."""
        return {
            "episodes": f"{self.base_url}/episodes",
            "servers": f"{self.base_url}/servers",
            "iframe": f"{self.base_url}/stream",
            "extra_headers": {}
        }

    def _parse_server_item(self, server: Dict[str, Any]) -> Dict[str, Any]:
        language = str(server.get("lang") or "").strip().lower()
        is_dub = language.startswith("dub") or language in {"en", "eng", "english"}
        sid = str(server.get("id") or "")
        lang_code = sid.split("/")[-1].lower() if "/" in sid else ""
        lang_name, lang_flag = _LANG_MAP.get(lang_code, (lang_code.upper() or ("Dub" if is_dub else "Sub"), ""))
        return {
            "id": sid,
            "lang": "dub" if is_dub else "sub",
            "lang_code": lang_code,
            "language": lang_name,
            "flag": lang_flag,
            "name": server.get("name") or f"Server {sid}"
        }

    async def get_episodes(self, post_id: str) -> List[Dict[str, Any]]:
        """Fetch all episodes for a post_id via POST /episodes."""
        key = f"episodes:{post_id}"
        hit = episode_cache().get(key)
        if hit is not None:
            return hit

        data = await self._post_form("/episodes", {"id": str(post_id)})
        lst = data.get("list") if isinstance(data, dict) else []

        episodes: List[Dict[str, Any]] = []
        for e in (lst or []):
            ep_id = str(e.get("id"))
            num = e.get("number") if e.get("number") is not None else ""
            name = e.get("name") or f"Episode {num}"
            episodes.append({
                "id": ep_id,
                "num": str(num),
                "name": name,
                "filler": bool(e.get("filler", False))
            })

            # Pre-populate server cache if servers list is embedded in episode response
            embedded_servers = e.get("servers")
            if isinstance(embedded_servers, list) and embedded_servers:
                parsed_servers = [self._parse_server_item(s) for s in embedded_servers]
                episode_cache().set(f"servers:{post_id}:{ep_id}", parsed_servers, ttl=900)

        episode_cache().set(key, episodes, ttl=900)
        return episodes

    async def get_servers(self, post_id: str, ep_id: str) -> List[Dict[str, Any]]:
        """Fetch playback servers for an episode via POST /servers."""
        key = f"servers:{post_id}:{ep_id}"
        hit = episode_cache().get(key)
        if hit is not None:
            return hit

        data = await self._post_form("/servers", {"id": str(post_id), "episode": str(ep_id)})
        lst = data.get("list") if isinstance(data, dict) else []
        servers = [self._parse_server_item(s) for s in (lst or [])]

        episode_cache().set(key, servers, ttl=900)
        return servers

    async def resolve_stream(self, post_id: str, server_id: str) -> Dict[str, Any]:
        """Resolve server_id -> direct .m3u8 URL, skip timings & subtitles via POST /stream."""
        key = f"stream:{post_id}:{server_id}"
        hit = stream_cache().get(key)
        if hit is not None:
            return hit

        data = await self._post_form("/stream", {"id": str(post_id), "server": str(server_id)})
        link = data.get("link") if isinstance(data, dict) else None

        if not link or not isinstance(link, str):
            raise ValueError(f"Kyoto stream endpoint returned no link for server {server_id}: {data}")

        # If direct .m3u8 playlist URL
        if ".m3u8" in link.lower():
            out = {
                "url": link,
                "embed": link,
                "alternates": [link],
                "intro": data.get("intro"),
                "outro": data.get("outro"),
                "subtitles": data.get("subtitles") or []
            }
            stream_cache().set(key, out, ttl=900)
            return out

        # Fallback in case link is an intermediate embed player page
        html = await asyncio.to_thread(_curl_get_text_sync, link, {"Referer": "https://play.app/", "User-Agent": CHROME_UA})
        urls = list(dict.fromkeys(M3U8_RE.findall(html)))
        if not urls:
            raise ValueError(f"No .m3u8 found on embed page {link}")
        best = next((u for u in urls if "master.m3u8" in u.lower()), urls[0])
        out = {
            "url": best,
            "embed": link,
            "alternates": urls,
            "intro": data.get("intro"),
            "outro": data.get("outro"),
            "subtitles": data.get("subtitles") or []
        }
        stream_cache().set(key, out, ttl=900)
        return out
