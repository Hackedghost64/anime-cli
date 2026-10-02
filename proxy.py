"""Streaming HLS / M3U8 reverse proxy to bypass CDN CORS restrictions."""
from __future__ import annotations
import ipaddress
import re
import urllib.parse
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
import httpx

router = APIRouter(prefix="/proxy", tags=["proxy"])

_client: Optional[httpx.AsyncClient] = None

def is_safe_proxy_url(target_url: str) -> bool:
    """Validate target URL to prevent SSRF against loopback, metadata, and private networks."""
    try:
        parsed = urllib.parse.urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                return False
        except ValueError:
            pass
        return True
    except Exception:
        return False

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            follow_redirects=True,
            limits=httpx.Limits(
                max_connections=1000,
                max_keepalive_connections=200,
                keepalive_expiry=30.0
            ),
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0),
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://play.app/",
            }
        )
    return _client

URI_ATTR_RE = re.compile(r'URI="([^"]+)"')

@router.api_route("/m3u8", methods=["GET", "HEAD", "OPTIONS"])
async def proxy_m3u8(url: str = Query(...), request: Request = None):
    if request and request.method == "OPTIONS":
        return Response(headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        })
    if not is_safe_proxy_url(url):
        raise HTTPException(400, "Invalid or disallowed proxy target URL")
    """Fetch and rewrite m3u8 playlist with CORS headers."""
    client = get_http_client()
    try:
        r = await client.get(url)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch m3u8 playlist: {e}")

    content = r.text
    base_url = str(r.url)

    rewritten_lines = []
    is_master = "#EXT-X-STREAM-INF" in content

    for line in content.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue

        if line_clean.startswith("#"):
            # Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MEDIA
            if 'URI="' in line_clean:
                def replace_attr_uri(match):
                    attr_uri = match.group(1)
                    abs_uri = urllib.parse.urljoin(base_url, attr_uri)
                    proxy_uri = f"/api/proxy/segment?url={urllib.parse.quote(abs_uri)}"
                    return f'URI="{proxy_uri}"'
                line = URI_ATTR_RE.sub(replace_attr_uri, line)
            rewritten_lines.append(line)
        else:
            # This is a URL line
            abs_url = urllib.parse.urljoin(base_url, line_clean)
            if is_master or ".m3u8" in abs_url.lower():
                proxy_url = f"/api/proxy/m3u8?url={urllib.parse.quote(abs_url)}"
            else:
                proxy_url = f"/api/proxy/segment?url={urllib.parse.quote(abs_url)}"
            rewritten_lines.append(proxy_url)

    rewritten_content = "\n".join(rewritten_lines) + "\n"

    return Response(
        content=rewritten_content,
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
    )

@router.api_route("/segment", methods=["GET", "HEAD", "OPTIONS"])
async def proxy_segment(url: str = Query(...), request: Request = None):
    if request and request.method == "OPTIONS":
        return Response(headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        })
    if not is_safe_proxy_url(url):
        raise HTTPException(400, "Invalid or disallowed proxy target URL")
    """Stream video chunks (.ts / .xls) with CORS and range request forwarding."""
    client = get_http_client()
    method = request.method if request else "GET"
    
    headers = {}
    if request and "range" in request.headers:
        headers["Range"] = request.headers["Range"]

    # Handle HEAD probes without streaming body
    if method == "HEAD":
        try:
            r = await client.head(url, headers=headers)
            res_headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
                "Accept-Ranges": "bytes",
                "Content-Type": "video/mp2t",
            }
            if "content-length" in r.headers:
                res_headers["Content-Length"] = r.headers["content-length"]
            if "content-range" in r.headers:
                res_headers["Content-Range"] = r.headers["content-range"]
            await r.aclose()
            return Response(status_code=r.status_code, headers=res_headers, media_type="video/mp2t")
        except Exception as e:
            raise HTTPException(502, f"Failed to probe segment: {e}")

    try:
        req = client.build_request("GET", url, headers=headers)
        r = await client.send(req, stream=True)
    except Exception as e:
        raise HTTPException(502, f"Failed to stream segment: {e}")

    response_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        "Accept-Ranges": "bytes",
        "Content-Type": "video/mp2t",
        "Cache-Control": "public, max-age=86400",
    }
    
    for h in ["content-length", "content-range"]:
        if h in r.headers:
            response_headers[h] = r.headers[h]

    async def body_stream():
        try:
            async for chunk in r.aiter_bytes(chunk_size=131072):
                yield chunk
        except Exception:
            pass
        finally:
            try:
                await r.aclose()
            except Exception:
                pass

    return StreamingResponse(
        body_stream(),
        status_code=r.status_code,
        headers=response_headers,
        media_type="video/mp2t"
    )
