"""Streaming HLS / M3U8 reverse proxy to bypass CDN CORS restrictions."""
from __future__ import annotations
import re
import urllib.parse
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
import httpx

router = APIRouter(prefix="/proxy", tags=["proxy"])

_client: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(20.0, connect=10.0),
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
    """Stream video chunks (.ts / .xls) with CORS and range request forwarding."""
    client = get_http_client()
    
    headers = {}
    if request and "range" in request.headers:
        headers["Range"] = request.headers["Range"]

    method = request.method if request else "GET"
    try:
        req = client.build_request(method, url, headers=headers)
        r = await client.send(req, stream=True)
    except Exception as e:
        raise HTTPException(502, f"Failed to stream segment: {e}")

    response_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        "Accept-Ranges": "bytes",
    }
    
    for h in ["content-type", "content-length", "content-range"]:
        if h in r.headers:
            response_headers[h] = r.headers[h]
            
    # Default to MPEG-TS if upstream sends application/vnd.ms-excel
    if "content-type" in response_headers and "excel" in response_headers["content-type"].lower():
        response_headers["content-type"] = "video/mp2t"
    elif "content-type" not in response_headers:
        response_headers["content-type"] = "video/mp2t"

    async def body_stream():
        try:
            async for chunk in r.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await r.aclose()

    return StreamingResponse(
        body_stream(),
        status_code=r.status_code,
        headers=response_headers,
        media_type=response_headers.get("content-type", "video/mp2t")
    )
